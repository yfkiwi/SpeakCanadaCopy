import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { getUserPlan } from '../utils/usageLimits';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    dailyLimit: 5,
    features: [
      '5 recordings per day',
      'Access to all scenarios',
      'Progress tracking',
      'Basic vocabulary tools',
      'Free browser TTS'
    ],
    buttonText: 'Current Plan',
    buttonStyle: 'bg-gray-100 text-gray-600 cursor-not-allowed',
    popular: false
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 6.99,
    period: 'month',
    dailyLimit: 80,
    features: [
      '80 recordings per day',
      'Access to all scenarios',
      'Progress tracking',
      'Advanced vocabulary tools',
      'Free browser TTS',
      'Priority support'
    ],
    buttonText: 'Upgrade to Basic',
    buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
    popular: true
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 12.99,
    period: 'month',
    dailyLimit: 200,
    features: [
      '200 recordings per day',
      'Access to all scenarios',
      'Progress tracking',
      'Advanced vocabulary tools',
      'Free browser TTS',
      'Priority support',
      'Early access to new features'
    ],
    buttonText: 'Upgrade to Plus',
    buttonStyle: 'bg-purple-600 hover:bg-purple-700 text-white',
    popular: false
  }
];

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState({ plan_type: 'free', expires_at: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (!user) {
          router.replace('/login');
          return;
        }

        const plan = await getUserPlan(user.id);
        setUserPlan(plan);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleUpgrade = (planId) => {
    // Placeholder for upgrade functionality
    // In a real implementation, this would redirect to payment processing
    if (planId === 'basic') {
      window.location.href = '#basic-plan';
    } else if (planId === 'plus') {
      window.location.href = '#plus-plan';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - 移动端优化 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Choose Your Plan</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Unlock more roleplay conversations and features</p>
            </div>
            <button
              onClick={() => router.push('/home')}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base self-start sm:self-auto"
            >
              ← Back to App
            </button>
          </div>
        </div>
      </div>

      {/* Current Plan Status - 移动端优化 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8">
          <div className="flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-blue-800 font-medium text-sm sm:text-base">
                Current Plan: {PLANS.find(p => p.id === userPlan.plan_type)?.name || 'Free'}
              </p>
              {userPlan.expires_at && (
                <p className="text-blue-600 text-xs sm:text-sm">
                  Expires: {new Date(userPlan.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards - 移动端优化垂直布局 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 ${
                plan.popular ? 'border-blue-500' : 'border-gray-200'
              } ${userPlan.plan_type === plan.id ? 'ring-2 ring-blue-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              {userPlan.plan_type === plan.id && (
                <div className="absolute -top-3 sm:-top-4 right-3 sm:right-4">
                  <span className="bg-green-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                    Current
                  </span>
                </div>
              )}

              <div className="p-4 sm:p-6 lg:p-8">
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-3 sm:mt-4">
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">${plan.price}</span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 text-sm sm:text-base">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    {plan.dailyLimit === 'Unlimited' ? 'Unlimited' : `${plan.dailyLimit} recordings`} per day
                  </p>
                </div>

                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 text-sm sm:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={userPlan.plan_type === plan.id}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    userPlan.plan_type === plan.id
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                      : plan.buttonStyle
                  }`}
                >
                  {userPlan.plan_type === plan.id ? 'Current Plan' : plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Notice - 移动端优化 */}
        <div className="mt-8 sm:mt-12 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h4 className="text-yellow-800 font-medium text-sm sm:text-base">Payment Processing</h4>
            </div>
            <p className="text-yellow-700 text-xs sm:text-sm">
              Your account will be activated within 24 hours after payment confirmation. 
              You'll receive an email notification once your plan is active.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
