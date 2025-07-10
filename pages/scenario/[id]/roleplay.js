import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import ConversationInterface from '../../../components/ConversationInterface';

export default function RoleplayPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scenario, setScenario] = useState(null);
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        // Get progress information (commented out to avoid 400 errors)
        // if (session?.user) {
        //   const { data: progressData } = await supabase
        //     .from('progress')
        //     .select('percent')
        //     .eq('user_id', session.user.id)
        //     .eq('scenario_id', id)
        //     .single();
        //   
        //   if (progressData) {
        //     setProgress(progressData.percent);
        //   }
        // }
        
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  if (loading) {
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 border-b">
        <button 
          onClick={() => router.push(`/scenario/${id}`)} 
          className="text-blue-600 mb-2 inline-block hover:text-blue-800"
        >
          ← Back to {scenario.title}
        </button>
        <h1 className="text-2xl font-semibold">Role Play: {scenario.title}</h1>
        <p className="text-gray-600">{scenario.description}</p>
        
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
      </header>
      
      {/* Use the new ConversationInterface component */}
      <ConversationInterface
        scenarioId={id}
        scenarioTitle={scenario.title}
        scenarioContext={scenario.context || scenario.description}
        referenceText={scenario.reference_text}
        userId={user?.id}
      />
    </div>
  );
}