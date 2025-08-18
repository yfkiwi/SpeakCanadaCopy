// pages/scenario/[id]/video/[videoId].js - Enhanced version with compact controls
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { extractVideoId, formatTime } from '../../../../utils/youtube';

export default function VideoPlayerPage() {
  const router = useRouter();
  const { id, videoId } = router.query;
  const [video, setVideo] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const videoRef = useRef(null);

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
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => {
          console.error('Error playing video:', error);
          setVideoError(true);
        });
      }
    }
  };

  const handleSegmentClick = (segment, index) => {
    if (videoRef.current) {
      videoRef.current.currentTime = segment.start_time;
      setCurrentTime(segment.start_time);
      setCurrentSegment(index);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoError = (e) => {
    console.error('Video error:', e.target.error);
    setVideoError(true);
  };

  const handleVideoLoad = () => {
    setVideoError(false);
  };

  const handleWatchOnYouTube = () => {
    if (video?.youtube_url) {
      window.open(video.youtube_url, '_blank');
    }
  };

  const resetVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setCurrentSegment(0);
      setIsPlaying(false);
      videoRef.current.pause();
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Helper function for clean time format
  const formatTimeClean = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
  const hasLocalVideo = video.video_url && video.hosted_locally && !videoError;

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
                <p className="text-sm text-gray-500">
                  {hasLocalVideo ? 'Local video with transcript' : 'Video transcript'}
                </p>
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
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-3">
          {hasLocalVideo ? (
            // Local Video Player
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-48 object-cover bg-black"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={handleVideoError}
                onLoadedData={handleVideoLoad}
                controls={false}
                preload="metadata"
                poster={`https://img.youtube.com/vi/${videoYouTubeId}/maxresdefault.jpg`}
              >
                <source src={video.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              {/* Progress Bar Only */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                <div 
                  className="h-full bg-red-600 transition-all duration-100"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : (
            // Fallback to YouTube Thumbnail (when no local video)
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
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </div>
                <p className="text-white text-sm">No local video available</p>
                <p className="text-gray-300 text-xs mt-1">
                  Use transcript sync or watch on YouTube
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {videoError && (
            <div className="p-4 bg-red-50 border border-red-200">
              <p className="text-red-700 text-sm">
                ⚠️ Error loading local video. <button onClick={handleWatchOnYouTube} className="underline">Watch on YouTube</button> instead.
              </p>
            </div>
          )}
        </div>

        {/* Compact Control Bar */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-2 mb-4">
          <div className="flex items-center justify-between">
            {/* Left side - Speed control */}
            <select
              value={playbackSpeed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              disabled={!hasLocalVideo}
              className={`text-xs px-2 py-1 border rounded ${
                hasLocalVideo 
                  ? 'border-gray-300 text-gray-700 hover:border-gray-400' 
                  : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-100'
              }`}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            {/* Center - Main controls */}
            <div className="flex items-center space-x-3">
              {/* Rewind 10s */}
              <button
                onClick={skipBackward}
                disabled={!hasLocalVideo}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  hasLocalVideo 
                    ? 'hover:bg-gray-100 text-gray-700' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                  <text x="12" y="16" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">10</text>
                </svg>
              </button>

              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                disabled={!hasLocalVideo}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  hasLocalVideo 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Forward 10s */}
              <button
                onClick={skipForward}
                disabled={!hasLocalVideo}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  hasLocalVideo 
                    ? 'hover:bg-gray-100 text-gray-700' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                  <text x="12" y="16" fontSize="7" textAnchor="middle" fill="currentColor" fontWeight="bold">10</text>
                </svg>
              </button>
            </div>

            {/* Right side - Reset and Time */}
            <div className="flex items-center space-x-2">
              <button
                onClick={resetVideo}
                disabled={!hasLocalVideo}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  hasLocalVideo
                    ? 'text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50'
                    : 'text-gray-400 border-gray-200 cursor-not-allowed bg-gray-100'
                }`}
              >
                Reset
              </button>
              <div className="text-sm font-mono text-gray-800 min-w-[3rem]">
                {formatTimeClean(currentTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Section - Now closer to video */}
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
                  disabled={!hasLocalVideo}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    !hasLocalVideo
                      ? 'opacity-50 cursor-not-allowed'
                      : index === currentSegment
                      ? 'bg-red-100 border-2 border-red-300 shadow-sm'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      index === currentSegment && hasLocalVideo
                        ? 'bg-red-200 text-red-800' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {formatTime(segment.start_time)}
                    </span>
                    <p className={`flex-1 text-sm ${
                      index === currentSegment && hasLocalVideo
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