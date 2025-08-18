// utils/uploadVideos.js
import { supabase } from '../lib/supabaseClient';

export const uploadVideoToSupabase = async (file, videoId) => {
  try {
    // Upload video file
    const { data, error } = await supabase.storage
      .from('scenario-videos')
      .upload(`videos/${videoId}.mp4`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('scenario-videos')
      .getPublicUrl(`videos/${videoId}.mp4`);

    // Update the scenario_videos table with the new video URL
    const { error: updateError } = await supabase
      .from('scenario_videos')
      .update({ 
        video_url: publicUrl,
        hosted_locally: true 
      })
      .eq('id', videoId);

    if (updateError) throw updateError;

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error uploading video:', error);
    return { success: false, error: error.message };
  }
};

// Batch upload multiple videos
export const batchUploadVideos = async (videos) => {
  const results = [];
  
  for (const { file, videoId } of videos) {
    console.log(`Uploading video ${videoId}...`);
    const result = await uploadVideoToSupabase(file, videoId);
    results.push({ videoId, ...result });
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};