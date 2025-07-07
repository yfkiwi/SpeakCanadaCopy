// pages/scenario/[id]/video/index.js - UPDATED for UUID scenario references
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { extractVideoId } from '../../../../utils/youtube';

export default function VideoListPage() {
  const router = useRouter();
  const { id } = router.query; // This is the numeric_id from the URL
  const [scenario, setScenario] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

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
    // Open YouTube in new tab
    window.open(video.youtube_url, '_blank');
    
    // Navigate to video player page in current tab
    router.push(`/scenario/${id}/video/${video.id}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );
  
  if (!scenario) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Scenario not found</p>
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
            <div className="text-sm font-medium text-gray-900">9:41</div>
          </div>
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
          videos.map((video) => (
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
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-red-100 px-2 py-1 rounded-full text-red-700">
                    {video.difficulty_level || 'A1-A2'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Click to watch & read transcript
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}