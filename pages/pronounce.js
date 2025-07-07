// this file is for the frontend of the pronounce page
// where you display a buttom to start/stop the recording, you send the audio to the backend, 
//  you receive and display Azure pronunciation feedback

// feature added: we want to set a score threshold for the pronunciation assessment
// if the score is below the threshold, we want to hide the score display and show a retry message instead
// if the score is above the threshold, we want to display the score display and hide the retry message

// Imports & componenet setup
import { useState, useRef } from 'react';
import Head from 'next/head';

// Component declaration
export default function Pronounce() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState(null);
  const [error, setError] = useState(null);
  const [referenceText, setReferenceText] = useState('This weekend, I visited a local farmer market with some friends. We walked around and tried different snacks.');
  const [mode, setMode] = useState('assessment'); // 'assessment' or 'transcribe'
  const [lowScoreAttempts, setLowScoreAttempts] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const submitForAssessment = async () => {
    if (!audioBlob || (mode === 'assessment' && !referenceText.trim())) {
      setError('Please record audio and provide reference text');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const response = await fetch('/api/azure-pronounce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          text: referenceText.trim(),
          mode: mode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Check if the score is below 60 and increment attempts if so
      if (mode === 'assessment' && result.overallScore < 60) {
        setLowScoreAttempts(prev => prev + 1);
      } else if (mode === 'assessment') {
        setLowScoreAttempts(0); // reset on success
      }
      setPronunciationResult(result);
    } catch (err) {
      console.error('Error submitting for assessment:', err);
      setError('Failed to process pronunciation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setPronunciationResult(null);
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setLowScoreAttempts(0); // reset attempts on reset
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>Pronunciation Practice</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Pronunciation Practice
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2 md:mb-0">Mode</h2>
              <select
                value={mode}
                onChange={e => setMode(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="assessment">Pronunciation Assessment</option>
                <option value="transcribe">Transcription</option>
              </select>
            </div>
            {mode === 'assessment' && (
              <div className="flex-1 md:ml-8">
                <h2 className="text-xl font-semibold mb-2">Try to read below reference text aloud</h2>
                <textarea
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter the text you want to practice pronouncing..."
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Recording</h2>
          
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>

            {audioBlob && (
              <>
                <button
                  onClick={submitForAssessment}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (mode === 'assessment' ? 'Processing...' : 'Transcribing...') : (mode === 'assessment' ? 'Get Pronunciation Score' : 'Transcribe Speech')}
                </button>

                <button
                  onClick={resetRecording}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
              </>
            )}
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span>Recording...</span>
            </div>
          )}

          {audioUrl && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Your Recording:</h3>
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        {pronunciationResult && mode === 'assessment' && (
          (() => {
            const score = pronunciationResult.overallScore;
            if (score < 60 && lowScoreAttempts <= 5) {
              return (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Pronunciation Assessment</h2>
                  <div className="text-center text-red-600 font-bold text-lg mb-4">
                    Can you repeat it and speak more clearly?
                  </div>
                  <div className="text-gray-500 text-center">Attempt {lowScoreAttempts} of 5</div>
                </div>
              );
            } else if (score < 60 && lowScoreAttempts > 5) {
              // Show the assessment but force the score to 60
              return (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Pronunciation Assessment</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">60</div>
                      <div className="text-sm text-gray-600">Overall Score</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Reference Text:</h3>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded">{pronunciationResult.referenceText}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Recognized Text:</h3>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded">{pronunciationResult.recognizedText}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Feedback:</h3>
                      <p className="text-gray-600 bg-blue-50 p-3 rounded">{pronunciationResult.feedback}</p>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Normal assessment display
              return (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Pronunciation Assessment</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{pronunciationResult.overallScore}</div>
                      <div className="text-sm text-gray-600">Overall Score</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{pronunciationResult.accuracyScore}</div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{pronunciationResult.fluencyScore}</div>
                      <div className="text-sm text-gray-600">Fluency</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{pronunciationResult.completenessScore}</div>
                      <div className="text-sm text-gray-600">Completeness</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{pronunciationResult.pronunciationScore}</div>
                      <div className="text-sm text-gray-600">Pronunciation</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Reference Text:</h3>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded">{pronunciationResult.referenceText}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Recognized Text:</h3>
                      <p className="text-gray-600 bg-gray-50 p-3 rounded">{pronunciationResult.recognizedText}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Feedback:</h3>
                      <p className="text-gray-600 bg-blue-50 p-3 rounded">{pronunciationResult.feedback}</p>
                    </div>
                    {pronunciationResult.details.confidence > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Confidence:</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${pronunciationResult.details.confidence * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {Math.round(pronunciationResult.details.confidence * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })()
        )}

        {pronunciationResult && mode === 'transcribe' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Transcription Result</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Recognized Text:</h3>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{pronunciationResult.recognizedText}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

