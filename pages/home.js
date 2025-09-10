import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ongoingScenarios, setOngoingScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get user information
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) {
          router.replace('/login');
          return;
        }

        // Fetch all scenarios for this user (not just ongoing)
        const { data: progressData, error } = await supabase
          .from('user_scenarios_progress')
          .select('*, scenario:scenario_id(*)')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching scenarios:', error);
        } else {
          const allScenarios = progressData || [];
          
          // Filter scenarios with progress > 0 and < 10 (incomplete scenarios)
          const incompleteScenarios = allScenarios.filter(scenario => {
            const progress = scenario.progress || 0;
            return progress > 0 && progress < 10;
          });
          
          if (incompleteScenarios.length === 0) {
            // No incomplete scenarios - show empty state
            setOngoingScenarios([]);
          } else if (incompleteScenarios.length === 1) {
            // Only one incomplete scenario - show that one
            setOngoingScenarios(incompleteScenarios);
          } else {
            // Multiple incomplete scenarios - show top 2 by highest score
            const sorted = incompleteScenarios.sort((a, b) => {
              const aPoints = a.progress || 0;
              const bPoints = b.progress || 0;
              const aTitle = (a.scenario?.title || a.scenario?.scenario_name || '').toLowerCase();
              const bTitle = (b.scenario?.title || b.scenario?.scenario_name || '').toLowerCase();
              
              // Sort by points descending, then alphabetically if points are equal
              if (aPoints !== bPoints) {
                return bPoints - aPoints; // Descending order by points
              }
              
              // If points are equal, sort alphabetically
              return aTitle.localeCompare(bTitle);
            });
            
            // Select top 2 scenarios with highest points
            setOngoingScenarios(sorted.slice(0, 2));
          }
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Extract username from email, fallback to 'kennis7q' if not found
  const username = user?.email ? user.email.split('@')[0] : 'kennis7q';

  // Add scenarioImages mapping for consistency with scenarios.js
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

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user?.id,
          feedback_text: feedbackText.trim(),
          user_email: user?.email,
          page_source: 'homepage'
        });

      if (error) throw error;
      
      setFeedbackText('');
      alert('Thank you for your feedback! 🙏');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky-header">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Hi, {username} <span role="img" aria-label="wave">👋</span></h2>
            <p className="text-gray-600">Let's start learning!</p>
          </div>
          <button 
            className="bg-blue-100 p-2 rounded-full hover:bg-blue-200 transition-colors"
            onClick={() => router.push('/me')}
          >
            {/* Profile icon or settings */}
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* 1. Recent learning section - MOVED TO TOP */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg mb-3">Recent learning</h3>
          <button className="text-blue-600 text-sm" onClick={() => router.push('/scenarios')}>
            See all &rarr;
          </button>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-2">
          {loading ? (
            // Loading state
            <>
              <div className="flex-shrink-0 w-52 h-48 rounded-2xl bg-gray-100 animate-pulse"></div>
              <div className="flex-shrink-0 w-52 h-48 rounded-2xl bg-gray-100 animate-pulse"></div>
            </>
          ) : ongoingScenarios.length > 0 ? (
            ongoingScenarios.map((progressRow, idx) => {
              const scenario = progressRow.scenario;
              const progress = progressRow.progress || 0;
              const total = 10;
              
              return (
                <div
                  key={progressRow.id}
                  className="flex-shrink-0 w-44 h-40 rounded-2xl bg-white overflow-hidden shadow border border-gray-200 flex flex-col cursor-pointer"
                  onClick={() => router.push(`/scenario/${scenario.numeric_id || scenario.id}`)}
                >
                  <img 
                    src={scenarioImages[scenario.title || scenario.scenario_name] || '/placeholder.jpg'} 
                    alt={scenario.title || scenario.scenario_name} 
                    className="w-full h-20 object-cover" 
                  />
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-xs text-center mb-2">{scenario.title || scenario.scenario_name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Enhanced Progress bar */}
                      <div className="flex-1">
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                              progress > 0 
                                ? 'bg-orange-400' 
                                : 'bg-gray-300'
                            }`}
                            style={{ 
                              width: `${(progress / total) * 100}%`,
                              minWidth: progress > 0 ? '8px' : '0px',
                              backgroundColor: progress > 0 
                                ? '#fb923c' 
                                : '#d1d5db'
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-xs text-gray-700">{progress}/{total}</span>
                        <span className="text-xs text-gray-500">
                          {Math.round((progress / total) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // No scenarios with progress - engaging empty state
            <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm text-center py-8 px-6">
              <div className="mb-3">
                <span className="text-4xl">🚀</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Ready to start your journey?</h4>
              <p className="text-gray-500 mb-4">No learning records yet, but every expert was once a beginner!</p>
              <button 
                onClick={() => router.push('/scenarios')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Let's get started! 🎯
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Scenarios section */}
      <div className="max-w-md mx-auto px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">Scenarios</h3>
          <button
            className="text-blue-600 text-sm"
            onClick={() => router.push('/scenarios')}
          >
            See all &rarr;
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex gap-3 overflow-x-auto">
            {/* Show only the specified scenarios in the correct order, with links */}
            {[
              { title: 'Campus Directions', id: 1 },
              { title: 'Order Coffee', id: 3 },
              { title: 'Gym', id: 6 },
              { title: 'Library', id: 8 }
            ].map((scenario) => (
              <div
                className="flex-shrink-0 w-24 cursor-pointer"
                key={scenario.title}
                onClick={() => router.push(`/scenario/${scenario.id}`)}
              >
                <img src={scenarioImages[scenario.title]} className="rounded-lg w-32 h-24 object-cover" alt={scenario.title} />
                <div className="text-center text-xs mt-1">{scenario.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>



      {/* 3. Promo banner - MOVED TO BOTTOM */}
      {/* <div className="max-w-md mx-auto px-4 mt-6">
        <div className="relative flex items-center justify-between overflow-visible" style={{ minHeight: 56 }}>
         
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none select-none">
            <svg width="100%" height="56" viewBox="0 0 328 38" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%', height: '56px' }}>
              <g clipPath="url(#clip0_1735_175649)">
                <rect width="320" height="32" x="0" y="3" fill="#FE9519" rx="14" ry="14"/>
                <line x1="274" y1="4" x2="274" y2="34" stroke="white" strokeWidth="2" strokeLinecap="square" strokeDasharray="5 5"/>
              </g>
              <circle cx="324" cy="4" r="4" fill="white"/>
              <circle cx="324" cy="10" r="4" fill="white"/>
              <circle cx="324" cy="16" r="4" fill="white"/>
              <circle cx="324" cy="22" r="4" fill="white"/>
              <circle cx="324" cy="28" r="4" fill="white"/>
              <circle cx="324" cy="34" r="4" fill="white"/>
              <defs>
                <clipPath id="clip0_1735_175649">
                  <rect width="320" height="32" fill="white" x="0" y="3" rx="14" ry="14"/>
                </clipPath>
              </defs>
            </svg>
          </div>
          
          <div className="relative z-10 flex flex-row items-center justify-between w-full h-full px-5 py-3 gap-2">
            <span className="text-white font-semibold text-sm drop-shadow text-left flex-1 pr-2" style={{lineHeight: '1.2'}}>
              Get 50% off SpeakCanada Premium & unlock new scenes!
            </span>
            <button className="bg-white text-orange-500 px-2 py-1 rounded-lg font-semibold shadow text-xs whitespace-nowrap flex-shrink-0">View</button>
          </div>
        </div>
      </div> */}

      {/* 4. Feedback section - NEW */}
      <div className="max-w-md mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center mb-3">
            <span className="text-lg mr-2">💭</span>
            <h3 className="font-semibold text-gray-800">Help us improve</h3>
          </div>
          
          <div className="text-sm text-gray-600 leading-relaxed mb-4">
            <p className="mb-2">
              We're just regular students who built this app to help fellow international students struggling abroad.
            </p>
            <p className="mb-2">
              We sincerely hope to get your feedback. You can also join our Discord community to connect directly with developers.
            </p>
            <p>
              Hope this can help more people 🙏
            </p>
          </div>
          
          <textarea
            placeholder="Please share your thoughts and suggestions..."
            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="4"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={submitFeedback}
              disabled={!feedbackText.trim() || submitting}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors"
            >
              {submitting ? 'Sending...' : 'Send Feedback'}
            </button>
            
            <button
              onClick={() => window.open('https://discord.gg/f5hY2fcB', '_blank')}
              className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
            >
              Discord
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation (reuse your existing nav) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-2">
            <button onClick={() => router.push('/home')} className="flex flex-col items-center py-2 px-3">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs text-orange-500 mt-1 font-medium">Home</span>
            </button>
            <button onClick={() => router.push('/scenarios')} className="flex flex-col items-center py-2 px-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs text-gray-400 mt-1">Scenario</span>
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