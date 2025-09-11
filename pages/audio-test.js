import { useState, useRef } from 'react';

export default function AudioTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [sttResult, setSttResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartTimeRef = useRef(0);

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('📊 Data available, chunk size:', event.data.size);
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('⏹️ Recording stopped');
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        console.log('🎵 Final blob size:', blob.size, 'bytes');
        console.log('🎵 Recording duration:', Date.now() - recordingStartTimeRef.current, 'ms');
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      alert('Error accessing microphone: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const testSTT = async () => {
    if (!audioBlob) {
      alert('Please record audio first');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('🚀 Testing STT with blob size:', audioBlob.size);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      console.log('🎤 STT Result:', result);
      setSttResult(result);
      
    } catch (error) {
      console.error('❌ STT Error:', error);
      setSttResult({ error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Audio Recording Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">1. Record Audio</h2>
            <div className="flex space-x-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-4 py-2 rounded font-medium ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
              
              {audioBlob && (
                <div className="text-sm text-gray-600">
                  Size: {audioBlob.size} bytes | 
                  Duration: {audioBlob.size > 0 ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000) : 0}s
                </div>
              )}
            </div>
          </div>

          {audioUrl && (
            <div>
              <h2 className="text-lg font-semibold mb-2">2. Playback</h2>
              <audio controls src={audioUrl} className="w-full">
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-2">3. Test Speech Recognition</h2>
            <button
              onClick={testSTT}
              disabled={!audioBlob || isProcessing}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded font-medium"
            >
              {isProcessing ? 'Processing...' : 'Test STT'}
            </button>
          </div>

          {sttResult && (
            <div>
              <h2 className="text-lg font-semibold mb-2">4. STT Result</h2>
              <div className="bg-gray-100 p-4 rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(sttResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Tips:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Make sure to speak clearly and loudly</li>
              <li>• Record for at least 2-3 seconds</li>
              <li>• Check browser microphone permissions</li>
              <li>• Try in a quiet environment</li>
              <li>• Check console for detailed logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
