import React from 'react';
import { useRouter } from 'next/router';
import WelcomeOnboardingLogo from '/components/WelcomeOnboardingLogo';

export default function Welcome() {
  const router = useRouter();

  const handleGo = () => {
    router.push('/home'); // go to homepage after welcome
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-white py-8 px-4">
      <div className="flex flex-col items-center w-full mt-8">
        {/* SVG illustration */}
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto 32px auto' }}>
          <WelcomeOnboardingLogo />
        </div>
        <h1 className="text-2xl font-extrabold text-center mb-4" style={{ color: '#222', lineHeight: 1.2 }}>
          Step into real Canadian<br />
          classrooms–where English<br />
          comes to life!
        </h1>
        <p className="text-center text-gray-500 text-base mb-4" style={{ maxWidth: 320 }}>
          Learn to communicate confidently through context-driven English practice.
        </p>
      </div>
      <button
        className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-3 rounded-lg mb-8"
        onClick={handleGo}
      >
        Let's go!
      </button>
    </div>
  );
} 