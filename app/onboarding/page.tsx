'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, OAuthProvider, onAuthStateChanged, signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentSubstep, setCurrentSubstep] = useState(1); // For step 3 substeps
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailStep, setEmailStep] = useState<'email' | 'password' | 'verification'>('email');
  const [emailLoading, setEmailLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const router = useRouter();

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
    if (currentStep === 3) {
      // Handle substeps within step 3
      if (currentSubstep < 4) {
        setCurrentSubstep(currentSubstep + 1);
      } else {
        // Move to step 4 after substep 4
        setCurrentStep(4);
      }
    } else if (currentStep < 4) {
      if (currentStep === 2) {
        // Reset substep when entering step 3 from step 2
        setCurrentSubstep(1);
      }
      setCurrentStep(currentStep + 1);
    }
  };

  // If a user is already signed in and visits onboarding, redirect appropriately
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      
      // If email is not verified, don't redirect (let them complete verification flow)
      if (!currentUser.emailVerified) {
        return;
      }
      
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          router.push('/default/chat');
        } else {
          router.push('/checkout');
        }
      } catch (e) {
        // Fail safe: send to checkout so they can complete setup
        router.push('/checkout');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Force body overflow auto only on this page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Restore onboarding progress from localStorage (step, substep, email flow step)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedStep = parseInt(localStorage.getItem('onboarding_currentStep') || '1', 10);
      const savedSubstep = parseInt(localStorage.getItem('onboarding_currentSubstep') || '1', 10);
      const savedEmailStep = (localStorage.getItem('onboarding_emailStep') || 'email') as 'email' | 'password' | 'verification';
      const savedEmail = localStorage.getItem('onboarding_email') || '';

      if (!Number.isNaN(savedStep) && savedStep >= 1 && savedStep <= 4) {
        setCurrentStep(savedStep);
      }
      if (!Number.isNaN(savedSubstep) && savedSubstep >= 1 && savedSubstep <= 4) {
        setCurrentSubstep(savedSubstep);
      }
      if (['email', 'password', 'verification'].includes(savedEmailStep)) {
        setEmailStep(savedEmailStep);
      }
      if (savedEmail) setEmail(savedEmail);
    } catch {}
  }, []);

  // Persist onboarding progress to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('onboarding_currentStep', String(currentStep));
  }, [currentStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('onboarding_currentSubstep', String(currentSubstep));
  }, [currentSubstep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('onboarding_emailStep', emailStep);
  }, [emailStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (email) localStorage.setItem('onboarding_email', email);
  }, [email]);

  const handleBack = () => {
    if (currentStep === 3) {
      // Handle substeps within step 3
      if (currentSubstep > 1) {
        setCurrentSubstep(currentSubstep - 1);
      } else {
        // Move back to step 2 from substep 1
        setCurrentStep(2);
      }
    } else if (currentStep > 1) {
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

  const handleAppleSignIn = async () => {
    try {
      setAppleLoading(true);
      setError('');
      
      const provider = new OAuthProvider('apple.com');
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
      console.error('Apple sign-in error:', error);
      setError(error.message || 'Failed to sign in with Apple. Please try again.');
      setAppleLoading(false);
    }
  };

  const handleEmailNext = () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setEmailStep('password');
  };

  const handlePasswordSubmit = async () => {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setEmailLoading(true);
      setError('');

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);

      // Store onboarding data in localStorage for checkout
      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_industry', industry);
        localStorage.setItem('onboarding_websiteUrl', websiteUrl);
      }

      setAwaitingVerification(true);
      setEmailStep('verification');
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
      setEmailLoading(false);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      setVerifying(true);
      setError('');

      const user = auth.currentUser;
      if (!user) {
        setError('No user found. Please try again.');
        setVerifying(false);
        return;
      }

      // Reload user to get latest email verification status
      await user.reload();
      const updatedUser = auth.currentUser;

      if (updatedUser?.emailVerified) {
        // Email verified, clear the awaiting flag and redirect to checkout
        setAwaitingVerification(false);
        router.push('/checkout');
      } else {
        setError('Email not verified yet. Please check your inbox and click the verification link.');
        setVerifying(false);
      }
    } catch (error: any) {
      console.error('Email verification check error:', error);
      setError(error.message || 'Failed to verify email. Please try again.');
      setVerifying(false);
    }
  };

  return (
    <main className="light bg-gray-50 min-h-screen">
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

      <div className="flex flex-col items-center px-4 py-12">

        {/* Step Progress Indicator */}
        <div className="w-full max-w-md mb-8">
          <div className="relative">
            <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-gray-200" aria-hidden="true"></div>
            <ul className="relative flex justify-between w-full">
              <li>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep >= 1 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white text-gray-500 border-2 border-gray-200'
                }`}>
                  1
                </div>
              </li>
              <li>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep >= 2 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white text-gray-500 border-2 border-gray-200'
                }`}>
                  2
                </div>
              </li>
              <li>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep >= 3 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white text-gray-500 border-2 border-gray-200'
                }`}>
                  3
                </div>
              </li>
              <li>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep >= 4 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white text-gray-500 border-2 border-gray-200'
                }`}>
                  4
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Content Card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            {/* Step 1: Industry Selection */}
            {currentStep === 1 && (
              <div>
                <h1 className="text-2xl text-gray-900 font-bold mb-6">
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
                      <div className="flex items-center bg-white text-sm font-medium text-gray-900 p-4 rounded-lg border border-gray-200 hover:border-gray-300 shadow-sm transition">
                        <span>{ind}</span>
                      </div>
                      <div className="absolute inset-0 border-2 border-transparent peer-checked:border-violet-500 rounded-lg pointer-events-none" aria-hidden="true"></div>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleNext}
                    disabled={!industry}
                    className="py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Website URL */}
            {currentStep === 2 && (
              <div>
                <h1 className="text-2xl text-gray-900 font-bold mb-6">
                  What's your website URL?
                </h1>
                <div className="mb-6">
                  <label
                    className="block text-sm font-medium mb-2 text-gray-900"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!websiteUrl}
                    className="py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Meet the Team (with substeps) */}
            {currentStep === 3 && (
              <div>
                {/* Step 3 Title */}
                <h1 className="text-2xl text-gray-900 font-bold mb-6">
                  Meet Your Employees
                </h1>
                
                {/* Substep Indicator */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`h-2 rounded-full transition-all ${
                      currentSubstep >= 1 ? 'bg-violet-500 w-8' : 'bg-gray-200 w-2'
                    }`}></div>
                    <div className={`h-2 rounded-full transition-all ${
                      currentSubstep >= 2 ? 'bg-violet-500 w-8' : 'bg-gray-200 w-2'
                    }`}></div>
                    <div className={`h-2 rounded-full transition-all ${
                      currentSubstep >= 3 ? 'bg-violet-500 w-8' : 'bg-gray-200 w-2'
                    }`}></div>
                    <div className={`h-2 rounded-full transition-all ${
                      currentSubstep >= 4 ? 'bg-violet-500 w-8' : 'bg-gray-200 w-2'
                    }`}></div>
                  </div>
                </div>

                {/* Substep 1: Meet Emma */}
                {currentSubstep === 1 && (
                  <>
                    <div className="mb-6 relative group cursor-pointer" onClick={() => setEnlargedImage('/images/employees/emmahelp.png')}>
                      <div className="relative overflow-hidden rounded-lg">
                        <Image
                          src="/images/employees/emmahelp.png"
                          alt="Emma - Help Center Manager"
                          width={600}
                          height={400}
                          className="w-full h-auto rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <h1 className="text-2xl text-gray-900 font-bold mb-4">
                      Meet Emma
                    </h1>
                    <div className="mb-6">
                      <p className="text-gray-700 leading-relaxed">
                        Emma manages your help center like <span className="font-semibold text-violet-600">help.evidah.com</span>. 
                        <span className="font-semibold text-violet-600">help.evidah.com</span> was made by Emma, and you can get your own too.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleBack}
                        className="py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleNext}
                        className="py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* Substep 2: Meet Marquavious */}
                {currentSubstep === 2 && (
                  <>
                    <div className="mb-6 relative group cursor-pointer" onClick={() => setEnlargedImage('/images/employees/marqhelp.png')}>
                      <div className="relative overflow-hidden rounded-lg">
                        <Image
                          src="/images/employees/marqhelp.png"
                          alt="Marquavious - Live Chat Specialist"
                          width={600}
                          height={400}
                          className="w-full h-auto rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <h1 className="text-2xl text-gray-900 font-bold mb-4">
                      Meet Marquavious
                    </h1>
                    <div className="mb-6">
                      <p className="text-gray-700 leading-relaxed">
                        Marquavious can make live chat widgets like the one on <span className="font-semibold text-violet-600">evidah.com</span>. 
                        The chat widget on <span className="font-semibold text-violet-600">evidah.com</span> was made by Marquavious, and you can get your own too.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleBack}
                        className="py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleNext}
                        className="py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* Substep 3: Meet Charlie */}
                {currentSubstep === 3 && (
                  <>
                    <div className="mb-6 relative group cursor-pointer" onClick={() => setEnlargedImage('/images/employees/charliehelp.png')}>
                      <div className="relative overflow-hidden rounded-lg">
                        <Image
                          src="/images/employees/charliehelp.png"
                          alt="Charlie - Email Automation Specialist"
                          width={600}
                          height={400}
                          className="w-full h-auto rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <h1 className="text-2xl text-gray-900 font-bold mb-4">
                      Meet Charlie
                    </h1>
                    <div className="mb-6">
                      <p className="text-gray-700 leading-relaxed">
                        Charlie can respond to emails automatically. Get instant, intelligent email responses that save you time and keep your customers happy.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleBack}
                        className="py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleNext}
                        className="py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}

                {/* Substep 4: Meet Sung Wen */}
                {currentSubstep === 4 && (
                  <>
                    <div className="mb-6 relative group cursor-pointer" onClick={() => setEnlargedImage('/images/employees/sungwenhelp.png')}>
                      <div className="relative overflow-hidden rounded-lg">
                        <Image
                          src="/images/employees/sungwenhelp.png"
                          alt="Sung Wen - Training Specialist"
                          width={600}
                          height={400}
                          className="w-full h-auto rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                          priority
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <h1 className="text-2xl text-gray-900 font-bold mb-4">
                      Meet Sung Wen
                    </h1>
                    <div className="mb-6">
                      <p className="text-gray-700 leading-relaxed">
                        Sung Wen helps with training. If you didn't like a response from the other AIs, he helps you put them in line by adding FAQ, rules, etc.
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleBack}
                        className="py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={handleNext}
                        className="py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
                      >
                        Next Step →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Sign in with Google */}
            {currentStep === 4 && (
              <div className="text-center">
                {/* Celebration Icon */}
                <div className="mb-6 flex justify-center">
                  <div>
                    <Image
                      src="/simple_logo.png"
                      alt="Evidah Logo"
                      width={56}
                      height={56}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Congratulatory Message */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-2">
                    You Made It!
                  </p>
                  <h1 className="text-3xl text-gray-900 font-bold mb-3">
                    Congratulations! 🎉
                  </h1>
                  <p className="text-gray-600 text-base leading-relaxed">
                    <span className="font-semibold text-gray-900">70% of people don't make it here.</span> You're one of the few who's ready to transform their business with AI.
                  </p>
                </div>

                {/* Value Proposition */}
                <div className="mb-8 p-4 bg-violet-50 rounded-lg border border-violet-100">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold text-violet-700">Let's get you started.</span> Join thousands of businesses already using AI to automate support, engage customers, and scale effortlessly.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Email/Password Sign In */}
                {emailStep === 'email' && (
                  <div className="mb-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-gray-900 text-left">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEmailNext();
                          }
                        }}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleEmailNext}
                      className="w-full py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {emailStep === 'password' && (
                  <div className="mb-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2 text-gray-900 text-left">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePasswordSubmit();
                          }
                        }}
                        placeholder="At least 6 characters"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1 text-left">Minimum 6 characters</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStep('email');
                          setPassword('');
                        }}
                        className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handlePasswordSubmit}
                        disabled={emailLoading}
                        className="flex-1 py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {emailLoading ? 'Creating account...' : 'Create Account'}
                      </button>
                    </div>
                  </div>
                )}

                {emailStep === 'verification' && (
                  <div className="mb-4">
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-blue-900 mb-1">Verification email sent!</h3>
                          <p className="text-sm text-blue-700">
                            We've sent a verification email to <span className="font-medium">{email}</span>. Please check your inbox and click the verification link to continue.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyEmail}
                      disabled={verifying}
                      className="w-full py-3 px-6 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifying ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </span>
                      ) : (
                        'Confirm Verification'
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Didn't receive the email? Check your spam folder or try again.
                    </p>
                  </div>
                )}

                {/* Divider - Only show if not in verification step */}
                {emailStep === 'email' && (
                  <>
                    <div className="relative mb-4">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                      </div>
                    </div>

                    {/* Sign In Buttons */}
                    <div className="mb-4 space-y-3">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading || appleLoading || emailLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <span className="font-medium">Continue with Google</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleAppleSignIn}
                        disabled={loading || appleLoading || emailLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-black text-white hover:bg-gray-900 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {appleLoading ? (
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
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 13.1 4.54 5.38 9.5 5.07c1.35.08 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 4.9c-.15-2.23 1.66-4.07 3.74-4.59.44 2.24-1.99 4.46-3.74 4.59z"/>
                            </svg>
                            <span className="font-medium">Continue with Apple</span>
                          </>
                        )}
                      </button>
                      
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Quick, secure, and free to get started
                      </p>
                    </div>
                  </>
                )}

                {/* Back Button - Less Prominent */}
                {emailStep === 'email' && (
                  <div className="flex justify-center">
                    <button
                      onClick={handleBack}
                      disabled={loading || appleLoading || emailLoading}
                      className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Go back
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedImage(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative rounded-lg overflow-hidden shadow-2xl bg-white">
              <Image
                src={enlargedImage}
                alt="Enlarged view"
                width={1200}
                height={800}
                className="w-full h-auto max-h-[90vh] object-contain"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

