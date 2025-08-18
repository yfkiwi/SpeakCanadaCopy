// pages/admin/upload-videos.js
import { useState, useEffect } from 'react';
import { uploadVideoToSupabase } from '../../utils/uploadVideos';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/AdminLayout';

export default function UploadVideos() {
  const [videos, setVideos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

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

  const handleFileSelect = (e, videoId) => {
    const file = e.target.files[0];
    if (file) {
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, file } : v
      ));
    }
  };

  const uploadVideo = async (video) => {
    if (!video.file) return null;
    
    setUploadProgress(prev => ({ ...prev, [video.id]: 'uploading' }));
    const result = await uploadVideoToSupabase(video.file, video.id);
    setUploadProgress(prev => ({ ...prev, [video.id]: result.success ? 'success' : 'error' }));
    
    return result;
  };

  const uploadAllVideos = async () => {
    setUploading(true);
    const uploadResults = [];
    
    for (const video of videos.filter(v => v.file)) {
      const result = await uploadVideo(video);
      uploadResults.push({ video: video.title, ...result });
    }
    
    setResults(uploadResults);
    setUploading(false);
    fetchVideos(); // Refresh the list
  };

  const getVideoStatusColor = (video) => {
    if (video.video_url && video.hosted_locally) return 'bg-green-50 border-green-200';
    if (video.file) return 'bg-blue-50 border-blue-200';
    return 'bg-white border-gray-200';
  };

  const getVideoStatusText = (video) => {
    if (video.video_url && video.hosted_locally) return '✅ Uploaded to Supabase';
    if (video.file) return '📁 File selected, ready to upload';
    return '⏳ No local video file';
  };

  const videosWithoutLocal = videos.filter(v => !v.video_url || !v.hosted_locally);
  const videosWithLocal = videos.filter(v => v.video_url && v.hosted_locally);

  return (
    <AdminLayout title="Upload and manage video files">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-green-600">{videosWithLocal.length}</div>
          <div className="text-sm text-gray-600">Videos Uploaded</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-orange-600">{videosWithoutLocal.length}</div>
          <div className="text-sm text-gray-600">Pending Upload</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-bold text-blue-600">{videos.filter(v => v.file).length}</div>
          <div className="text-sm text-gray-600">Files Selected</div>
        </div>
      </div>

      {/* Upload Controls */}
      {videos.some(v => v.file) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-blue-900">Ready to Upload</h3>
              <p className="text-sm text-blue-700">
                {videos.filter(v => v.file).length} video(s) selected for upload
              </p>
            </div>
            <button
              onClick={uploadAllVideos}
              disabled={uploading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? '⏳ Uploading...' : '🚀 Upload All Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Videos Needing Upload */}
      {videosWithoutLocal.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Videos Needing Upload</h2>
          <div className="space-y-4">
            {videosWithoutLocal.map(video => (
              <div key={video.id} className={`border rounded-lg p-4 ${getVideoStatusColor(video)}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{video.title}</h3>
                    <p className="text-sm text-gray-600 mb-1">{video.description}</p>
                    <p className="text-xs text-gray-500">
                      Scenario {video.scenarios?.numeric_id}: {video.scenarios?.title}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    {getVideoStatusText(video)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileSelect(e, video.id)}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  
                  {video.file && (
                    <button
                      onClick={() => uploadVideo(video)}
                      disabled={uploading || uploadProgress[video.id] === 'uploading'}
                      className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {uploadProgress[video.id] === 'uploading' ? '⏳' : 
                       uploadProgress[video.id] === 'success' ? '✅' : 
                       uploadProgress[video.id] === 'error' ? '❌' : '📤'} 
                      Upload
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Successfully Uploaded Videos */}
      {videosWithLocal.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Successfully Uploaded Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videosWithLocal.map(video => (
              <div key={video.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{video.title}</h3>
                  <span className="text-green-600 text-lg">✅</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  Scenario {video.scenarios?.numeric_id}: {video.scenarios?.title}
                </p>
                <div className="text-xs text-green-700">
                  Hosted on Supabase Storage
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Upload Results</h2>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className={`p-3 rounded-lg ${result.success ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.video}</span>
                  <span className={result.success ? 'text-green-700' : 'text-red-700'}>
                    {result.success ? '✅ Success' : `❌ ${result.error}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-2">📋 Upload Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Select video files for scenarios that don't have local uploads yet</li>
          <li>Use the "Upload" button for individual videos or "Upload All Selected" for batch upload</li>
          <li>Videos will be stored in Supabase Storage and linked to your scenarios</li>
          <li>Once uploaded, videos will play directly in your app instead of redirecting to YouTube</li>
        </ol>
      </div>
    </AdminLayout>
  );
}