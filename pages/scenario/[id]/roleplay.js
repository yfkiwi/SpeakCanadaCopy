// 修复后的 RoleplayPage - 完整手机适配版本
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { awardRoleplayPoints } from '../../../utils/pointSystem';
import * as usageLimits from '../../../utils/usageLimits';
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
  
  // Usage limits state
  const [usageInfo, setUsageInfo] = useState(null);
  const [canUseRoleplay, setCanUseRoleplay] = useState(true);

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

            // Check usage limits
            console.log('🔍 About to call canUseRoleplay...');
            console.log('🔍 usageLimits object:', usageLimits);
            console.log('🔍 canUseRoleplay function:', typeof usageLimits.canUseRoleplay);
            const usageCheck = await usageLimits.canUseRoleplay(session.user.id);
            console.log('🔍 Usage check result:', usageCheck);
            setUsageInfo(usageCheck);
            setCanUseRoleplay(usageCheck.canUse);
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

  // Handle conversation start - check usage limits but don't increment yet
  const handleConversationStart = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check usage limits before allowing conversation to start
      const usageCheck = await usageLimits.canUseRoleplay(session.user.id);
      if (!usageCheck.canUse) {
        console.log('Usage limit exceeded, preventing conversation start');
        setUsageInfo(usageCheck);
        setCanUseRoleplay(false);
        return false; // Prevent conversation from starting
      }
      
      return true; // Allow conversation to start
    } catch (error) {
      console.error('Failed to check usage limits:', error);
      return true; // Allow conversation to start even if usage check fails
    }
  };

  // Handle usage update from ConversationInterface
  const handleUsageUpdate = (updatedUsageInfo) => {
    console.log('📊 Usage updated:', updatedUsageInfo);
    setUsageInfo(updatedUsageInfo);
    setCanUseRoleplay(updatedUsageInfo.canUse);
  };

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
        
        // 完成后立即返回上一级菜单
        router.push(`/scenario/${id}`);
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
          
          {/* Usage info - 移动端优化 */}
          {usageInfo && (
            <div className={`mt-3 border rounded-lg p-3 ${
              usageInfo.canUse 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0 ${
                    usageInfo.canUse ? 'text-blue-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className={`text-xs sm:text-sm font-medium ${
                      usageInfo.canUse ? 'text-blue-800' : 'text-red-800'
                    }`}>
                      {usageInfo.planName} Plan
                    </p>
                    <p className={`text-xs ${
                      usageInfo.canUse ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {usageInfo.remaining === 'Unlimited' 
                        ? 'Unlimited conversations today'
                        : `${usageInfo.remaining} conversations remaining today`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {usageInfo.planType === 'free' && usageInfo.remaining <= 1 && (
                    <button
                      onClick={() => router.push('/pricing')}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                    >
                      Upgrade
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/test-limits')}
                    className="text-xs bg-gray-600 text-white px-3 py-1 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
          )}
          
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
      
      {/* 对话界面或升级提示 - 移动端优化 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!canUseRoleplay ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Daily Limit Reached
                </h3>
                
                <p className="text-gray-600 mb-6">
                  You've used all {usageInfo?.maxUsage} roleplay conversations for today. 
                  Upgrade your plan to continue practicing!
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/pricing')}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Plans & Upgrade
                  </button>
                  
                  <button
                    onClick={() => router.push(`/scenario/${id}`)}
                    className="w-full text-gray-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  >
                    Back to Scenario
                  </button>
                </div>
                
                <div className="mt-6 text-xs text-gray-500">
                  <p>Your limit resets at midnight</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ConversationInterface
            scenarioId={scenario.id}
            scenarioTitle={scenario.title}
            scenarioContext={scenario.context || scenario.description}
            referenceText={scenario.reference_text}
            userId={user?.id}
            showInitialMessage={true}
            onConversationStart={handleConversationStart}
            onConversationComplete={handleConversationComplete}
            onUsageUpdate={handleUsageUpdate}
          />
        )}
      </div>
    </div>
  );
}