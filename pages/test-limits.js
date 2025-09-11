import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import * as usageLimits from '../utils/usageLimits';

export default function TestLimitsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) {
          router.replace('/login');
          return;
        }

        // Check usage limits
        const usageCheck = await usageLimits.canUseRoleplay(user.id);
        console.log('🔍 Usage check result:', usageCheck);
        setUsageInfo(usageCheck);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleIncrementUsage = async () => {
    if (!user) return;
    
    const result = await usageLimits.incrementUsage(user.id);
    console.log('📈 Increment result:', result);
    
    if (result.success) {
      // Refresh usage info
      const updatedUsageCheck = await usageLimits.canUseRoleplay(user.id);
      setUsageInfo(updatedUsageCheck);
      alert('Usage incremented successfully! This simulates starting a conversation.');
    } else {
      alert(`Failed to increment usage: ${result.error}`);
    }
  };

  const handleResetUsage = async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Delete today's usage record
    const { error } = await supabase
      .from('daily_usage_limits')
      .delete()
      .eq('user_id', user.id)
      .eq('usage_date', today);
    
    if (error) {
      console.error('Error resetting usage:', error);
      alert(`Failed to reset usage: ${error.message}`);
    } else {
      // Refresh usage info
      const updatedUsageCheck = await usageLimits.canUseRoleplay(user.id);
      setUsageInfo(updatedUsageCheck);
      alert('Usage reset successfully!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Usage Limits Test Page</h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">User Info</h2>
              <p><strong>User ID:</strong> {user?.id}</p>
              <p><strong>Email:</strong> {user?.email}</p>
            </div>

            {usageInfo && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Usage Info</h2>
                <div className="bg-gray-50 p-4 rounded">
                  <p><strong>Plan Type:</strong> {usageInfo.planType}</p>
                  <p><strong>Plan Name:</strong> {usageInfo.planName}</p>
                  <p><strong>Can Use Roleplay:</strong> {usageInfo.canUse ? 'Yes' : 'No'}</p>
                  <p><strong>Current Usage:</strong> {usageInfo.currentUsage}</p>
                  <p><strong>Max Usage:</strong> {usageInfo.maxUsage}</p>
                  <p><strong>Remaining:</strong> {usageInfo.remaining}</p>
                  {usageInfo.error && (
                    <p className="text-red-600"><strong>Error:</strong> {usageInfo.error}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleIncrementUsage}
                disabled={!usageInfo?.canUse}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Simulate Roleplay Completion
              </button>
              
              <button
                onClick={handleResetUsage}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Reset Today's Usage
              </button>
              
              <button
                onClick={() => router.push('/home')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Back to Home
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
                <li>Click "Simulate Roleplay Completion" to test usage increment</li>
                <li><strong>NEW:</strong> Usage is now counted when user starts recording (not when finishing)</li>
                <li>Free users have 2 conversations per day limit</li>
                <li>Use "Reset Today's Usage" to test the limit again</li>
                <li>Check the browser console for detailed logs</li>
                <li>Try going to a roleplay page and starting to record - it should block after 2 attempts</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
