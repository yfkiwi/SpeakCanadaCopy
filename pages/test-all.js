import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import AudioRecorder from '../components/AudioRecorder';

export default function TestAll() {
  const [supabaseStatus, setSupabaseStatus] = useState('Testing...');
  const [transcript, setTranscript] = useState('');
  
  useEffect(() => {
    async function testSupabase() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setSupabaseStatus(`Supabase error: ${error.message}`);
        } else {
          setSupabaseStatus(`Supabase connected successfully! ${data.session ? 'User logged in.' : 'No active session.'}`);
        }
      } catch (err) {
        setSupabaseStatus(`Supabase error: ${err.message}`);
      }
    }
    
    testSupabase();
  }, []);
  
  const handleTranscriptReceived = (text) => {
    setTranscript(text);
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>System Test Page</h1>
      
      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>Supabase Connection</h2>
        <p>{supabaseStatus}</p>
      </div>
      
      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>AudioRecorder Component</h2>
        <AudioRecorder onTranscriptReceived={handleTranscriptReceived} />
        
        {transcript && (
          <div style={{ marginTop: '15px' }}>
            <h3>Transcript:</h3>
            <p>{transcript}</p>
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '5px' }}>
        <h2>Environment Variables</h2>
        <p>Supabase URL configured: {Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) ? 'Yes' : 'No'}</p>
        <p>Supabase Anon Key configured: {Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? 'Yes' : 'No'}</p>
        <p>OpenAI API Key configured: {typeof window === 'undefined' ? '(Server-side only)' : 'Not visible client-side'}</p>
      </div>
      
      <div>
        <h2>Links</h2>
        <ul>
          <li><a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>Login Page</a></li>
          <li><a href="/dashboard" style={{ color: 'blue', textDecoration: 'underline' }}>Dashboard</a></li>
          <li><a href="/scenarios" style={{ color: 'blue', textDecoration: 'underline' }}>Scenarios List</a></li>
          <li><a href="/test" style={{ color: 'blue', textDecoration: 'underline' }}>Audio Test Page</a></li>
        </ul>
      </div>
    </div>
  );
}