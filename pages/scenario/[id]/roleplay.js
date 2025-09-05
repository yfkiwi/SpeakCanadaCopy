// 修复后的 RoleplayPage - 完整手机适配版本
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { awardRoleplayPoints } from '../../../utils/pointSystem';
import ConversationInterface from '../../../components/ConversationInterface';

export default function RoleplayPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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

  // Handle conversation completion
  const handleConversationComplete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !scenario) return;

      const result = await awardRoleplayPoints(
        session.user.id,
        scenario.id,
        supabase
      );

      if (result.success) {
        console.log('💬 Roleplay conversation completed! Points:', result.points);
        setConversationCompleted(true);
        
        setTimeout(() => {
          router.push(`/scenario/${id}`);
        }, 2000);
      } else if (result.isAlreadyCompleted) {
        setConversationCompleted(true);
        alert('You have already completed this roleplay!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to award roleplay points:', error);
      alert('Failed to complete roleplay. Please try again.');
    }
  };

  if (loading || checkingCompletion) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
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
      <div className="flex items-center justify-center min-h-screen px-4">
        <p className="text-lg">Scenario not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - 移动端优化 */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="w-full px-3 py-3 sm:px-4 sm:py-4 max-w-none">
          <button 
            onClick={() => router.push(`/scenario/${id}`)} 
            className="text-blue-600 mb-2 inline-block hover:text-blue-800 text-sm sm:text-base"
          >
            ← Back to {scenario.title}
          </button>
          
          {/* 标题 - 响应式字体 */}
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold leading-tight">
            Role Play: {scenario.title}
          </h1>
          
          {/* 描述 - 移动端可隐藏或缩短 */}
          <p className="text-gray-600 text-sm sm:text-base mt-1 line-clamp-2">
            {scenario.description}
          </p>
          
          {/* Completion message - 移动端优化 */}
          {conversationCompleted && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 text-xs sm:text-sm">
                  Great job! You've completed this roleplay conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Image Banner - 移动端适配 */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="w-full px-3 py-2 sm:px-4">
          <img
            src={`/${scenario.title}.jpg`}
            alt={scenario.title}
            className="w-full h-16 sm:h-20 md:h-24 object-cover rounded-lg shadow-sm"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      </div>
      
      {/* 对话界面 - 移动端优化 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ConversationInterface
          scenarioId={scenario.id}
          scenarioTitle={scenario.title}
          scenarioContext={scenario.context || scenario.description}
          referenceText={scenario.reference_text}
          userId={user?.id}
          showInitialMessage={true}
          onConversationComplete={handleConversationComplete}
        />
      </div>
    </div>
  );
}