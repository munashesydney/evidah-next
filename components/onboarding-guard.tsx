'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Routes that don't require onboarding check
  const publicRoutes = [
    '/sign-in',
    '/signup',
    '/sign-up',
    '/reset-password',
    '/onboarding',
    '/checkout',
    '/onboardingcompletion',
  ];

  // Routes that are part of the onboarding flow
  const onboardingRoutes = [
    '/onboardingcompletion',
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        
        // Skip check for public routes
        if (publicRoutes.includes(pathname)) {
          setLoading(false);
          return;
        }

        // Check if we're in a (main)/[selectedCompany] route
        const selectedCompany = params?.selectedCompany as string;
        if (selectedCompany) {
          try {
            // Get knowledgebase data
            const kbRef = doc(db, 'Users', user.uid, 'knowledgebases', selectedCompany);
            const kbDoc = await getDoc(kbRef);

            if (kbDoc.exists()) {
              const kbData = kbDoc.data();
              const onboardingDone = kbData.onboardingDone === true;
              
              // Check if required fields are present
              const hasRequiredFields = !!(
                kbData.name &&
                kbData.subdomain &&
                kbData.heading
              );

              // If onboarding is not complete and user is not already on onboarding page
              if ((!onboardingDone || !hasRequiredFields) && !onboardingRoutes.includes(pathname)) {
                console.log('Onboarding not complete, redirecting to onboardingcompletion');
                const redirectPath = `/onboardingcompletion?from=${encodeURIComponent(pathname)}`;
                router.push(redirectPath);
                return;
              }
            } else {
              // No knowledgebase found, redirect to onboarding
              if (!onboardingRoutes.includes(pathname)) {
                router.push(`/onboardingcompletion?from=${encodeURIComponent(pathname)}`);
                return;
              }
            }
          } catch (error) {
            console.error('Error checking onboarding status:', error);
          }
        }
      } else {
        // User not authenticated, redirect to sign-in
        if (!publicRoutes.includes(pathname)) {
          router.push('/sign-in');
          return;
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, params, router]);

  // Show loading state while checking
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

