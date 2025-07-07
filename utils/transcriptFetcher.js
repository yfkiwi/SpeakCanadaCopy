// utils/transcriptFetcher.js
import { extractVideoId } from './youtube';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export async function fetchYouTubeTranscript(videoUrl) {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log('Fetching transcript for video ID:', videoId);

    // Step 1: Get available caption tracks
    const captionsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!captionsResponse.ok) {
      const errorData = await captionsResponse.json();
      throw new Error(`YouTube API error: ${errorData.error?.message || 'Failed to fetch captions'}`);
    }
    
    const captionsData = await captionsResponse.json();
    console.log('Available captions:', captionsData);

    if (!captionsData.items || captionsData.items.length === 0) {
      throw new Error('No captions available for this video');
    }

    // Find the best caption track (prefer manual over auto-generated)
    const captionTrack = findBestCaptionTrack(captionsData.items);
    
    if (!captionTrack) {
      throw new Error('No suitable English captions found');
    }

    console.log('Selected caption track:', captionTrack);

    // Step 2: Try to get caption content (Note: This requires OAuth for private access)
    // For now, we'll return the available caption info and guide user to manual download
    return {
      available: true,
      captionTrack: captionTrack,
      downloadInstructions: {
        message: 'Captions are available! Please download manually from YouTube.',
        steps: [
          '1. Go to YouTube video',
          '2. Click "..." menu below video',
          '3. Select "Show transcript"',
          '4. Copy the transcript text',
          '5. Use the manual import feature'
        ]
      }
    };

  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return {
      available: false,
      error: error.message
    };
  }
}

function findBestCaptionTrack(captionTracks) {
  // Priority: Manual English > Auto-generated English > Any English
  const englishTracks = captionTracks.filter(
    track => track.snippet.language === 'en' || track.snippet.language === 'en-US'
  );

  if (englishTracks.length === 0) return null;

  // Prefer manual captions over auto-generated
  const manualTrack = englishTracks.find(
    track => track.snippet.trackKind !== 'asr'
  );

  return manualTrack || englishTracks[0];
}

// Alternative: Parse YouTube's auto-generated transcript from public sources
export async function getYouTubeAutoTranscript(videoUrl) {
  try {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // This is a simplified approach - in production you might use libraries like:
    // - youtube-transcript-api
    // - youtube-dl
    // - Or third-party services

    console.log('Attempting to get auto-transcript for:', videoId);
    
    // For now, return instructions for manual process
    return {
      success: false,
      message: 'Auto-transcript extraction requires additional setup',
      instructions: 'Please use the manual import method or SRT file upload'
    };

  } catch (error) {
    console.error('Auto-transcript error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Utility function to parse SRT format
export function parseSRTToSegments(srtContent) {
  const segments = [];
  const blocks = srtContent.trim().split('\n\n');
  
  blocks.forEach((block, index) => {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      const sequenceNumber = lines[0];
      const timeLine = lines[1];
      const textLines = lines.slice(2);
      
      if (timeLine.includes('-->')) {
        const [startTime, endTime] = timeLine.split(' --> ');
        
        segments.push({
          text: textLines.join(' ')
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim(),
          start_time: Math.floor(timeToSeconds(startTime)),
          end_time: Math.floor(timeToSeconds(endTime)),
          segment_order: parseInt(sequenceNumber) || index + 1
        });
      }
    }
  });
  
  return segments.filter(segment => segment.text.length > 0);
}

function timeToSeconds(timeString) {
  try {
    // Handle formats: "00:01:30,500" or "00:01:30.500"
    const cleanTime = timeString.replace(',', '.').trim();
    const [time, milliseconds = '0'] = cleanTime.split('.');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const ms = parseInt(milliseconds.padEnd(3, '0').substring(0, 3)) / 1000;
    
    return totalSeconds + ms;
  } catch (error) {
    console.error('Error parsing time:', timeString, error);
    return 0;
  }
}

// Helper function to format time for display
export function secondsToTimeString(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  } else {
    return `00:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }
}