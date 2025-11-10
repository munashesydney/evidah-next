'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'E-commerce',
    'Education',
    'Real Estate',
    'Manufacturing',
    'Retail',
    'Other',
  ];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Store onboarding data in localStorage for checkout
      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_industry', industry);
        localStorage.setItem('onboarding_websiteUrl', websiteUrl);
      }
      
      // Account created/signed in successfully
      // Redirect to checkout
      router.push('/checkout');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        {/* Logo at top center */}
        <div className="mb-12">
          {mounted ? (
            <Image
              src={resolvedTheme === 'dark' ? '/dark-mode-logo.png' : '/light-mode-logo.png'}
              alt="Evidah Logo"
              width={160}
              height={53}
              className="mx-auto"
              priority
            />
          ) : (
            // Render a placeholder during SSR to prevent hydration mismatch
            <Image
              src="/light-mode-logo.png"
              alt="Evidah Logo"
              width={160}
              height={53}
              className="mx-auto"
              priority
            />
          )}
        </div>

        {/* Step Progress Indicator */}
        <div className="w-full max-w-md mb-8">
          <div className="relative">
            <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-gray-200 dark:bg-gray-700/60" aria-hidden="true"></div>
            <ul className="relative flex justify-between w-full">
              <li>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep >= 1 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                }`}>
                  1
                </div>
              </li>
              <li>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep >= 2 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                }`}>
                  2
                </div>
              </li>
              <li>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep >= 3 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                }`}>
                  3
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Content Card */}
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            {/* Step 1: Industry Selection */}
            {currentStep === 1 && (
              <div>
                <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-6">
                  What industry are you in?
                </h1>
                <div className="space-y-3 mb-6">
                  {industries.map((ind) => (
                    <label key={ind} className="relative block cursor-pointer">
                      <input
                        type="radio"
                        name="industry"
                        value={ind}
                        checked={industry === ind}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="peer sr-only"
                      />
                      <div className="flex items-center bg-white dark:bg-gray-900 text-sm font-medium text-gray-800 dark:text-gray-100 p-4 rounded-lg border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm transition">
                        <span>{ind}</span>
                      </div>
                      <div className="absolute inset-0 border-2 border-transparent peer-checked:border-violet-400 dark:peer-checked:border-violet-500 rounded-lg pointer-events-none" aria-hidden="true"></div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleNext}
                    disabled={!industry}
                    className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Website URL */}
            {currentStep === 2 && (
              <div>
                <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-6">
                  What's your website URL?
                </h1>
                <div className="mb-6">
                  <label
                    className="block text-sm font-medium mb-2 text-gray-800 dark:text-gray-100"
                    htmlFor="website"
                  >
                    Website URL
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="form-input w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="btn bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!websiteUrl}
                    className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Sign in with Google */}
            {currentStep === 3 && (
              <div>
                <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-6">
                  Sign in to continue
                </h1>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin fill-current shrink-0 w-5 h-5"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                        </svg>
                        <span className="font-medium">Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span className="font-medium">Sign in with Google</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex justify-start">
                  <button
                    onClick={handleBack}
                    disabled={loading}
                    className="btn bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

