import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import AudioRecorder from '../../../components/AudioRecorder';
import ChatMessage from '../../../components/ChatMessage';

export default function RoleplayPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchScenario = async () => {
      const { data } = await supabase.from('scenarios').select('*').eq('numeric_id', id).single();
      setScenario(data);
      
      // Initialize messages with the greeting from the scenario
      if (data && data.initial_message) {
        setMessages([{ text: data.initial_message, isUser: false }]);
      } else {
        // Default greeting if none exists in the database
        setMessages([{ 
          text: "Hi there! I'm your Canadian conversation partner. What would you like to practice today?", 
          isUser: false 
        }]);
      }
    };
    
    const fetchProgress = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('scenario_id', id)
        .single();
      if (data) setProgress(data.percent);
    };
    
    fetchScenario();
    fetchProgress();
  }, [id]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleIncrement = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Please log in to track your progress");
      return;
    }
    
    const newPercent = Math.min(progress + 10, 100);
    setProgress(newPercent);
    await supabase.from('progress').upsert({
      user_id: session.user.id,
      scenario_id: id,
      percent: newPercent,
    });
  };

  // Handle transcript from AudioRecorder
  const handleTranscriptReceived = async (transcript) => {
    // Add user message to chat
    setMessages(prev => [...prev, { text: transcript, isUser: true }]);
    
    // Set waiting state while we get the bot response
    setWaitingForResponse(true);
    
    try {
      // Send the transcript to your chatbot API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: transcript, 
          scenario: id,
          scenarioTitle: scenario?.title || '',
          scenarioContext: scenario?.context || '',
          history: messages.map(m => ({ 
            role: m.isUser ? 'user' : 'assistant', 
            content: m.text 
          }))
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add bot response to chat
        setMessages(prev => [...prev, { text: data.response, isUser: false }]);
        
        // Automatically increment progress after successful exchanges
        if (messages.length > 2) {  // Only after a few exchanges
          handleIncrement();
        }
        
        // You could also trigger TTS here to speak the response
        // speakResponse(data.response);
      } else {
        console.error('Error from chat API:', data.error);
        setMessages(prev => [...prev, { 
          text: "I'm sorry, I couldn't process that. Could you try again?", 
          isUser: false 
        }]);
      }
    } catch (error) {
      console.error('Error sending message to chat API:', error);
      setMessages(prev => [...prev, { 
        text: "Sorry, there was a problem connecting to the server.", 
        isUser: false 
      }]);
    } finally {
      setWaitingForResponse(false);
    }
  };

  if (!scenario) return <p className="p-4">Loading...</p>;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 border-b">
        <button 
          onClick={() => router.push(`/scenario/${id}`)} 
          className="text-blue-600 mb-2 inline-block"
        >
          ← Back to {scenario.title}
        </button>
        <h1 className="text-2xl font-semibold">Role Play: {scenario.title}</h1>
        <p className="text-gray-600">{scenario.description}</p>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-4 w-full bg-gray-200 rounded">
            <div
              className="h-4 bg-green-500 rounded transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm mt-1">Progress: {progress}%</p>
        </div>
      </header>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            message={message.text} 
            isUser={message.isUser} 
          />
        ))}
        
        {waitingForResponse && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2 rounded-bl-none">
              <span className="flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Audio recorder */}
      <div className="bg-white border-t p-4 flex justify-center">
        <AudioRecorder 
          onTranscriptReceived={handleTranscriptReceived} 
          disabled={waitingForResponse} 
        />
        
        <button 
          onClick={handleIncrement} 
          className="ml-4 bg-blue-500 text-white px-4 py-2 rounded"
          title="Manually increase progress"
        >
          +10% Progress
        </button>
      </div>
    </div>
  );
}