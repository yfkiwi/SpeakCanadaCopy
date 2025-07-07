// pages/scenario/[id]/video/[videoId].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { useVideoTimer } from '../../../../hooks/useVideoTimer';
import { extractVideoId, formatTime } from '../../../../utils/youtube';

export default function VideoPlayerPage() {
  const router = useRouter();
  const { id, videoId } = router.query;
  const [video, setVideo] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const { currentTime, jumpToTime, reset } = useVideoTimer(isPlaying);

  useEffect(() => {
    if (!videoId) return;
    
    const fetchVideoData = async () => {
      try {
        const { data: videoData } = await supabase
          .from('scenario_videos')
          .select('*')
          .eq('id', videoId)
          .single();

        const { data: transcriptData } = await supabase
          .from('video_transcripts')
          .select('*')
          .eq('video_id', videoId)
          .order('start_time', { ascending: true });

        setVideo(videoData);
        setTranscript(transcriptData || []);
      } catch (error) {
        console.error('Error fetching video data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);

  // Update current segment based on time
  useEffect(() => {
    if (transcript.length === 0) return;
    
    const segmentIndex = transcript.findIndex((segment, index) => {
      const nextSegment = transcript[index + 1];
      return currentTime >= segment.start_time && 
             (!nextSegment || currentTime < nextSegment.start_time);
    });
    
    if (segmentIndex !== -1 && segmentIndex !== currentSegment) {
      setCurrentSegment(segmentIndex);
    }
  }, [currentTime, transcript, currentSegment]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSegmentClick = (segment, index) => {
    jumpToTime(segment.start_time);
    setCurrentSegment(index);
  };

  const handleWatchOnYouTube = () => {
    if (video?.youtube_url) {
      window.open(video.youtube_url, '_blank');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Loading...</p>
    </div>
  );

  if (!video) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Video not found</p>
    </div>
  );

  const videoYouTubeId = extractVideoId(video.youtube_url);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push(`/scenario/${id}/video`)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">{video.title}</h1>
                <p className="text-sm text-gray-500">Video transcript</p>
              </div>
            </div>
            <button
              onClick={handleWatchOnYouTube}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
            >
              YouTube
            </button>
          </div>
        </div>
      </div>

      {/* Video Player Section */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
          {/* Video Thumbnail with Play Button */}
          <div className="relative h-48 bg-gray-900 flex items-center justify-center">
            {videoYouTubeId && (
              <img 
                src={`https://img.youtube.com/vi/${videoYouTubeId}/maxresdefault.jpg`}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                onError={(e) => {
                  e.target.src = `https://img.youtube.com/vi/${videoYouTubeId}/hqdefault.jpg`;
                }}
              />
            )}
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <button onClick={handlePlayPause}>
                  {isPlaying ? (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-white text-sm">
                {isPlaying ? 'Playing' : 'Paused'} - {formatTime(currentTime)}
              </p>
              <p className="text-gray-300 text-xs mt-1">
                Timer for transcript sync
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <div className="text-sm text-gray-600">
                {formatTime(currentTime)}
              </div>
            </div>
            <button
              onClick={reset}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Transcript Section */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interactive Transcript</h2>
          
          {transcript.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transcript available</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transcript.map((segment, index) => (
                <button
                  key={segment.id}
                  onClick={() => handleSegmentClick(segment, index)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    index === currentSegment
                      ? 'bg-red-100 border-2 border-red-300 shadow-sm'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      index === currentSegment 
                        ? 'bg-red-200 text-red-800' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {formatTime(segment.start_time)}
                    </span>
                    <p className={`flex-1 text-sm ${
                      index === currentSegment 
                        ? 'text-gray-900 font-medium' 
                        : 'text-gray-700'
                    }`}>
                      {segment.text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}