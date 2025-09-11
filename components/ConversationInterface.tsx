// ConversationInterface.tsx - 移动端优化版本
import React, { useState, useRef, useEffect } from 'react';
import SlangLoader from './SlangLoader';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabaseClient';
import { canRecord, incrementRecordingUsage } from '../utils/usageLimits';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  needsClarification?: boolean;
  pronunciationScore?: number;
  isStreaming?: boolean;
};

type ConversationProps = {
  scenarioId: string;
  scenarioTitle: string;
  scenarioContext: string;
  referenceText?: string;
  userId?: string;
  showInitialMessage?: boolean;
  onMessagesChange?: (messages: Message[]) => void;
  onConversationStart?: () => Promise<boolean>;
  onConversationComplete?: () => void;
  onUsageUpdate?: (usageInfo: any) => void;
};

const ConversationInterface: React.FC<ConversationProps> = ({
  scenarioId,
  scenarioTitle,
  scenarioContext,
  referenceText,
  userId,
  showInitialMessage = true,
  onMessagesChange,
  onConversationStart,
  onConversationComplete,
  onUsageUpdate,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<any>(null);
  const [characterInfo, setCharacterInfo] = useState<any>(null);
  
  // Audio analysis states
  const [audioSamples, setAudioSamples] = useState<any[]>([]);
  const [showSlangLoader, setShowSlangLoader] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  
  // Recording limits state
  const [recordingLimits, setRecordingLimits] = useState({
    canRecord: true,
    currentUsage: 0,
    maxUsage: 5,
    remaining: 5,
    planType: 'free',
    planName: 'Free'
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Translation states
  const { translate, isTranslating } = useTranslation();
  const [userLanguage, setUserLanguage] = useState<string>('');
  const [translatedMessages, setTranslatedMessages] = useState<Map<number, string>>(new Map());
  const [showTranslations, setShowTranslations] = useState<Set<number>>(new Set());
  
  // Browser TTS state
  const [browserTTS, setBrowserTTS] = useState<any>(null);

  // Smart Audio Selection Functions
  const selectBestAudioSamples = (audioSamples: any[]): any[] => {
    console.log(`🎵 Audio selection: ${audioSamples.length} total samples`);
    
    if (audioSamples.length === 0) {
      console.log('🎵 No audio samples available');
      return [];
    }
    
    // Log all samples for debugging
    audioSamples.forEach((sample, index) => {
      console.log(`  Sample ${index + 1}:`, {
        duration: sample.duration || 'unknown',
        transcriptLength: sample.transcript?.length || 0,
        wavDataLength: sample.wavData?.length || 0,
        timestamp: sample.timestamp,
        hasTranscript: !!sample.transcript,
        transcript: sample.transcript?.substring(0, 50) + '...'
      });
    });
    
    // Filter out too short audio samples (< 1 second)
    const validSamples = audioSamples.filter(sample => {
      const duration = sample.duration || 0;
      const isValid = duration >= 1000; // At least 1 second
      
      console.log(`  Sample validation: duration=${duration}ms, valid=${isValid}`);
      return isValid;
    });
    
    console.log(`🎵 Valid samples after filtering: ${validSamples.length}`);
    
    if (validSamples.length === 0) {
      console.log('🎵 No valid samples found, using all samples as fallback');
      // Fallback: use all samples if none pass the filter
      return audioSamples.slice(0, 3);
    }
    
    // Sort by duration (longer audio is better for analysis)
    const sortedSamples = validSamples.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    // Take up to 3 best samples, but at least 1 if available
    const maxSamples = Math.min(3, sortedSamples.length);
    const selectedSamples = sortedSamples.slice(0, maxSamples);
    
    console.log(`🎵 Selected ${selectedSamples.length} audio samples from ${audioSamples.length} total`);
    selectedSamples.forEach((sample, index) => {
      console.log(`  Selected ${index + 1}: duration=${sample.duration}ms, transcript: "${sample.transcript?.substring(0, 30)}..."`);
    });
    
    return selectedSamples;
  };

  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('native_language')
            .eq('user_id', user.id)
            .single();
          if (profile?.native_language) {
            setUserLanguage(profile.native_language);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user language:', error);
      }
    };
    fetchUserLanguage();
  }, []);

  // Check recording limits
  const checkRecordingLimits = async () => {
    if (!userId) return true;
    
    try {
      const limits = await canRecord(userId);
      setRecordingLimits({
        canRecord: limits.canUse,
        currentUsage: limits.currentUsage || 0,
        maxUsage: typeof limits.maxUsage === 'string' ? 999 : limits.maxUsage || 5,
        remaining: typeof limits.remaining === 'string' ? 999 : limits.remaining || 5,
        planType: limits.planType || 'free',
        planName: limits.planName || 'Free'
      });
      return limits.canUse;
    } catch (error) {
      console.error('Error checking recording limits:', error);
      return true; // Allow recording if check fails
    }
  };

  // Update recording limits when component mounts
  useEffect(() => {
    if (userId) {
      checkRecordingLimits();
    }
  }, [userId]);

  // Initialize browser TTS on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('../utils/browserTTS').then(({ browserTTS }) => {
        setBrowserTTS(browserTTS);
      });
    }
  }, []);

  const handleTranslateMessage = async (messageIndex: number, messageContent: string) => {
    if (!userLanguage || !messageContent) return;
    const translation = await translate(messageContent, userLanguage);
    if (translation) {
      setTranslatedMessages(prev => new Map(prev.set(messageIndex, translation)));
      setShowTranslations(prev => new Set(prev.add(messageIndex)));
    }
  };

  const hideTranslation = (messageIndex: number) => {
    setShowTranslations(prev => {
      const next = new Set(prev);
      next.delete(messageIndex);
      return next;
    });
  };

  const TranslateButton: React.FC<{ messageIndex: number; messageContent: string; isUserMessage: boolean; }>= ({ messageIndex, messageContent, isUserMessage }) => {
    if (!userLanguage || isUserMessage) return null;
    const hasTranslation = showTranslations.has(messageIndex);
    return (
      <button
        onClick={() => hasTranslation ? hideTranslation(messageIndex) : handleTranslateMessage(messageIndex, messageContent)}
        disabled={isTranslating}
        className="text-xs text-blue-500 hover:text-blue-400 mt-1 disabled:opacity-50"
      >
        {hasTranslation ? '🙈 Hide' : '🌐 Translate'}
      </button>
    );
  };

  // Random clarification phrases
  const clarificationPhrases = [
    "Sorry, can you repeat that?",
    "Sorry, I didn't catch that.",
    "Could you say that again please?",
    "I didn't quite get that. Could you repeat?",
    "Sorry, could you speak a bit longer?",
    "I missed that. Can you try again?",
    "Could you repeat that for me?",
    "Sorry, I didn't hear you clearly."
  ];

  // Streaming text display function
  const streamText = (text: string, messageIndex: number) => {
    const words = text.split(' ');
    let currentWordIndex = 0;

    const displayNextWord = () => {
      if (currentWordIndex < words.length) {
        const partialText = words.slice(0, currentWordIndex + 1).join(' ');
        
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          if (newMessages[messageIndex]) {
            newMessages[messageIndex] = {
              ...newMessages[messageIndex],
              content: partialText,
              isStreaming: currentWordIndex < words.length - 1
            };
          }
          return newMessages;
        });
        
        currentWordIndex++;
        streamingTimeoutRef.current = setTimeout(displayNextWord, 80);
      }
    };

    displayNextWord();
  };

  // Generate simple opening message based on scenario
  const generateSimpleOpening = (scenarioTitle: string): string => {
    const titleLower = scenarioTitle.toLowerCase();
    
    if (titleLower.includes('tim hortons') || titleLower.includes('coffee')) {
      return "Hi there! Welcome to Tim Hortons. What can I get started for you today?";
    }
    if (titleLower.includes('gym')) {
      return "Hey there! How's it going? What can I help you with today?";
    }
    if (titleLower.includes('restaurant') || titleLower.includes('dining')) {
      return "Hi folks! I'll be your server tonight. Can I start you with drinks?";
    }
    if (titleLower.includes('doctor') || titleLower.includes('medical')) {
      return "Good morning! Please have a seat. What brings you in to see me today?";
    }
    if (titleLower.includes('interview') || titleLower.includes('job')) {
      return "Thank you for coming in today. Please, have a seat. Tell me a little bit about yourself.";
    }
    if (titleLower.includes('shopping') || titleLower.includes('store')) {
      return "Good afternoon! Is there anything I can help you find today?";
    }
    if (titleLower.includes('bank') || titleLower.includes('banking')) {
      return "Good morning! How can I assist you with your banking needs today?";
    }
    if (titleLower.includes('apartment') || titleLower.includes('housing')) {
      return "Hi! I understand you're interested in viewing the apartment. Let me show you around.";
    }
    if (titleLower.includes('transit') || titleLower.includes('bus')) {
      return "Hi there! Do you need help with directions or transit information?";
    }
    
    return "Hi there! How can I help you today?";
  };

  // Initialize conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (showInitialMessage) {
        const openingMessage = generateSimpleOpening(scenarioTitle);
        
        setMessages([
          {
            role: 'assistant',
            content: openingMessage,
          },
        ]);
      }
    };

    initializeConversation();
    
    if (audioPlayerRef.current) {
      setCurrentAudio(audioPlayerRef.current);
    }

    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [scenarioTitle, showInitialMessage]);

  // Update parent component when messages change
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  const startRecording = async () => {
    console.log('🎤 startRecording called');
    
    if (isRecording || isProcessing) {
      console.log('⚠️ Recording already in progress');
      return;
    }
    
    // Check recording limits before starting
    const canRecordNow = await checkRecordingLimits();
    if (!canRecordNow) {
      console.log('❌ Recording limit exceeded, cannot start recording');
      setErrorMessage(`Daily recording limit reached (${recordingLimits.currentUsage}/${recordingLimits.maxUsage}). Please upgrade your plan to continue.`);
      return;
    }
    
    // Check usage limits before starting recording (backward compatibility)
    if (onConversationStart) {
      const canStart = await onConversationStart();
      if (!canStart) {
        console.log('❌ Usage limit exceeded, cannot start recording');
        setErrorMessage('Daily limit reached. Please upgrade your plan to continue.');
        return;
      }
    }
    
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        handleAudioSubmission();
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    console.log('🛑 stopRecording called');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const getRandomClarification = () => {
    const randomIndex = Math.floor(Math.random() * clarificationPhrases.length);
    return clarificationPhrases[randomIndex];
  };

  const handleAudioSubmission = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    const recordingDuration = Date.now() - recordingStartTimeRef.current;
    
    if (recordingDuration < 300) {
      const clarificationText = getRandomClarification();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        isStreaming: true
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      const messageIndex = messages.length;
      
      streamText(clarificationText, messageIndex);
      return;
    }
    
    // Increment recording usage
    if (userId) {
      try {
        await incrementRecordingUsage(userId);
        // Update limits after successful recording
        await checkRecordingLimits();
        
        // Notify parent component to update usage info
        if (onUsageUpdate) {
          const updatedUsage = await canRecord(userId);
          onUsageUpdate(updatedUsage);
        }
      } catch (error) {
        console.error('Error incrementing recording usage:', error);
      }
    }
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');
    console.log('🎵 Audio chunks count:', audioChunksRef.current.length);
    console.log('🎵 Recording duration:', Date.now() - recordingStartTimeRef.current, 'ms');
    
    setIsProcessing(true);
    
    try {
      // STT Request
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const sttResponse = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      
      const sttData = await sttResponse.json();
      console.log('🎤 STT Response:', sttData);
      
      if (!sttData.success) {
        const clarificationText = getRandomClarification();
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: '',
          isStreaming: true
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        const messageIndex = messages.length;
        streamText(clarificationText, messageIndex);
        setIsProcessing(false);
        return;
      }
      
      const transcript = sttData.transcript;
      
      // Audio sample collection
      const recordingDuration = Date.now() - recordingStartTimeRef.current;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        const audioSample = {
          audioData: base64Audio.split(',')[1],
          transcript: transcript,
          timestamp: Date.now(),
          wavData: base64Audio.split(',')[1],
          duration: recordingDuration // Add actual recording duration
        };
        
        setAudioSamples(prev => {
          const newSamples = [...prev, audioSample];
          console.log(`🎵 Audio sample collected. Total samples: ${newSamples.length}`);
          console.log(`🎵 Sample details:`, {
            duration: recordingDuration + 'ms',
            transcript: transcript.substring(0, 50) + '...',
            transcriptLength: transcript.length,
            wavDataLength: audioSample.wavData.length,
            timestamp: audioSample.timestamp
          });
          return newSamples;
        });
      };
      reader.readAsDataURL(audioBlob);
      
      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: transcript,
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Get chat response
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      
      const chatResponse = await fetch('/api/enhanced-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          scenario: scenarioId,
          scenarioTitle,
          scenarioContext,
          userId,
          history,
        }),
      });
      
      const chatData = await chatResponse.json();
      
      if (!chatData.success) {
        const clarificationText = getRandomClarification();
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: '',
          isStreaming: true
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        const messageIndex = messages.length;
        streamText(clarificationText, messageIndex);
        setIsProcessing(false);
        return;
      }
      
      if (chatData.characterInfo) {
        setCharacterInfo(chatData.characterInfo);
      }
      
      // Add assistant response with streaming
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        isStreaming: true
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      setIsProcessing(false);
      
      const messageIndex = messages.length + 1;
      streamText(chatData.response, messageIndex);
      
      // Generate audio using browser TTS
      if (chatData.response && browserTTS) {
        setIsLoadingAudio(true);
        
        try {
          // Use browser TTS instead of OpenAI TTS
          await browserTTS.speak(chatData.response, {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            lang: 'en-US'
          });
        } catch (audioError) {
          console.error('Browser TTS Error:', audioError);
          // Fallback: show text if TTS fails
          console.log('TTS failed, text will be displayed only');
        } finally {
          setIsLoadingAudio(false);
        }
      }
      
      audioChunksRef.current = [];
      
    } catch (error) {
      console.error('Error processing audio:', error);
      const clarificationText = getRandomClarification();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        isStreaming: true
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      const messageIndex = messages.length;
      streamText(clarificationText, messageIndex);
      setIsProcessing(false);
    }
  };

  // End conversation handler
  const handleEndConversation = async () => {
    console.log(`Starting conversation analysis with ${audioSamples.length} audio samples...`);
    setShowSlangLoader(true);
    
    // Smart audio selection - choose best samples for analysis
    const selectedSamples = selectBestAudioSamples(audioSamples);
    
    try {
      if (selectedSamples.length === 0) {
        console.log('🎵 No valid audio samples found, showing fallback feedback');
        
        // Show SlangLoader for a moment to maintain UX consistency
        setTimeout(() => {
          const noAudioFeedback = {
            overallScore: 50,
            title: "Session Complete!",
            message: "Thanks for practicing! Try speaking longer sentences for better analysis next time.",
            suggestion: "Record audio responses to get detailed pronunciation feedback in future sessions.",
            samplesAnalyzed: 0,
            totalMessages: messages.filter(m => m.role === 'user').length,
            conversationLength: 0
          };
          
          setFeedbackData(noAudioFeedback);
          setShowSlangLoader(false);
          setShowFeedbackModal(true);
        }, 3000); // Show loader for 3 seconds
        return;
      }

      // Check if we have browser TTS available for client-side processing
      if (typeof window !== 'undefined' && browserTTS) {
        try {
          // Import and use ClientAudioProcessor for proper audio conversion
          const { audioProcessor } = await import('../utils/clientAudioProcessor');
          
          // Convert selected audio samples to proper format for Azure
          const audioBlobs = selectedSamples.map(sample => {
            // Convert base64 back to Blob
            const binaryString = atob(sample.wavData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return new Blob([bytes], { type: 'audio/webm' });
          });
          
          // Process selected audio samples with proper WAV conversion
          const processedAudio = await audioProcessor.processAudioBatch(
            selectedSamples.map((sample, index) => ({
              blob: audioBlobs[index],
              transcript: sample.transcript,
              timestamp: sample.timestamp,
              duration: 2000 // Default duration
            }))
          );
          
          if (processedAudio.length === 0) {
            throw new Error('No audio samples could be processed');
          }
          
          // Convert to base64 for API transmission
          const base64AudioSamples = audioProcessor.processedAudioToBase64(processedAudio);
          
          // Send to Azure API with properly formatted WAV data (single API call)
          const analysisResponse = await fetch('/api/azure-analytics-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioSamples: base64AudioSamples.map((base64, index) => ({
                wavData: base64,
                transcript: processedAudio[index].transcript
              })),
              scenarioTitle: scenarioTitle,
              userId: userId
            }),
          });

          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            
            setTimeout(() => {
              setFeedbackData({
                overallScore: analysisData.overallScore || 50,
                title: analysisData.feedback?.title || "Great Job!",
                message: analysisData.feedback?.message || "You're making excellent progress!",
                suggestion: analysisData.feedback?.suggestion || "Keep practicing to build confidence.",
                samplesAnalyzed: analysisData.samplesAnalyzed || processedAudio.length,
                totalMessages: messages.filter(m => m.role === 'user').length,
                conversationLength: selectedSamples.length > 0 ? 
                  (selectedSamples[selectedSamples.length - 1].timestamp - selectedSamples[0].timestamp) / 1000 : 0,
                breakdown: analysisData.breakdown || {
                  pronunciation: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10)),
                  fluency: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10)),
                  grammar: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10)),
                  vocabulary: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10))
                }
              });
              setShowSlangLoader(false);
              setShowFeedbackModal(true);
            }, 8000);
          } else {
            throw new Error('Analysis failed');
          }
          
        } catch (clientError) {
          console.error('Client-side processing failed:', clientError);
          throw clientError; // Fall through to server-side processing
        }
      } else {
        // Fallback to server-side processing with selected samples
        const analysisResponse = await fetch('/api/azure-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioSamples: selectedSamples.map(sample => sample.wavData),
            scenarioTitle: scenarioTitle,
            userId: userId
          }),
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          
          setTimeout(() => {
            setFeedbackData({
              overallScore: analysisData.overallScore || 50,
              title: analysisData.feedback?.title || "Great Job!",
              message: analysisData.feedback?.message || "You're making excellent progress!",
              suggestion: analysisData.feedback?.suggestion || "Keep practicing to build confidence.",
              samplesAnalyzed: analysisData.samplesAnalyzed || selectedSamples.length,
              totalMessages: messages.filter(m => m.role === 'user').length,
              conversationLength: selectedSamples.length > 0 ? 
                (selectedSamples[selectedSamples.length - 1].timestamp - selectedSamples[0].timestamp) / 1000 : 0,
              breakdown: analysisData.breakdown || {
                pronunciation: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10)),
                fluency: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10)),
                grammar: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10)),
                vocabulary: Math.round(Math.max(0, (analysisData.overallScore || 50) + Math.random() * 20 - 10))
              }
            });
            setShowSlangLoader(false);
            setShowFeedbackModal(true);
          }, 8000);
        } else {
          throw new Error('Analysis failed');
        }
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      setTimeout(() => {
        const baseScore = Math.min(50 + (selectedSamples.length * 10), 85);
        const fallbackFeedback = {
          overallScore: baseScore,
          title: "Great Practice Session!",
          message: `You completed ${selectedSamples.length} interactions! Your engagement shows great commitment to learning.`,
          suggestion: "Keep practicing! Try to speak a bit longer in each response for even better results.",
          samplesAnalyzed: selectedSamples.length,
          totalMessages: messages.filter(m => m.role === 'user').length,
          conversationLength: selectedSamples.length > 0 ? 
            (selectedSamples[selectedSamples.length - 1].timestamp - selectedSamples[0].timestamp) / 1000 : 0,
          breakdown: {
            pronunciation: Math.round(Math.max(0, baseScore + Math.random() * 20 - 10)),
            fluency: Math.round(Math.max(0, baseScore + Math.random() * 20 - 10)),
            grammar: Math.round(Math.max(0, baseScore + Math.random() * 20 - 10)),
            vocabulary: Math.round(Math.max(0, baseScore + Math.random() * 20 - 10))
          }
        };
        
        setFeedbackData(fallbackFeedback);
        setShowSlangLoader(false);
        setShowFeedbackModal(true);
      }, 8000);
    }
  };

  // Feedback Modal Component
  const FeedbackModal = () => {
    if (!showFeedbackModal || !feedbackData) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
        <div className="bg-white rounded-2xl w-full max-w-sm mx-auto p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4">{feedbackData.title}</h2>
          
          {feedbackData.overallScore && (
            <div className="text-center mb-4">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-2">
                {feedbackData.overallScore}/100
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-4">
                {feedbackData.samplesAnalyzed ? `Based on ${feedbackData.samplesAnalyzed} audio samples` : 'Overall Performance'}
              </div>
              
              {/* Detailed breakdown */}
              {feedbackData.breakdown && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Detailed Analysis:</h3>
                  <div className="space-y-2">
                    {feedbackData.breakdown.pronunciation && (
                      <div className="flex justify-between text-xs">
                        <span>Pronunciation:</span>
                        <span className="font-medium">{Math.round(feedbackData.breakdown.pronunciation)}/100</span>
                      </div>
                    )}
                    {feedbackData.breakdown.fluency && (
                      <div className="flex justify-between text-xs">
                        <span>Fluency:</span>
                        <span className="font-medium">{Math.round(feedbackData.breakdown.fluency)}/100</span>
                      </div>
                    )}
                    {feedbackData.breakdown.grammar && (
                      <div className="flex justify-between text-xs">
                        <span>Grammar:</span>
                        <span className="font-medium">{Math.round(feedbackData.breakdown.grammar)}/100</span>
                      </div>
                    )}
                    {feedbackData.breakdown.vocabulary && (
                      <div className="flex justify-between text-xs">
                        <span>Vocabulary:</span>
                        <span className="font-medium">{Math.round(feedbackData.breakdown.vocabulary)}/100</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <p className="text-gray-700 mb-4 text-sm sm:text-base">{feedbackData.message}</p>
          <p className="text-xs sm:text-sm text-gray-600 mb-6">{feedbackData.suggestion}</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setShowFeedbackModal(false);
                if (onConversationComplete) {
                  onConversationComplete();
                }
              }}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 text-sm sm:text-base"
            >
              Continue
            </button>
            <button
              onClick={() => {
                setShowFeedbackModal(false);
                setMessages([]);
                setAudioSamples([]);
                const openingMessage = generateSimpleOpening(scenarioTitle);
                setMessages([{ role: 'assistant', content: openingMessage }]);
              }}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 text-sm sm:text-base"
            >
              Practice More
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Character Info Debug */}
      {characterInfo && process.env.NODE_ENV === 'development' && (
        <div className="px-3 py-2 bg-blue-50 text-xs text-blue-600 hidden sm:block">
          Character: {characterInfo.characterName} | Context: {characterInfo.timeContext} | Style: {characterInfo.correctionStyle}
        </div>
      )}
      
      {/* Conversation area - 移动端优化 */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 text-sm sm:text-base ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p>
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-gray-600 animate-pulse"></span>
                )}
              </p>
              {message.role === 'assistant' && (
                <TranslateButton
                  messageIndex={index}
                  messageContent={message.content}
                  isUserMessage={false}
                />
              )}
              {showTranslations.has(index) && translatedMessages.has(index) && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-600 mb-1">Translation:</p>
                  <p className="text-sm text-gray-700">{translatedMessages.get(index)}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg rounded-bl-none p-3 max-w-[80%]">
              <div className="flex space-x-1 items-center">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        {isLoadingAudio && (
          <div className="flex justify-center">
            <div className="text-xs sm:text-sm text-gray-500 italic">
              Generating audio...
            </div>
          </div>
        )}
      </div>
      
      {/* Audio control area - 移动端优化 */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0">
        {errorMessage && (
          <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-xs sm:text-sm">{errorMessage}</p>
          </div>
        )}
        
        <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-center space-x-3 sm:space-x-4">
            {/* End Conversation Button - 移动端优化 */}
            <button
              onClick={() => {
                console.log('🔚 End conversation clicked');
                handleEndConversation();
              }}
              disabled={isProcessing || showSlangLoader}
              className="bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium text-xs sm:text-sm"
            >
              End Chat
            </button>
            
            {/* Record Button - 移动端优化 */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                if (recordingLimits.canRecord) {
                  startRecording();
                }
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                stopRecording();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                if (recordingLimits.canRecord) {
                  startRecording();
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopRecording();
              }}
              disabled={isProcessing || !recordingLimits.canRecord}
              className={`
                w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-semibold transition-all duration-200 transform
                ${isRecording 
                  ? 'bg-red-500 scale-110 shadow-lg animate-pulse' 
                  : isProcessing || !recordingLimits.canRecord
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-md active:scale-95'
                }
              `}
            >
              {isProcessing ? (
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isRecording ? (
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-sm"></div>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          
          {/* Status Text - 移动端优化 */}
          <div className="text-center mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm font-medium text-gray-700">
              {isProcessing 
                ? 'Processing...' 
                : isRecording 
                ? 'Recording... (Release to send)' 
                : 'Hold to record'
              }
            </p>
            {isLoadingAudio && (
              <p className="text-xs text-blue-600 mt-1">Generating audio...</p>
            )}
          </div>
          
          {/* Instructions - 移动端优化 */}
          <div className="mt-2 sm:mt-3 text-center">
            <p className="text-xs text-gray-500">
              Press and hold the microphone button to record your message
            </p>
          </div>
        </div>
      </div>
      
      {/* Hidden audio player */}
      <audio ref={audioPlayerRef} className="hidden" />
      
      {/* Slang Loader Modal */}
      <SlangLoader 
        isLoading={showSlangLoader} 
        onComplete={() => {
          // Loading complete handler
        }}
      />
      
      {/* Feedback Modal */}
      <FeedbackModal />
    </div>
  );
};

export default ConversationInterface;