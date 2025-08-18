import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ConfidenceSurvey from '../components/ConfidenceSurvey';

// Map scenario names to image filenames (ensure these images exist in /public)
const scenarioImages = {
  'Campus Directions': '/Campus Directions.jpg',
  'Visit Doctor': '/Visit Doctor.jpg',
  'Order Coffee': '/Order Coffee.jpg',
  'Public Transportation': '/Public Transportation.jpg',
  'Talk to Campus Staff': '/Talk to Campus Staff.jpg',
  'Gym': '/Gym.jpg',
  'Go Shopping': '/Go Shopping.jpg',
  'Library': '/Library.jpg'
};

// Map scenario names to descriptions
const scenarioDescriptions = {
  'Campus Directions': 'Learn to navigate university campus and ask for directions confidently.',
  'Visit Doctor': 'Practice medical conversations and health-related vocabulary.',
  'Order Coffee': 'Master ordering drinks and food at cafes and restaurants.',
  'Public Transportation': 'Navigate buses, trains, and public transit systems effectively.',
  'Talk to Campus Staff': 'Communicate with university staff and administrative personnel.',
  'Gym': 'Learn fitness-related vocabulary and gym etiquette conversations.',
  'Go Shopping': 'Practice shopping conversations and retail interactions.',
  'Library': 'Navigate library services and academic resource conversations.'
};

