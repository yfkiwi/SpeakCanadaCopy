import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import SpeakCanadaLogo from '../components/SpeakCanadaLogo';
import EmailIcon from '../components/EmailIcon';
import PasswordIcon2 from '../components/PasswordIcon2';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setShowReset(false);
    setResetSent(false);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase returns 'Invalid login credentials' for wrong password or non-existent email
      // To avoid leaking which emails are registered, you may want to always show the same error
      // But for this demo, we show the reset option if the error is 'Invalid login credentials'
      // and the email field is not empty
      if (error.message === 'Invalid login credentials' && email) {
        setShowReset(true);
      }
      setError(error.message);
    } else {
      // 检查用户是否已设置母语
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('native_language')
        .eq('user_id', data.user.id)
        .single();
      
      if (!profile?.native_language) {
        router.push('/language-setup');
      } else {
        router.push('/home');
      }
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      // 新用户注册后先进入语言设置页面
      router.push('/language-setup');
    }
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    setResetEmail(email); // prefill with current email
    setResetError(null);
    setShowReset('input');
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetError(null);
    setResetSent(false);
    // Check if email exists by trying to sign in with a random password
    const { error } = await supabase.auth.signInWithPassword({ email: resetEmail, password: 'random_wrong_password' });
    if (error && error.message === 'Invalid login credentials') {
      // Could be wrong password or non-existent email, so try to send reset
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (resetErr) {
        setResetError(resetErr.message);
      } else {
        setResetSent(true);
        setShowReset(false);
      }
    } else if (!error) {
      // This should not happen, but just in case
      setResetError('Unexpected error.');
    } else {
      setResetError('This email is not registered. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <form className="bg-white py-14 px-8 rounded-xl shadow-2xl w-full max-w-md flex flex-col items-center">
        <div className="flex flex-col items-center mb-12 w-full">
          <SpeakCanadaLogo />
        </div>
        <div className="mb-8 w-full">
          <div className="flex items-center border-2 border-blue-400 rounded-lg px-4 py-3 mb-6 bg-white w-full">
            <EmailIcon className="w-6 h-6 mr-2" />
            <input
              className="w-full outline-none bg-transparent text-lg placeholder-gray-400"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex items-center border-2 border-blue-400 rounded-lg px-4 py-3 bg-white w-full">
            <PasswordIcon2 style={{ marginRight: 16 }} />
            <input
              className="w-full outline-none bg-transparent text-lg placeholder-gray-400"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mb-4 text-center w-full">{error}</p>}
        {showReset === true && !resetSent && (
          <div className="text-center mt-2 text-sm">
            Forgot your password?{' '}
            <a
              href="#"
              className="text-blue-600 hover:underline"
              onClick={handlePasswordReset}
            >
              Reset your password
            </a>
          </div>
        )}
        {showReset === 'input' && !resetSent && (
          <form onSubmit={handleConfirmReset} className="flex flex-col items-center mt-4 w-full">
            <label className="text-sm mb-1">Enter your email address:</label>
            <input
              type="email"
              className="border border-gray-300 rounded px-2 py-1 mb-2 w-full max-w-xs"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              required
            />
            {resetError && <div className="text-red-500 text-xs mb-2">{resetError}</div>}
            <button
              type="submit"
              className="border border-blue-600 text-blue-600 text-base font-semibold px-4 py-1 rounded-lg transition-colors hover:bg-blue-50 mb-3 bg-white"
              style={{ width: '180px', marginBottom: '16px' }}
            >
              Send reset email
            </button>
          </form>
        )}
        {resetSent && (
          <div className="text-center mt-2 text-sm text-green-600">
            Password reset email sent! Please check your inbox.
          </div>
        )}
        <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold p-4 rounded-lg transition-colors mb-4">Login</button>
        <button onClick={handleSignup} className="w-full bg-white border border-blue-600 text-blue-600 text-lg font-semibold p-4 rounded-lg transition-colors hover:bg-blue-50">Sign Up</button>
      </form>
    </div>
  );
}
