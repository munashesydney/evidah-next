'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function SignIn() {
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      setErrorMessage('Please fill out all required fields.');
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      setLoading(true);
      setErrorMessage('');

      // Try admin login first
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create token for admin
      const response = await fetch('/api/auth/createtoken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, uid: user.uid }),
      });

      const data = await response.json();

      if (data.status === 1) {
        console.log('Admin logged in successfully');
        await signInWithCustomToken(auth, data.customToken);
        router.push('/');
      } else {
        setErrorMessage(data.message);
      }
    } catch (error: any) {
      console.error('Admin login failed, trying agent login:', error);

      // Try agent login
      try {
        const response = await fetch('/api/auth/loginuser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (data.status === 1) {
          console.log('Agent logged in successfully');
          await signInWithCustomToken(auth, data.customToken);
          router.push('/');
        } else {
          setErrorMessage(data.message);
        }
      } catch (postError: any) {
        console.error('Agent login error:', postError);
        setErrorMessage('Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative md:flex">
        {/* Content */}
        <div className="md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">
            {/* Header */}
            <div className="flex-1">
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link className="block" href="https://evidah.com">
                  <Image
                    src="/simple_logo.png"
                    alt="Logo"
                    width={50}
                    height={50}
                  />
                </Link>
              </div>
            </div>

            <div className="max-w-sm mx-auto w-full px-4 py-8">
              <h1 className="text-3xl text-gray-800 dark:text-gray-100 font-bold mb-6">
                Welcome back!
              </h1>
              
              {errorMessage && (
                <p className="text-red-500 dark:text-red-400 mb-6">
                  {errorMessage}
                </p>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100"
                      htmlFor="email"
                    >
                      Email Address
                    </label>
                    <input
                      required
                      id="email"
                      name="email"
                      className="form-input w-full"
                      type="email"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <input
                      required
                      id="password"
                      name="password"
                      className="form-input w-full"
                      type="password"
                      autoComplete="on"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-6">
                  <div className="mr-1">
                    <Link
                      className="text-sm underline hover:no-underline text-gray-800 dark:text-gray-100"
                      href="/reset-password"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  
                  {loading ? (
                    <button
                      type="button"
                      className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled
                    >
                      <svg
                        className="animate-spin fill-current shrink-0"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                      </svg>
                      <span className="ml-2">Please wait...</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="pt-5 mt-6 border-t border-gray-100 dark:border-gray-700/60">
                <div className="text-sm text-gray-800 dark:text-gray-100">
                  Don't you have an account?{' '}
                  <Link
                    className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
                    href="/sign-up"
                  >
                    Sign Up
                  </Link>
                </div>
                
                {/* Warning */}
                <div className="mt-5">
                  <div className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-600 px-3 py-2 rounded">
                    <svg
                      className="inline w-3 h-3 shrink-0 fill-current mr-2"
                      viewBox="0 0 12 12"
                    >
                      <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                    </svg>
                    <span className="text-sm">
                      To support you all features are free forever.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div
          className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2"
          aria-hidden="true"
        >
          <Image
            className="object-cover object-center w-full h-full"
            src="/auth-image.jpg"
            width={760}
            height={1024}
            alt="Authentication"
            priority
          />
        </div>
      </div>
    </main>
  );
}