export default function Scenarios() {
  const router = useRouter();
  const [progressRows, setProgressRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('ongoing');
  
  // Survey state - remove survey logic from scenarios page
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyScenario, setSurveyScenario] = useState(null);
  const [surveyType, setSurveyType] = useState('pre');
  const [pendingNavigation, setPendingNavigation] = useState(null);

  useEffect(() => {
    fetchData();
  }, [router]);

  const fetchData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    // Join user_scenarios_progress with scenarios for this user
    const { data, error } = await supabase
      .from('user_scenarios_progress')
      .select('*, scenario:scenario_id(*)')
      .eq('user_id', session.user.id);
    if (error) {
      setError(error.message);
    } else {
      setProgressRows(data || []);
    }
    setLoading(false);
  };

  // Remove survey functions - no longer needed on scenarios page
  // All survey logic moved to individual scenario pages

  // Handle scenario click - navigate directly to scenario page
  const handleScenarioClick = async (e, row) => {
    e.preventDefault();
    
    const scenario = row.scenario;
    
    // Navigate directly to scenario page - survey logic is handled there
    router.push(`/scenario/${scenario.numeric_id || scenario.id}`);
  };

  // Remove survey completion handlers - no longer needed

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  // Filter scenarios by status and sort them
  const ongoing = progressRows
    .filter(row => row.status === 'ongoing')
    .sort((a, b) => {
      const aPoints = a.progress || 0;
      const bPoints = b.progress || 0;
      const aTitle = (a.scenario?.title || a.scenario?.scenario_name || '').toLowerCase();
      const bTitle = (b.scenario?.title || b.scenario?.scenario_name || '').toLowerCase();
      
      // If all scenarios have 0 points, sort alphabetically
      if (aPoints === 0 && bPoints === 0) {
        return aTitle.localeCompare(bTitle);
      }
      
      // If one has points and the other doesn't, prioritize the one with points
      if (aPoints === 0 && bPoints > 0) return 1;
      if (aPoints > 0 && bPoints === 0) return -1;
      
      // If both have points, sort by points descending, then alphabetically
      if (aPoints !== bPoints) {
        return bPoints - aPoints; // Descending order
      }
      
      // If points are equal, sort alphabetically
      return aTitle.localeCompare(bTitle);
    });
    
  const completed = progressRows
    .filter(row => row.status === 'completed')
    .sort((a, b) => {
      const aPoints = a.progress || 0;
      const bPoints = b.progress || 0;
      const aTitle = (a.scenario?.title || a.scenario?.scenario_name || '').toLowerCase();
      const bTitle = (b.scenario?.title || b.scenario?.scenario_name || '').toLowerCase();
      
      // Sort by points descending, then alphabetically
      if (aPoints !== bPoints) {
        return bPoints - aPoints; // Descending order
      }
      
      return aTitle.localeCompare(bTitle);
    });

  // Helper to render scenario card
  const renderScenarioCard = (row, idx, isCompleted = false) => {
    const s = row.scenario;
    const handleRestudy = async (e) => {
      e.preventDefault(); // Prevent any parent click handlers
      e.stopPropagation(); // Stop event bubbling
      try {
        await supabase
          .from('user_scenarios_progress')
          .update({ 
            status: 'ongoing', 
            completed_at: null,
            progress: 0 // Reset points to 0
          })
          .eq('id', row.id);
        // Refresh data
        await fetchData();
        // No survey trigger here - user just reset the scenario
      } catch (err) {
        alert('Failed to reset scenario.');
      }
    };

    return (
      <div key={row.id} className="relative">
        <div
          onClick={(e) => handleScenarioClick(e, row)}
          className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-7 hover:shadow-md transition-all duration-200 max-w-lg mx-auto cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src={
                  s.image_url ||
                  scenarioImages[(s.title || s.scenario_name)] ||
                  '/placeholder.jpg'
                }
                alt={s.title || s.scenario_name}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 truncate">{s.title || s.scenario_name}</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {scenarioDescriptions[s.title || s.scenario_name] || 'Practice real-world conversations and improve your language skills.'}
              </p>
              <div className="flex items-center mt-2 gap-2">
                <span className="text-xs font-medium text-gray-600">points: {row.progress || 0} / 10</span>
                <div className="flex-1 mx-2">
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                        (row.progress || 0) > 0 
                          ? 'bg-orange-400' 
                          : 'bg-gray-300'
                      }`}
                      style={{ 
                        width: `${((row.progress || 0) / 10) * 100}%`,
                        minWidth: (row.progress || 0) > 0 ? '8px' : '0px',
                        backgroundColor: (row.progress || 0) > 0 
                          ? '#fb923c' 
                          : '#d1d5db'
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  {Math.round(((row.progress || 0) / 10) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Restudy button for completed scenarios */}
        {isCompleted && (
          <button
            onClick={handleRestudy}
            className="absolute top-3 right-3 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors text-sm z-10"
          >
            Try Again
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/home')}
            className="text-gray-600 hover:text-gray-800 p-2 cursor-pointer"
            aria-label="Back to homepage"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 text-center flex-1 -ml-6">Scenarios</h1>
        </div>
        {/* Tabs */}
        <div className="max-w-md mx-auto flex border-b border-gray-200">
          <button
            className={`flex-1 py-2 text-center font-medium ${tab === 'ongoing' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
            onClick={() => setTab('ongoing')}
          >
            Ongoing
          </button>
          <button
            className={`flex-1 py-2 text-center font-medium ${tab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
            onClick={() => setTab('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Scenario Cards */}
      <div className="max-w-lg mx-auto px-2 py-4 space-y-4">
        {tab === 'ongoing' && (ongoing.length > 0 ? ongoing.map((row, idx) => renderScenarioCard(row, idx, false)) : <p>No ongoing scenarios.</p>)}
        {tab === 'completed' && (completed.length > 0
          ? completed.map((row, idx) => renderScenarioCard(row, idx, true))
          : <p className="text-center text-gray-500 text-lg mt-8">🎉 No completed scenarios yet.<br/>Keep going and finish a scenario to see it here! 🚀</p>
        )}
      </div>

      {/* Remove Confidence Survey Modal - survey logic moved to individual scenario pages */}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => router.push('/')} 
              className="flex flex-col items-center py-2 px-3"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs text-gray-400 mt-1">Home</span>
            </button>
            <button className="flex flex-col items-center py-2 px-3">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs text-orange-500 mt-1 font-medium">Scenario</span>
            </button>
            <button 
              onClick={() => router.push('/review')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/review' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/review' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/review' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Review</span>
            </button>
            <button 
              onClick={() => router.push('/me')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/me' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/me' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/me' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Me</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}