import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { awardRoleplayPoints } from '../../../utils/pointSystem';
import ConversationInterface from '../../../components/ConversationInterface';

export default function RoleplayPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  
  // Completion state
  const [conversationCompleted, setConversationCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get user information
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user);

        // Get scenario information
        const { data: scenarioData, error: scenarioError } = await supabase
          .from('scenarios')
          .select('*')
          .eq('numeric_id', id)
          .single();
          
        if (scenarioError) {
          console.error('Error fetching scenario:', scenarioError);
          setError('Failed to load scenario');
        } else {
          setScenario(scenarioData);
        }

        // Check if user has already completed roleplay
        if (session?.user) {
          try {
            const { data: progressData, error: progressError } = await supabase
              .from('user_scenarios_progress')
              .select('completed_activities')
              .eq('user_id', session.user.id)
              .eq('scenario_id', scenarioData.id)
              .single();

            if (!progressError && progressData) {
              const completedActivities = progressData.completed_activities || {};
              if (completedActivities['roleplay_complete_conversation']) {
                setConversationCompleted(true);
              }
            }
          } catch (error) {
            console.error('Error checking roleplay completion status:', error);
          }
        }
        
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
        setCheckingCompletion(false);
      }
    };
    
    fetchData();
  }, [id]);

  // Handle conversation completion (called by ConversationInterface)
  const handleConversationComplete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !scenario) return;

      // Award points for completing the conversation
      const result = await awardRoleplayPoints(
        session.user.id,
        scenario.id,
        supabase
      );

      if (result.success) {
        console.log('💬 Roleplay conversation completed! Points:', result.points);
        setConversationCompleted(true);
        
        // Navigate back to scenario page after completion
        setTimeout(() => {
          router.push(`/scenario/${id}`);
        }, 2000);
      } else if (result.isAlreadyCompleted) {
        // Activity already completed
        setConversationCompleted(true);
        alert('You have already completed this roleplay!');
      } else {
        // Show error message
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to award roleplay points:', error);
      alert('Failed to complete roleplay. Please try again.');
    }
  };

  if (loading || checkingCompletion) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/')} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Scenario not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Centered like scenarios page */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <button 
            onClick={() => router.push(`/scenario/${id}`)} 
            className="text-blue-600 mb-2 inline-block hover:text-blue-800"
          >
            ← Back to {scenario.title}
          </button>
          <h1 className="text-2xl font-semibold">Role Play: {scenario.title}</h1>
          <p className="text-gray-600">{scenario.description}</p>
          
          {/* Completion message */}
          {conversationCompleted && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 text-sm">Great job! You've completed this roleplay conversation.</p>
              </div>
            </div>
          )}
          
          {/* Progress bar (temporarily hidden) */}
          {/* 
          <div className="mt-4">
            <div className="h-4 w-full bg-gray-200 rounded">
              <div
                className="h-4 bg-green-500 rounded transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm mt-1">Progress: {progress}% ({progress} good pronunciations)</p>
          </div>
          */}
        </div>
      </div>

      {/* Scenario Image Banner */}
      <div className="w-full">
        <div className="max-w-md mx-auto px-4">
          <img
            src={`/${scenario.title}.jpg`}
            alt={scenario.title}
            className="w-full h-32 object-cover rounded-lg shadow-sm"
            onError={(e) => {
              // Fallback to a default image if the specific scenario image doesn't exist
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
      
      {/* Conversation Interface - Single gray background with initial message at top */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-gray-50">
          {/* Initial Message - Just below header, centered */}
          <div className="max-w-lg mx-auto w-full px-4 pt-2 pb-4">
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 rounded-lg rounded-bl-none p-3 max-w-[80%]">
                <p>
                  {scenario.title?.toLowerCase().includes('doctor') || scenario.title?.toLowerCase().includes('medical') || scenario.title?.toLowerCase().includes('clinic')
                    ? "Good morning! Please have a seat. What brings you in to see me today?"
                    : scenario.title?.toLowerCase().includes('tim hortons') || scenario.title?.toLowerCase().includes('coffee')
                    ? "Hi there! Welcome to Tim Hortons. What can I get started for you today?"
                    : scenario.title?.toLowerCase().includes('professor') || scenario.title?.toLowerCase().includes('office hours') || scenario.title?.toLowerCase().includes('academic')
                    ? "Come in! How can I help you today? Do you have any questions about the course?"
                    : scenario.title?.toLowerCase().includes('interview') || scenario.title?.toLowerCase().includes('job')
                    ? "Thank you for coming in today. Please, have a seat. Tell me a little bit about yourself."
                    : scenario.title?.toLowerCase().includes('shopping') || scenario.title?.toLowerCase().includes('store') || scenario.title?.toLowerCase().includes('mall')
                    ? "Good afternoon! Is there anything I can help you find today?"
                    : scenario.title?.toLowerCase().includes('restaurant') || scenario.title?.toLowerCase().includes('dining')
                    ? "Good evening! Welcome to our restaurant. Do you have a reservation?"
                    : scenario.title?.toLowerCase().includes('bank') || scenario.title?.toLowerCase().includes('banking')
                    ? "Good morning! How can I assist you with your banking needs today?"
                    : scenario.title?.toLowerCase().includes('apartment') || scenario.title?.toLowerCase().includes('housing') || scenario.title?.toLowerCase().includes('rent')
                    ? "Hi! I understand you're interested in viewing the apartment. Let me show you around."
                    : scenario.title?.toLowerCase().includes('transit') || scenario.title?.toLowerCase().includes('bus') || scenario.title?.toLowerCase().includes('train')
                    ? "Hi there! Do you need help with directions or transit information?"
                    : `Hi there! ${scenario.description ? scenario.description.split('.')[0] + '.' : 'How can I help you today?'}`
                  }
                </p>
              </div>
            </div>
            
            {/* Conversation Messages Area - Right after initial message */}
            <div className="mt-4 space-y-4" id="conversation-messages">
              {conversationMessages.map((message, index) => (
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
            </div>
          </div>
        </div>
        <div className="w-full">
          <ConversationInterface
            scenarioId={scenario.id}
            scenarioTitle={scenario.title}
            scenarioContext={scenario.context || scenario.description}
            referenceText={scenario.reference_text}
            userId={user?.id}
            showInitialMessage={false}
            onMessagesChange={setConversationMessages}
            onConversationComplete={handleConversationComplete}
          />
        </div>
      </div>
    </div>
  );
}