// pages/scenario/[id]/video/index.js - Clean version with top bar completion
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { awardVideoPoints } from '../../../../utils/pointSystem';
import { extractVideoId } from '../../../../utils/youtube';

export default function VideoListPage() {
  const router = useRouter();
  const { id } = router.query; // This is the numeric_id from the URL
  const [scenario, setScenario] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Completion state
  const [videosCompleted, setVideosCompleted] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        // Fetch scenario details using numeric_id
        const { data: scenarioData } = await supabase
          .from('scenarios')
          .select('*')
          .eq('numeric_id', id)
          .single();
        
        if (!scenarioData) {
          console.error('Scenario not found');
          setLoading(false);
          return;
        }
        
        // Fetch videos for this scenario using the UUID
        const { data: videosData } = await supabase
          .from('scenario_videos')
          .select('*')
          .eq('scenario_id', scenarioData.id) // Use the UUID here
          .order('order_number', { ascending: true });

        setScenario(scenarioData);
        setVideos(videosData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleVideoClick = (video) => {
    // Navigate directly to video player page
    router.push(`/scenario/${id}/video/${video.id}`);
  };

  // Handle completing all videos
  const handleCompleteVideos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !scenario) return;

      // Award points for watching videos
      const result = await awardVideoPoints(session.user.id, scenario.id, supabase);

      if (result.success) {
        console.log('📹 Videos completed! Points:', result.points);
        setVideosCompleted(true);
        
        // Show success message
        alert(`Great job! You've earned 2 points for completing the video section. Total points: ${result.points}/10`);
      }
    } catch (error) {
      console.error('Failed to award video points:', error);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading videos...</p>
      </div>
    </div>
  );
  
  if (!scenario) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Scenario not found</p>
        <button 
          onClick={() => router.push('/scenarios')}
          className="text-blue-500 hover:text-blue-600 underline"
        >
          Go back to scenarios
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push(`/scenario/${id}`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Video Learning</h1>
                <p className="text-sm text-gray-500">{scenario.title}</p>
              </div>
            </div>
            
            {/* Complete Button */}
            {!videosCompleted && videos.length > 0 && (
              <button
                onClick={handleCompleteVideos}
                className="bg-red-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 flex items-center space-x-2 shadow-sm"
                title="Mark as complete and earn 2 points"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Complete</span>
              </button>
            )}
            
            {/* Show video count when completed or no videos */}
            {(videosCompleted || videos.length === 0) && (
              <div className="text-sm font-medium text-gray-900">
                {videos.length} videos
              </div>
            )}
          </div>
          
          {/* Completion message */}
          {videosCompleted && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 text-sm">Excellent! You've completed the video learning section.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video List */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {videos.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">No videos available for this scenario yet.</p>
              <p className="text-sm text-gray-400">Videos will appear here once they're added to the system.</p>
            </div>
          </div>
        ) : (
          videos.map((video) => {
            const hasLocalVideo = video.video_url && video.hosted_locally;
            
            return (
              <button
                key={video.id}
                onClick={() => handleVideoClick(video)}
                className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                {/* Video Thumbnail */}
                <div className="relative h-48 bg-gray-200">
                  <img 
                    src={video.thumbnail_url || `https://img.youtube.com/vi/${extractVideoId(video.youtube_url)}/maxresdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to default thumbnail if YouTube thumbnail fails
                      e.target.src = `https://img.youtube.com/vi/${extractVideoId(video.youtube_url)}/hqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Duration Badge (if available) */}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  )}
                </div>
                
                {/* Video Info */}
                <div className="p-4 text-left">
                  <h3 className="font-semibold text-gray-900 mb-2">{video.title}</h3>
                  {video.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                  )}
                  <div className="flex justify-end">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      hasLocalVideo 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {hasLocalVideo ? 'Play video & transcript' : 'View transcript'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}