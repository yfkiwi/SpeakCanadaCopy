// components/ConversationInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import SlangLoader from './SlangLoader';
import { supabase } from '../lib/supabaseClient';
import { ClientAudioProcessor, audioProcessor, FeedbackData } from '../utils/clientAudioProcessor';

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
};

type AudioSample = {
  blob: Blob;
  transcript: string;
  timestamp: number;
  messageIndex: number;
  duration: number;
};

// FeedbackData type now imported from clientAudioProcessor

const ConversationInterface: React.FC<ConversationProps> = ({
  scenarioId,
  scenarioTitle,
  scenarioContext,
  referenceText,
  userId,
  showInitialMessage = true,
  onMessagesChange,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);

  // Notify parent component when messages change
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<any>(null);
  
  // New state for slang loading and feedback
  const [showSlangLoader, setShowSlangLoader] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [conversationAudio, setConversationAudio] = useState<AudioSample[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smart Audio Selection Functions
  const selectBestAudioSamples = (audioSamples: AudioSample[]): AudioSample[] => {
    // Filter by quality: minimum 1 second duration
    const goodQuality = audioSamples.filter(sample => sample.duration >= 1000);
    
    if (goodQuality.length === 0) {
      return [];
    }
    
    const totalMessages = goodQuality.length;
    
    // Apply your logic:
    // Short conversation (2-4 messages): Analyze all user messages
    if (totalMessages <= 4) {
      return goodQuality;
    }
    
    // Medium conversation (5-8 messages): Select 3-4 best samples
    if (totalMessages <= 8) {
      return selectDistributedSamples(goodQuality, 4);
    }
    
    // Long conversation (9+ messages): Select 5 samples across timeline
    return selectDistributedSamples(goodQuality, 5);
  };

  const selectDistributedSamples = (samples: AudioSample[], targetCount: number): AudioSample[] => {
    if (samples.length <= targetCount) {
      return samples;
    }
    
    const selected: AudioSample[] = [];
    
    // Always include first good sample (baseline)
    selected.push(samples[0]);
    
    // Always include last sample (most recent ability)
    selected.push(samples[samples.length - 1]);
    
    // Fill remaining slots with evenly distributed samples
    const remaining = targetCount - 2;
    if (remaining > 0) {
      const step = Math.floor((samples.length - 2) / (remaining + 1));
      
      for (let i = 1; i <= remaining; i++) {
        const index = Math.min(step * i, samples.length - 2);
        if (index > 0 && !selected.some(s => s.messageIndex === samples[index].messageIndex)) {
          selected.push(samples[index]);
        }
      }
    }
    
    // Sort by message index to maintain conversation order
    return selected.sort((a, b) => a.messageIndex - b.messageIndex);
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

  // Generate realistic opening based on scenario
  const generateScenarioOpening = (title: string, context: string) => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('tim hortons') || titleLower.includes('coffee')) {
      return "Hi there! Welcome to Tim Hortons. What can I get started for you today?";
    }
    
    if (titleLower.includes('doctor') || titleLower.includes('medical') || titleLower.includes('clinic')) {
      return "Good morning! Please have a seat. What brings you in to see me today?";
    }
    
    if (titleLower.includes('professor') || titleLower.includes('office hours') || titleLower.includes('academic')) {
      return "Come in! How can I help you today? Do you have any questions about the course?";
    }
    
    if (titleLower.includes('interview') || titleLower.includes('job')) {
      return "Thank you for coming in today. Please, have a seat. Tell me a little bit about yourself.";
    }
    
    if (titleLower.includes('shopping') || titleLower.includes('store') || titleLower.includes('mall')) {
      return "Good afternoon! Is there anything I can help you find today?";
    }
    
    if (titleLower.includes('restaurant') || titleLower.includes('dining')) {
      return "Good evening! Welcome to our restaurant. Do you have a reservation?";
    }
    
    if (titleLower.includes('bank') || titleLower.includes('banking')) {
      return "Good morning! How can I assist you with your banking needs today?";
    }
    
    if (titleLower.includes('apartment') || titleLower.includes('housing') || titleLower.includes('rent')) {
      return "Hi! I understand you're interested in viewing the apartment. Let me show you around.";
    }
    
    if (titleLower.includes('transit') || titleLower.includes('bus') || titleLower.includes('train')) {
      return "Hi there! Do you need help with directions or transit information?";
    }
    
    return `Hi there! ${context ? context.split('.')[0] + '.' : 'How can I help you today?'}`;
  };

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

  useEffect(() => {
    if (showInitialMessage) {
      const openingMessage = generateScenarioOpening(scenarioTitle, scenarioContext);
      
      setMessages([
        {
          role: 'assistant',
          content: openingMessage,
        },
      ]);
    }
    
    if (audioPlayerRef.current) {
      setCurrentAudio(audioPlayerRef.current);
    }

    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [scenarioTitle, scenarioContext, showInitialMessage]);

  const toggleRecording = async () => {
    if (isProcessing) return;
    
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        setErrorMessage('');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Use browser-compatible MIME type
        const mimeType = ClientAudioProcessor.getSupportedMimeType();
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
        
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
        setErrorMessage('Could not access microphone. Please check your permissions.');
      }
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
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const sttResponse = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      
      const sttData = await sttResponse.json();
      
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
      
      const userMessage: Message = {
        role: 'user',
        content: transcript,
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Store audio sample for later analysis
      if (sttData.success) {
        const audioSample: AudioSample = {
          blob: audioBlob,
          transcript: sttData.transcript,
          timestamp: Date.now(),
          messageIndex: messages.length,
          duration: recordingDuration
        };
        setConversationAudio(prev => [...prev, audioSample]);
      }
      
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
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        isStreaming: true
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
      setIsProcessing(false);
      
      const messageIndex = messages.length + 1;
      streamText(chatData.response, messageIndex);
      
      if (chatData.response) {
        setIsLoadingAudio(true);
        
        try {
          const ttsResponse = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: chatData.response,
              voice: 'nova'
            }),
          });
          
          if (ttsResponse.ok) {
            const audioBlob = await ttsResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            if (currentAudio) {
              currentAudio.pause();
            }
            
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              setCurrentAudio(null);
              URL.revokeObjectURL(audioUrl);
            };
            
            audio.play();
            setCurrentAudio(audio);
          }
        } catch (audioError) {
          console.error('TTS Error:', audioError);
        } finally {
          setIsLoadingAudio(false);
        }
      }
      
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

  // Enhanced End Conversation Handler with Client-Side Audio Processing
  const handleEndConversation = async () => {
    console.log('🎭 handleEndConversation called!');
    setShowSlangLoader(true);
    
    // Award roleplay points FIRST, before any other processing
    console.log('🎭 Attempting to award roleplay points...', { userId, scenarioId });
    if (userId && scenarioId) {
      try {
        // Direct database update instead of using imported function
        const { data: currentProgress } = await supabase
          .from('user_scenarios_progress')
          .select('progress, status')
          .eq('user_id', userId)
          .eq('scenario_id', scenarioId)
          .single();

        let currentPoints = currentProgress?.progress || 0;
        let newPoints = Math.min(currentPoints + 2, 10); // Award 2 points for roleplay
        let status = currentProgress?.status || 'ongoing';

        if (newPoints >= 10 && status !== 'completed') {
          status = 'completed';
        }

        let error;
        if (currentProgress) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('user_scenarios_progress')
            .update({
              progress: newPoints,
              status: status,
              completed_at: status === 'completed' ? new Date().toISOString() : null
            })
            .eq('user_id', userId)
            .eq('scenario_id', scenarioId);
          error = updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('user_scenarios_progress')
            .insert({
              user_id: userId,
              scenario_id: scenarioId,
              progress: newPoints,
              status: status,
              completed_at: status === 'completed' ? new Date().toISOString() : null
            });
          error = insertError;
        }

        if (error) {
          console.error('Error updating roleplay points:', error);
        } else {
          console.log('🎭 Roleplay points awarded! Points:', newPoints);
          if (status === 'completed') {
            console.log('🎉 Scenario completed via roleplay!');
          }
        }
      } catch (error) {
        console.error('Failed to award roleplay points:', error);
      }
    } else {
      console.log('🎭 Missing userId or scenarioId:', { userId, scenarioId });
    }
    
    try {
      const selectedSamples = selectBestAudioSamples(conversationAudio);
      
      if (selectedSamples.length === 0) {
        const noAudioFeedback = audioProcessor.generateFallbackFeedback(
          messages.filter(m => m.role === 'user').length,
          scenarioTitle
        );
        
        setFeedbackData({
          ...noAudioFeedback,
          message: "Thanks for practicing! Try speaking longer sentences next time for pronunciation analysis.",
          suggestion: "Record audio that's at least 1-2 seconds long for better feedback."
        });
        setShowSlangLoader(false);
        setShowFeedbackModal(true);
        return;
      }
      
      // Check browser support for client-side processing
      const browserSupport = ClientAudioProcessor.getBrowserSupport();
      console.log('🔊 Browser support:', browserSupport);
      
      if (browserSupport.supportsClientProcessing) {
        console.log('🔊 Using client-side audio processing...');
        
        try {
          // Process audio samples on client-side
          const processedAudio = await audioProcessor.processAudioBatch(selectedSamples);
          
          if (processedAudio.length === 0) {
            throw new Error('No audio samples could be processed on client');
          }
          
          // Convert to base64 for API transmission
          const base64AudioSamples = audioProcessor.processedAudioToBase64(processedAudio);
          
          // Send to simplified Azure API (no filesystem operations)
          const azureResponse = await fetch('/api/azure-analytics-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioSamples: base64AudioSamples.map((base64, index) => ({
                wavData: base64,
                transcript: processedAudio[index].transcript
              })),
              scenarioTitle,
              userId
            }),
          });
          
          const azureData = await azureResponse.json();
          
          if (azureData.success) {
            setFeedbackData({
              overallScore: azureData.overallScore,
              title: azureData.feedback?.title || "Great Job!",
              message: azureData.feedback?.message || "You're making excellent progress!",
              suggestion: azureData.feedback?.suggestion || "Keep practicing to build confidence.",
              samplesAnalyzed: azureData.samplesAnalyzed || processedAudio.length,
              totalMessages: messages.filter(m => m.role === 'user').length,
              conversationLength: selectedSamples.length > 0 ? 
                (selectedSamples[selectedSamples.length - 1].timestamp - selectedSamples[0].timestamp) / 1000 : 0
            });
          } else {
            throw new Error('Azure API failed');
          }
          
        } catch (clientError) {
          console.warn('Client-side processing failed, using fallback:', clientError);
          
          // Fallback to basic feedback
          const fallbackFeedback = audioProcessor.generateFallbackFeedback(
            messages.filter(m => m.role === 'user').length,
            scenarioTitle
          );
          setFeedbackData({
            ...fallbackFeedback,
            message: "Thanks for practicing! Pronunciation analysis temporarily unavailable.",
            suggestion: "Your conversation was saved. Try again later for detailed feedback."
          });
        }
        
      } else {
        console.log('🔊 Browser doesn\'t support client processing, using fallback...');
        
        // For iOS/Safari: Send original audio directly to OpenAI-compatible endpoint
        try {
          const formData = new FormData();
          selectedSamples.forEach((sample, index) => {
            formData.append(`audio_${index}`, sample.blob, `audio_${index}.webm`);
            formData.append(`transcript_${index}`, sample.transcript);
          });
          formData.append('scenarioTitle', scenarioTitle);
          formData.append('userId', userId || '');
          
          const response = await fetch('/api/audio-analysis-fallback', {
            method: 'POST',
            body: formData
          });
          
          const result = await response.json();
          
          if (result.success) {
            setFeedbackData(result.feedback);
          } else {
            throw new Error('Fallback API failed');
          }
          
        } catch (fallbackError) {
          console.warn('Fallback processing failed:', fallbackError);
          
          // Ultimate fallback - simple completion message
          const simpleFeedback = audioProcessor.generateFallbackFeedback(
            messages.filter(m => m.role === 'user').length,
            scenarioTitle
          );
          setFeedbackData(simpleFeedback);
        }
      }
      
      setShowSlangLoader(false);
      setShowFeedbackModal(true);
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      const errorFeedback = audioProcessor.generateFallbackFeedback(
        messages.filter(m => m.role === 'user').length,
        scenarioTitle
      );
      setFeedbackData({
        ...errorFeedback,
        message: "Thanks for practicing! Analysis temporarily unavailable.",
        suggestion: "Your conversation was saved. Try again later for pronunciation feedback."
      });
      
      setShowSlangLoader(false);
      setShowFeedbackModal(true);
    }
    
    // Clear session audio data after analysis
    setConversationAudio([]);
  };

  // Enhanced Feedback Modal Component
  const FeedbackModal = () => {
    if (!showFeedbackModal || !feedbackData) return null;
    
    const getScoreColor = (score: number) => {
      if (score >= 70) return "text-green-600";
      if (score >= 40) return "text-yellow-600";
      return "text-red-600";
    };
    
    const getProgressColor = (score: number) => {
      if (score >= 70) return "bg-green-500";
      if (score >= 40) return "bg-yellow-500";
      return "bg-red-500";
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{feedbackData.title}</h2>
            
            {/* Overall Score Display */}
            {feedbackData.overallScore !== null && feedbackData.overallScore !== undefined && (
              <div className="mb-4">
                <div className="flex items-center justify-center mb-2">
                  <span className={`text-4xl font-bold mr-2 ${getScoreColor(feedbackData.overallScore)}`}>
                    {feedbackData.overallScore}
                  </span>
                  <span className="text-lg text-gray-600">/100</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(feedbackData.overallScore)}`}
                    style={{ width: `${feedbackData.overallScore}%` }}
                  ></div>
                </div>
                
                <p className="text-sm text-gray-600 font-medium">
                  Overall Pronunciation Score
                </p>
              </div>
            )}
          </div>
          
          {/* Session Stats */}
          <div className="mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">📊 Session Summary</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Messages Sent:</span>
                  <div className="text-blue-900 font-bold">
                    {feedbackData.totalMessages || 'N/A'}
                  </div>
                </div>
                
                <div>
                  <span className="text-blue-700 font-medium">Samples Analyzed:</span>
                  <div className="text-blue-900 font-bold">
                    {feedbackData.samplesAnalyzed || 0}
                  </div>
                </div>
                
                {feedbackData.conversationLength && (
                  <>
                    <div>
                      <span className="text-blue-700 font-medium">Session Length:</span>
                      <div className="text-blue-900 font-bold">
                        {Math.round(feedbackData.conversationLength)}s
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-blue-700 font-medium">Analysis Method:</span>
                      <div className="text-blue-900 font-bold text-xs">
                        {(feedbackData.totalMessages || 0) <= 4 ? 'All Messages' :
                         (feedbackData.totalMessages || 0) <= 8 ? 'Best 3-4' : 'Best 5'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Feedback Message */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 text-center font-medium mb-2">
                {feedbackData.message}
              </p>
              
              {feedbackData.suggestion && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">💡 Next Steps</h4>
                  <p className="text-sm text-gray-600">
                    {feedbackData.suggestion}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Score Interpretation */}
          {feedbackData.overallScore !== null && feedbackData.overallScore !== undefined && (
            <div className="mb-6">
              <div className="text-xs text-gray-500 text-center bg-gray-100 rounded p-2">
                {feedbackData.overallScore >= 70 && "🎉 Excellent! Ready for real conversations"}
                {feedbackData.overallScore >= 40 && feedbackData.overallScore < 70 && "💪 Good progress! Keep practicing"}
                {feedbackData.overallScore < 40 && "📚 Great start! Focus on clarity and pace"}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Practice More
            </button>
            <button
              onClick={() => {
                setShowFeedbackModal(false);
                // Navigate to vocabulary section
              }}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Study Vocabulary
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Conversation area - Only show when showInitialMessage is true */}
      {showInitialMessage && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
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
              <div className="text-sm text-gray-500 italic">
                🔊 Generating audio...
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Error message - hidden for better UX */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mb-4" style={{display: 'none'}}>
          {errorMessage}
        </div>
      )}
      
      {/* Audio control area - Mobile-optimized */}
      <div className="p-6 border-t border-gray-200 bg-white w-full">
        {/* Recording status and instruction */}
        <div className="text-center mb-4">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            isRecording 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : isProcessing 
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {isRecording && (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Recording... Tap again to stop</span>
              </>
            )}
            {isProcessing && (
              <>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span>Processing your message...</span>
              </>
            )}
            {!isRecording && !isProcessing && (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span>Tap to start speaking</span>
              </>
            )}
          </div>
        </div>
        
        {/* Main control buttons */}
        <div className="flex items-center justify-center space-x-6">
          {/* Primary record button - larger and more prominent */}
          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 transform active:scale-95 shadow-lg ${
              isRecording
                ? 'bg-red-500 text-white shadow-red-200 scale-110'
                : isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-200 hover:shadow-xl'
            }`}
          >
            {isRecording ? (
              // Stop icon when recording
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            ) : isProcessing ? (
              // Loading spinner when processing
              <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              // Microphone icon when ready
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
            
            {/* Pulse animation ring when recording */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></div>
            )}
          </button>
          
          {/* End Conversation button - secondary */}
          <button
            onClick={handleEndConversation}
            disabled={isProcessing || showSlangLoader}
            className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 disabled:opacity-50 transition-colors font-medium shadow-lg active:scale-95 transform"
          >
            End Chat
          </button>
        </div>
        
        {/* Additional helpful text */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {isRecording 
              ? 'Speak clearly and tap the red button when finished'
              : isProcessing 
              ? 'AI is thinking and preparing audio response...'
              : 'Tap the blue microphone to start your conversation'
            }
          </p>
        </div>
      </div>
      
      {/* Hidden audio player for reference */}
      <audio ref={audioPlayerRef} style={{ display: 'none' }} />
      
      {/* Slang Loader Modal */}
      <SlangLoader 
        isLoading={showSlangLoader} 
        onComplete={() => {
          // Loading complete callback
        }}
      />
      
      {/* Feedback Modal */}
      <FeedbackModal />
    </div>
  );
};

export default ConversationInterface;