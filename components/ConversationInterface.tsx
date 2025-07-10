// components/ConversationInterface.tsx
import React, { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  needsClarification?: boolean;
  pronunciationScore?: number;
};

type ConversationProps = {
  scenarioId: string;
  scenarioTitle: string;
  scenarioContext: string;
  referenceText?: string;  // Optional reference text for each scenario
  userId?: string; // Make userId optional and pass it as a prop instead
};

const ConversationInterface: React.FC<ConversationProps> = ({
  scenarioId,
  scenarioTitle,
  scenarioContext,
  referenceText,
  userId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [pronunciationResult, setPronunciationResult] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Generate realistic opening based on scenario
  const generateScenarioOpening = (title: string, context: string) => {
    const titleLower = title.toLowerCase();
    
    // Tim Hortons / Coffee scenarios
    if (titleLower.includes('tim hortons') || titleLower.includes('coffee')) {
      return "Hi there! Welcome to Tim Hortons. What can I get started for you today?";
    }
    
    // Doctor / Medical scenarios
    if (titleLower.includes('doctor') || titleLower.includes('medical') || titleLower.includes('clinic')) {
      return "Good morning! Please have a seat. What brings you in to see me today?";
    }
    
    // Professor / Academic scenarios
    if (titleLower.includes('professor') || titleLower.includes('office hours') || titleLower.includes('academic')) {
      return "Come in! How can I help you today? Do you have any questions about the course?";
    }
    
    // Job Interview scenarios
    if (titleLower.includes('interview') || titleLower.includes('job')) {
      return "Thank you for coming in today. Please, have a seat. Tell me a little bit about yourself.";
    }
    
    // Shopping scenarios
    if (titleLower.includes('shopping') || titleLower.includes('store') || titleLower.includes('mall')) {
      return "Good afternoon! Is there anything I can help you find today?";
    }
    
    // Restaurant scenarios
    if (titleLower.includes('restaurant') || titleLower.includes('dining')) {
      return "Good evening! Welcome to our restaurant. Do you have a reservation?";
    }
    
    // Bank scenarios
    if (titleLower.includes('bank') || titleLower.includes('banking')) {
      return "Good morning! How can I assist you with your banking needs today?";
    }
    
    // Housing / Apartment scenarios
    if (titleLower.includes('apartment') || titleLower.includes('housing') || titleLower.includes('rent')) {
      return "Hi! I understand you're interested in viewing the apartment. Let me show you around.";
    }
    
    // Transit / Transportation scenarios
    if (titleLower.includes('transit') || titleLower.includes('bus') || titleLower.includes('train')) {
      return "Hi there! Do you need help with directions or transit information?";
    }
    
    // Default for any other scenario
    return `Hi there! ${context ? context.split('.')[0] + '.' : 'How can I help you today?'}`;
  };

  // Add initial assistant message when component mounts
  useEffect(() => {
    const openingMessage = generateScenarioOpening(scenarioTitle, scenarioContext);
    
    setMessages([
      {
        role: 'assistant',
        content: openingMessage,
      },
    ]);
    
    // Set up audio player reference
    if (audioPlayerRef.current) {
      setCurrentAudio(audioPlayerRef.current);
    }
  }, [scenarioTitle, scenarioContext]);

  const startRecording = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      audioChunksRef.current = [];
      
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
      setErrorMessage('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const handleAudioSubmission = async () => {
    if (audioChunksRef.current.length === 0) return;
    
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Data = reader.result?.toString();
      const base64Audio = base64Data ? base64Data.split(',')[1] : null;
      
      if (!base64Audio) {
        setErrorMessage('Failed to encode audio');
        return;
      }
      
      setIsProcessing(true);
      
      try {
        // Get conversation history in the format expected by the API
        const history = messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
        
        // Call the enhanced chat API
        const response = await fetch('/api/enhanced-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            scenario: scenarioId,
            scenarioTitle,
            scenarioContext,
            userId: userId, // Pass userId if available
            history,
            referenceText, // Pass reference text for pronunciation assessment
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process audio');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Add user message first
          const userMessage: Message = {
            role: 'user',
            content: 'Transcribing...',
          };
          
          setMessages(prevMessages => [...prevMessages, userMessage]);
          
          // Update with the actual transcript after a short delay
          setTimeout(() => {
            setMessages(prevMessages => {
              const newMessages = [...prevMessages];
              // Find and update the last user message
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].role === 'user') {
                  // Update with actual transcript from API
                  newMessages[i] = {
                    ...newMessages[i],
                    content: data.transcript || userMessage.content,
                  };
                  break;
                }
              }
              return newMessages;
            });
          }, 500);
          
          // Then add assistant's response
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.response,
          };
          
          setMessages(prevMessages => [...prevMessages, assistantMessage]);
          
          // Store pronunciation results in state (but don't display them)
          if (data.pronunciationScore) {
            setPronunciationResult(data.pronunciationScore);
            
            // 可选：在控制台显示发音分数，用于调试
            console.log('Pronunciation Score:', data.pronunciationScore.overallScore);
          }
          
          // Play the audio response
          if (data.audioUrl) {
            if (currentAudio) {
              currentAudio.pause();
            }
            
            const audio = new Audio(data.audioUrl);
            audio.onended = () => {
              setCurrentAudio(null);
            };
            
            audio.play();
            setCurrentAudio(audio);
          }
        } else {
          setErrorMessage(data.error || 'Something went wrong');
        }
      } catch (error) {
        console.error('Error submitting audio:', error);
        setErrorMessage('Failed to process your speech');
      } finally {
        setIsProcessing(false);
      }
    };
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Conversation area */}
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
              <p>{message.content}</p>
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
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mb-4">
          {errorMessage}
        </div>
      )}
      
      {/* Audio control area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-center">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : isProcessing
                ? 'bg-gray-300 text-gray-500'
                : 'bg-blue-500 text-white'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">
          {isRecording ? 'Release to send' : 'Press and hold to speak'}
        </p>
      </div>
      
      {/* Hidden audio player for reference */}
      <audio ref={audioPlayerRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ConversationInterface;