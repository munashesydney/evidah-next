'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import CountryPicker from '@/components/country-picker';

interface CheckoutFormProps {
  userEmail: string;
  onboardingData: {
    industry: string;
    websiteUrl: string;
  };
  plan: string;
  billingPeriod: string;
  selectedCompany: string;
}

function CheckoutForm({ userEmail, onboardingData, plan, billingPeriod, selectedCompany }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  
  const [email, setEmail] = useState(userEmail || '');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('United States');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const getPricing = () => {
    if (plan === 'evidah_q') {
      return {
        monthly: 39,
        yearly: 348,
        monthlyEquivalent: billingPeriod === 'yearly' ? 29 : 39,
      };
    } else {
      return {
        monthly: 29,
        yearly: 228,
        monthlyEquivalent: billingPeriod === 'yearly' ? 19 : 29,
      };
    }
  };

  const pricing = getPricing();
  const basePrice = billingPeriod === 'yearly' ? pricing.yearly : pricing.monthly;
  const subtotal = basePrice;
  const total = subtotal - discount;
  const monthlyEquivalent = pricing.monthlyEquivalent;

  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);
 

  const createSetupIntent = async () => {
    try {
      const response = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          onboardingData,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      setClientSecret(data.clientSecret);
      setCustomerId(data.customerId);
      
      return {
        secret: data.clientSecret,
        custId: data.customerId,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const response = await fetch('/api/stripe/apply-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          couponCode: couponCode.trim(),
          billingPeriod: billingPeriod,
          plan: plan
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid coupon code');
      }

      setAppliedCoupon(couponCode.trim().toUpperCase());
      setDiscount(data.discountAmount);
      setCouponCode('');
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe not loaded. Please refresh the page.');
      return;
    }

    if (!termsAccepted) {
      setError('Please accept the Terms and Conditions');
      return;
    }

    if (!email || !fullName || !country) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setLoading(false);
      return;
    }

    try {
      let secret = clientSecret;
      let custId = customerId;
      
      if (!secret) {
        const result = await createSetupIntent();
        secret = result.secret;
        custId = result.custId;
      }

      if (!secret || !custId) {
        throw new Error('Failed to initialize payment');
      }

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: fullName,
            email: email,
          },
        },
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment setup failed');
        setLoading(false);
        return;
      }

      if (!setupIntent || !setupIntent.payment_method) {
        throw new Error('Failed to save payment method');
      }

      const subscriptionResponse = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          country,
          couponCode: appliedCoupon,
          customerId: custId,
          paymentMethodId: setupIntent.payment_method,
          onboardingData,
          plan,
          billingPeriod,
          selectedCompany,
        }),
      });

      const subscriptionData = await subscriptionResponse.json();

      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error || 'Failed to create subscription');
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_industry');
        localStorage.removeItem('onboarding_websiteUrl');
      }

      router.push('/onboardingcompletion');
    } catch (err: any) {
      setError(err.message || 'Subscription creation failed');
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
      <div className="order-2 lg:order-1 lg:col-span-3">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!userEmail}
              aria-readonly={!!userEmail}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 ${userEmail ? 'bg-gray-50' : 'bg-white'}`}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium mb-4 text-gray-900">Card information</h3>
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1f2937',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      '::placeholder': {
                        color: '#9ca3af',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium mb-4 text-gray-900">Billing details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="fullName">
                  Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900" htmlFor="country">
                  Country
                </label>
                <CountryPicker
                  id="country"
                  value={country}
                  onChange={setCountry}
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="mt-1 h-4 w-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
              I agree to the{' '}
              <a href="#" className="text-violet-600 hover:text-violet-700 font-medium">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-violet-600 hover:text-violet-700 font-medium">Privacy Policy</a>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !stripe}
            className="w-full py-4 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Pay $${total.toFixed(2)}`
            )}
          </button>

          <p className="text-xs text-center text-gray-500 pt-2">
            Payments are secure and encrypted. Powered by <b>stripe</b>.
          </p>
        </form>
      </div>

      <div className="order-1 lg:order-2 lg:col-span-2">
        <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order summary</h2>

          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                <Image
                  src="/images/employees/evidah-q.png"
                  alt="Product"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/user-avatar-80.png';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1">
                  {plan === 'evidah_q' ? 'EvidahQ Bundle' : 
                   plan === 'charlie' ? 'Charlie' :
                   plan === 'marquavious' ? 'Marquavious' :
                   plan === 'emma' ? 'Emma' :
                   plan === 'sung_wen' ? 'Sung Wen' : plan}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {billingPeriod === 'yearly' ? 'Annual subscription' : 'Monthly subscription'}
                </p>
                {billingPeriod === 'yearly' && (
                  <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded">
                    Save ${(pricing.monthly * 12) - basePrice}/year
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-900">Promo code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 text-sm"
                disabled={!!appliedCoupon}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!!appliedCoupon || !couponCode.trim()}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Apply
              </button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded">
                  {appliedCoupon} applied
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setDiscount(0);
                    setCouponCode('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-green-600 font-medium">-${discount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-baseline mb-6">
            <span className="text-base font-semibold text-gray-900">Total due today</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</div>
              {billingPeriod === 'yearly' && (
                <div className="text-xs text-gray-500 mt-1">${monthlyEquivalent}/month</div>
              )}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-800">14-day money-back guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutContent() {
  const [userEmail, setUserEmail] = useState('');
  const [onboardingData, setOnboardingData] = useState({ industry: '', websiteUrl: '' });
  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState('evidah_q');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [selectedCompany, setSelectedCompany] = useState('default');
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const searchParams = useSearchParams();

  // Force body overflow auto only on this page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const difference = endOfDay.getTime() - now.getTime();
      
      if (difference > 0) {
        return {
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      
      return { hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setMounted(true);
    
    const planParam = searchParams.get('plan') || 'evidah_q';
    const billingParam = searchParams.get('billing') || 'monthly';
    const companyParam = searchParams.get('company') || 'default';
    
    setPlan(planParam);
    setBillingPeriod(billingParam);
    setSelectedCompany(companyParam);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });

    if (typeof window !== 'undefined') {
      const industry = localStorage.getItem('onboarding_industry') || '';
      const websiteUrl = localStorage.getItem('onboarding_websiteUrl') || '';
      setOnboardingData({ industry, websiteUrl });
      
      localStorage.setItem('selectedCompany', companyParam);
    }

    return () => unsubscribe();
  }, [searchParams]);

  if (!mounted) {
    return null;
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE || '';
  
  if (!publishableKey) {
    return (
      <main className="light bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Stripe publishable key not configured</p>
        </div>
      </main>
    );
  }

  const stripePromise = loadStripe(publishableKey);

  return (
    <main className="light bg-gray-50 min-h-screen">
      {/* Promotional Banner */}
      <div className="bg-violet-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Limited Time Offer: Use code <span className="font-bold">EVIDAH40</span> for 40% off</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono font-semibold">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Image
              src="/light-mode-logo.png"
              alt="Evidah Logo"
              width={140}
              height={45}
              priority
            />
            <a href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Elements stripe={stripePromise}>
          <CheckoutForm 
            userEmail={userEmail} 
            onboardingData={onboardingData}
            plan={plan}
            billingPeriod={billingPeriod}
            selectedCompany={selectedCompany}
          />
        </Elements>
      </div>
    </main>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={
      <main className="light bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
