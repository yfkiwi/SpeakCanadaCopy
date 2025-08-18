import { useRouter } from 'next/router';

export default function ReviewPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-center">
          <h1 className="text-lg font-semibold text-gray-900">Review</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto w-full flex-1 px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">Your vocabulary</h2>
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Week words */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="h-20 bg-red-500 w-full"></div>
            <div className="px-2 py-3 text-lg text-gray-700">Week words</div>
          </div>
          {/* Today words */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="h-20 bg-yellow-400 w-full"></div>
            <div className="px-2 py-3 text-lg text-gray-700">Today words</div>
          </div>
          {/* Medium words */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="h-20 bg-green-500 w-full"></div>
            <div className="px-2 py-3 text-lg text-gray-700">Medium words</div>
          </div>
          {/* Strong words */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="h-20 bg-blue-600 w-full"></div>
            <div className="px-2 py-3 text-lg text-gray-700">Strong words</div>
          </div>
        </div>
        {/* Your save words */}
        <button 
          className="flex items-center w-full px-3 py-5 rounded-lg border border-gray-200 mb-2 hover:bg-gray-50 transition"
          onClick={() => router.push('/review/saved-words')}
        >
          <svg className="w-7 h-7 text-blue-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
          </svg>
          <span className="flex-1 text-left text-lg text-gray-800 font-semibold">Your save words</span>
          <svg className="w-6 h-6 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => router.push('/')} 
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Home</span>
            </button>
            <button 
              onClick={() => router.push('/scenarios')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/scenarios' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/scenarios' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/scenarios' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Scenario</span>
            </button>
            <button 
              onClick={() => router.push('/review')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/review' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/review' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/review' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Review</span>
            </button>
            <button 
              onClick={() => router.push('/me')}
              className={`flex flex-col items-center py-2 px-3 ${router.pathname === '/me' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}
            >
              <svg className={`w-6 h-6 ${router.pathname === '/me' ? 'text-orange-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className={`text-xs mt-1 ${router.pathname === '/me' ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>Me</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 