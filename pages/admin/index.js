// pages/admin/index.js
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/AdminLayout';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalVideos: 0,
    videosWithTranscripts: 0,
    videosWithLocalFiles: 0,
    totalScenarios: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total videos
      const { count: totalVideos } = await supabase
        .from('scenario_videos')
        .select('*', { count: 'exact', head: true });

      // Get videos with transcripts
      const { data: transcriptVideos } = await supabase
        .from('video_transcripts')
        .select('video_id')
        .not('video_id', 'is', null);
      
      const uniqueTranscriptVideos = new Set(transcriptVideos?.map(t => t.video_id)).size;

      // Get videos with local files
      const { count: videosWithLocalFiles } = await supabase
        .from('scenario_videos')
        .select('*', { count: 'exact', head: true })
        .eq('hosted_locally', true);

      // Get total scenarios
      const { count: totalScenarios } = await supabase
        .from('scenarios')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalVideos: totalVideos || 0,
        videosWithTranscripts: uniqueTranscriptVideos || 0,
        videosWithLocalFiles: videosWithLocalFiles || 0,
        totalScenarios: totalScenarios || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const quickActions = [
    {
      title: 'Upload Videos',
      description: 'Upload video files to Supabase Storage',
      href: '/admin/upload-videos',
      icon: '📹',
      color: 'blue'
    },
    {
      title: 'Manage Transcripts',
      description: 'Import and edit video transcripts',
      href: '/admin/transcript-manager',
      icon: '📝',
      color: 'green'
    }
  ];

  return (
    <AdminLayout title="Welcome to the admin dashboard">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalScenarios}</div>
              <div className="text-sm text-gray-600">Total Scenarios</div>
            </div>
            <div className="text-3xl">🎭</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalVideos}</div>
              <div className="text-sm text-gray-600">Total Videos</div>
            </div>
            <div className="text-3xl">🎬</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.videosWithLocalFiles}</div>
              <div className="text-sm text-gray-600">Videos Uploaded</div>
            </div>
            <div className="text-3xl">📹</div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all" 
              style={{ width: `${stats.totalVideos ? (stats.videosWithLocalFiles / stats.totalVideos) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.videosWithTranscripts}</div>
              <div className="text-sm text-gray-600">With Transcripts</div>
            </div>
            <div className="text-3xl">📝</div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all" 
              style={{ width: `${stats.totalVideos ? (stats.videosWithTranscripts / stats.totalVideos) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`block p-6 bg-white rounded-lg border hover:shadow-md transition-shadow border-l-4 border-l-${action.color}-500`}
            >
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{action.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upload Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Videos with local files</span>
              <span className="text-sm font-medium">
                {stats.videosWithLocalFiles} / {stats.totalVideos}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all" 
                style={{ width: `${stats.totalVideos ? (stats.videosWithLocalFiles / stats.totalVideos) * 100 : 0}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {stats.totalVideos - stats.videosWithLocalFiles} videos still need to be uploaded
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Transcript Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Videos with transcripts</span>
              <span className="text-sm font-medium">
                {stats.videosWithTranscripts} / {stats.totalVideos}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all" 
                style={{ width: `${stats.totalVideos ? (stats.videosWithTranscripts / stats.totalVideos) * 100 : 0}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              {stats.totalVideos - stats.videosWithTranscripts} videos still need transcripts
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity or Tips */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload videos in MP4 format for best compatibility</li>
          <li>• Use the transcript manager to sync text with video timing</li>
          <li>• Videos under 100MB upload faster and perform better</li>
          <li>• Always test video playback after uploading</li>
        </ul>
      </div>
    </AdminLayout>
  );
}