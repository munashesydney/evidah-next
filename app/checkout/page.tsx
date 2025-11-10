'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import { useTheme } from 'next-themes';

interface CheckoutFormProps {
  userEmail: string;
  onboardingData: {
    industry: string;
    websiteUrl: string;
  };
}

function CheckoutForm({ userEmail, onboardingData, plan, billingPeriod, selectedCompany }: CheckoutFormProps & { plan: string; billingPeriod: string; selectedCompany: string }) {
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
  
  // Pricing based on plan and billing period
  const getPricing = () => {
    if (plan === 'evidah_q') {
      return {
        monthly: 39,
        yearly: 348,
        monthlyEquivalent: billingPeriod === 'yearly' ? 29 : 39,
      };
    } else {
      // Individual employees: $29/month or $228/year ($19/month)
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

  // Update email when userEmail prop changes
  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  // Countries list (simplified)
  const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Other'
  ];

  // No auto-creation - SetupIntent created on form submit

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
      // Create setup intent if not already created
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

      // Confirm setup intent to save payment method
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

      // Create subscription with the saved payment method
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

      // Clear onboarding data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('onboarding_industry');
        localStorage.removeItem('onboarding_websiteUrl');
      }

      // Redirect to success page
      router.push('/onboardingcompletion');
    } catch (err: any) {
      setError(err.message || 'Subscription creation failed');
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Checkout Form */}
      <div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Create Account Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              1. Your Account
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-100" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                required
                readOnly
                aria-readonly="true"
                placeholder="you@example.com"
                className="form-input w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                With this email address you'll get access to Evidah AI products. Please make sure it's correct.
              </p>
            </div>
          </div>

          {/* Select Payment Method Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              2. Select Payment Method
            </h2>
            <div className="mb-4">
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="font-medium text-gray-800 dark:text-gray-100">Card</span>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Add Billing Details Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              3. Add Billing Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-100" htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-100" htmlFor="country">
                  Country or region
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  className="form-input w-full"
                >
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="form-checkbox"
            />
            <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300">
              By purchasing, you agree to our{' '}
              <a href="#" className="text-violet-500 hover:text-violet-600">Terms and Conditions</a>
              {' '}and{' '}
              <a href="#" className="text-violet-500 hover:text-violet-600">Privacy Policy</a>.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !stripe}
            className="btn w-full bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </button>
        </form>
      </div>

      {/* Right Column - Order Summary */}
      <div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 sticky top-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Order Summary</h2>
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
              14 DAYS Money Back Guarantee
            </span>
          </div>

          {/* Product Display */}
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                <span className="text-2xl">Q</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                  {plan === 'evidah_q' ? 'EvidahQ Bundle' : 
                   plan === 'charlie' ? 'Charlie' :
                   plan === 'marquavious' ? 'Marquavious' :
                   plan === 'emma' ? 'Emma' :
                   plan === 'sung_wen' ? 'Sung Wen' : plan}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Billed {billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}
                </p>
                {billingPeriod === 'yearly' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ${monthlyEquivalent}/month • Save ${(pricing.monthly * 12) - basePrice}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                    ${basePrice.toFixed(2)}
                    {billingPeriod === 'yearly' && <span className="text-sm font-normal text-gray-500">/year</span>}
                    {billingPeriod === 'monthly' && <span className="text-sm font-normal text-gray-500">/month</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coupon Code */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon Code"
                className="form-input flex-1"
                disabled={!!appliedCoupon}
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!!appliedCoupon || !couponCode.trim()}
                className="btn bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {appliedCoupon}
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
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-800 dark:text-gray-100">${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Discount</span>
                <span className="text-green-600 dark:text-green-400">-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-800 dark:text-gray-100">Total</span>
              <span className="text-gray-800 dark:text-gray-100">USD ${total.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
            Secure Checkout Powered by{' '}
            <span className="font-semibold">stripe</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const [userEmail, setUserEmail] = useState('');
  const [onboardingData, setOnboardingData] = useState({ industry: '', websiteUrl: '' });
  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState('evidah_q');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [selectedCompany, setSelectedCompany] = useState('default');
  const { theme, resolvedTheme } = useTheme();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    
    // Get query parameters
    const planParam = searchParams.get('plan') || 'evidah_q';
    const billingParam = searchParams.get('billing') || 'monthly';
    const companyParam = searchParams.get('company') || 'default';
    
    setPlan(planParam);
    setBillingPeriod(billingParam);
    setSelectedCompany(companyParam);
    
    // Get user email from Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });

    // Get onboarding data from localStorage
    if (typeof window !== 'undefined') {
      const industry = localStorage.getItem('onboarding_industry') || '';
      const websiteUrl = localStorage.getItem('onboarding_websiteUrl') || '';
      setOnboardingData({ industry, websiteUrl });
      
      // Store selectedCompany in localStorage
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
      <main className="bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Stripe publishable key not configured</p>
        </div>
      </main>
    );
  }

  const stripePromise = loadStripe(publishableKey);

  return (
    <main className="bg-white dark:bg-gray-900 min-h-screen">
      {/* Header Banner */}
      <div className="bg-violet-600 text-white py-2 px-4 flex items-center justify-between text-sm">
        <span>Use Code: EVIDAH40</span>
        <span>14:07:28</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            {mounted ? (
              <Image
                src={resolvedTheme === 'dark' ? '/dark-mode-logo.png' : '/light-mode-logo.png'}
                alt="Evidah Logo"
                width={120}
                height={40}
                priority
              />
            ) : (
              <Image
                src="/light-mode-logo.png"
                alt="Evidah Logo"
                width={120}
                height={40}
                priority
              />
            )}
            <span className="text-lg text-gray-800 dark:text-gray-300">Checkout</span>
          </div>
          <a href="/sign-in" className="text-sm text-violet-500 hover:text-violet-600">
            Already have an account? Login
          </a>
        </div>

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
