// pages/admin/transcript-manager.js - Updated to use AdminLayout
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { fetchYouTubeTranscript, parseSRTToSegments } from '../../utils/transcriptFetcher';
import { extractVideoId } from '../../utils/youtube';
import AdminLayout from '../../components/AdminLayout';

export default function TranscriptManagerPage() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transcriptData, setTranscriptData] = useState('');
  const [importMethod, setImportMethod] = useState('manual');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('scenario_videos')
      .select(`
        *,
        scenarios(title, numeric_id)
      `)
      .order('created_at', { ascending: false });
    setVideos(data || []);
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setYoutubeUrl(video.youtube_url || '');
    fetchExistingTranscript(video.id);
  };

  const fetchExistingTranscript = async (videoId) => {
    const { data } = await supabase
      .from('video_transcripts')
      .select('*')
      .eq('video_id', videoId)
      .order('start_time');
    
    if (data && data.length > 0) {
      // Convert existing transcript to editable format
      const formatted = data.map(segment => 
        `${Math.floor(segment.start_time / 60)}:${(segment.start_time % 60).toString().padStart(2, '0')} - ${segment.text}`
      ).join('\n');
      setTranscriptData(formatted);
    } else {
      setTranscriptData('');
    }
  };

  const handleYouTubeCheck = async () => {
    if (!youtubeUrl) {
      alert('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    setApiStatus(null);

    try {
      const result = await fetchYouTubeTranscript(youtubeUrl);
      setApiStatus(result);
      
      if (result.available) {
        alert('Captions are available! Please follow the manual download steps shown below.');
      } else {
        alert(`No captions available: ${result.error}`);
      }
    } catch (error) {
      console.error('YouTube check error:', error);
      alert('Error checking YouTube captions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSRTUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const segments = parseSRTToSegments(text);
      
      if (segments.length === 0) {
        alert('No valid segments found in SRT file');
        return;
      }

      // Convert to our format for preview
      const formatted = segments.map(segment => 
        `${Math.floor(segment.start_time / 60)}:${(segment.start_time % 60).toString().padStart(2, '0')} - ${segment.text}`
      ).join('\n');
      
      setTranscriptData(formatted);
      setImportMethod('srt');
      alert(`Successfully parsed ${segments.length} segments from SRT file!`);
    } catch (error) {
      console.error('SRT upload error:', error);
      alert('Error reading SRT file: ' + error.message);
    }
  };

  const handleSaveTranscript = async () => {
    if (!selectedVideo || !transcriptData.trim()) {
      alert('Please select a video and enter transcript data');
      return;
    }

    setLoading(true);

    try {
      // Parse the transcript data
      const segments = parseManualTranscript(transcriptData);
      
      if (segments.length === 0) {
        alert('No valid segments found. Please check the format.');
        return;
      }

      // Clear existing transcripts
      await supabase
        .from('video_transcripts')
        .delete()
        .eq('video_id', selectedVideo.id);

      // Insert new segments
      const { error } = await supabase
        .from('video_transcripts')
        .insert(
          segments.map(segment => ({
            ...segment,
            video_id: selectedVideo.id
          }))
        );

      if (error) throw error;

      alert(`Successfully saved ${segments.length} transcript segments!`);
      
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving transcript: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const parseManualTranscript = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const segments = [];
    
    lines.forEach((line, index) => {
      // Format: "1:30 - Text here" or "0:05 - Text here"
      const match = line.match(/^(\d+):(\d+)\s*-\s*(.+)$/);
      
      if (match) {
        const [, minutes, seconds, text] = match;
        const startTime = parseInt(minutes) * 60 + parseInt(seconds);
        
        segments.push({
          text: text.trim(),
          start_time: startTime,
          end_time: startTime + 5, // Default 5-second duration
          segment_order: index + 1
        });
      }
    });
    
    return segments;
  };

  const clearTranscript = async () => {
    if (!selectedVideo) return;
    
    if (confirm('Are you sure you want to delete all transcript segments for this video?')) {
      await supabase
        .from('video_transcripts')
        .delete()
        .eq('video_id', selectedVideo.id);
      
      setTranscriptData('');
      alert('Transcript cleared successfully!');
    }
  };

  return (
    <AdminLayout title="Import and manage video transcripts">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Video Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Select Video</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => handleVideoSelect(video)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedVideo?.id === video.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">{video.title}</div>
                <div className="text-xs text-gray-500">
                  Scenario {video.scenarios?.numeric_id}: {video.scenarios?.title}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Import Methods */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Import Method</h2>
          
          {/* YouTube API Check */}
          <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <h3 className="font-medium text-blue-900 mb-2">🎬 YouTube API Check</h3>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="YouTube URL"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            />
            <button
              onClick={handleYouTubeCheck}
              disabled={loading || !youtubeUrl}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Checking...' : 'Check Available Captions'}
            </button>
            
            {apiStatus && (
              <div className="mt-3 p-3 bg-white rounded border">
                {apiStatus.available ? (
                  <div>
                    <div className="text-green-700 font-medium">✅ Captions Available!</div>
                    <div className="text-sm text-gray-600 mt-2">
                      <strong>Manual Download Steps:</strong>
                      <ol className="list-decimal list-inside mt-1 text-xs">
                        <li>Go to the YouTube video</li>
                        <li>Click "..." menu below video</li>
                        <li>Select "Show transcript"</li>
                        <li>Copy all text</li>
                        <li>Paste into the text area below</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-700">❌ {apiStatus.error}</div>
                )}
              </div>
            )}
          </div>

          {/* SRT File Upload */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">📁 Upload SRT File</h3>
            <input
              type="file"
              accept=".srt"
              onChange={handleSRTUpload}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload subtitle files downloaded from YouTube
            </p>
          </div>

          {/* Manual Input Toggle */}
          <div>
            <h3 className="font-medium mb-2">✏️ Manual Entry</h3>
            <p className="text-xs text-gray-500 mb-2">
              Format: "1:30 - Text content here"
            </p>
            <button
              onClick={() => setImportMethod('manual')}
              className={`px-4 py-2 rounded text-sm ${
                importMethod === 'manual'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Switch to Manual Mode
            </button>
          </div>
        </div>

        {/* Transcript Editor */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {selectedVideo ? `Edit: ${selectedVideo.title}` : 'Select a Video'}
            </h2>
            {selectedVideo && (
              <button
                onClick={clearTranscript}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Clear All
              </button>
            )}
          </div>
          
          <textarea
            value={transcriptData}
            onChange={(e) => setTranscriptData(e.target.value)}
            placeholder={selectedVideo ? `Enter transcript for "${selectedVideo.title}"

Format example:
0:00 - Welcome to this tutorial
0:05 - Customer: Hi, I'd like coffee
0:10 - Barista: What size would you like?
0:15 - Customer: Medium, please` : 'Select a video first'}
            className="w-full h-64 border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            disabled={!selectedVideo}
          />
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              {transcriptData ? `${transcriptData.split('\n').filter(l => l.trim()).length} segments` : '0 segments'}
            </div>
            <button
              onClick={handleSaveTranscript}
              disabled={!selectedVideo || !transcriptData.trim() || loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save Transcript'}
            </button>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      {!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚙️ YouTube API Setup</h3>
          <div className="text-sm text-yellow-700">
            <p className="mb-2">To enable automatic caption checking:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" className="underline">Google Cloud Console</a></li>
              <li>Create/select a project and enable YouTube Data API v3</li>
              <li>Create an API key in Credentials</li>
              <li>Add <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_YOUTUBE_API_KEY=your_key</code> to .env.local</li>
              <li>Restart your development server</li>
            </ol>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}