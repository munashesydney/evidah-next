'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getAuth, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  OAuthProvider,
  linkWithPopup,
  unlink,
  User
} from 'firebase/auth';
import { app } from '@/lib/firebase';

const auth = getAuth(app);

interface ProviderInfo {
  providerId: string;
  displayName: string;
  icon: React.ReactNode;
}

export default function AuthenticationPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Get linked providers
        const providers = currentUser.providerData.map(p => p.providerId);
        setLinkedProviders(providers);
      } else {
        router.push('/sign-in');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const providers: ProviderInfo[] = [
    {
      providerId: 'google.com',
      displayName: 'Google',
      icon: (
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
      ),
    },
    {
      providerId: 'apple.com',
      displayName: 'Apple',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C1.79 13.1 4.54 5.38 9.5 5.07c1.35.08 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 4.9c-.15-2.23 1.66-4.07 3.74-4.59.44 2.24-1.99 4.46-3.74 4.59z"/>
        </svg>
      ),
    },
    {
      providerId: 'password',
      displayName: 'Email/Password',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const handleLinkProvider = async (providerId: string) => {
    if (!user) return;

    setActionLoading(providerId);
    setError('');
    setSuccess('');

    try {
      let provider;
      if (providerId === 'google.com') {
        provider = new GoogleAuthProvider();
      } else if (providerId === 'apple.com') {
        provider = new OAuthProvider('apple.com');
      } else {
        setError('Email/Password linking is not supported yet. Please contact support.');
        setActionLoading(null);
        return;
      }

      await linkWithPopup(user, provider);
      
      // Refresh user data
      await user.reload();
      const providers = user.providerData.map(p => p.providerId);
      setLinkedProviders(providers);
      
      setSuccess(`Successfully linked ${providerId === 'google.com' ? 'Google' : 'Apple'} account!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error linking provider:', error);
      
      if (error.code === 'auth/credential-already-in-use') {
        setError('This account is already linked to another user.');
      } else if (error.code === 'auth/provider-already-linked') {
        setError('This provider is already linked to your account.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else {
        setError(`Failed to link account: ${error.message}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnlinkProvider = async (providerId: string) => {
    if (!user) return;

    // Prevent unlinking if it's the only provider
    if (linkedProviders.length <= 1) {
      setError('You must have at least one sign-in method linked to your account.');
      return;
    }

    setActionLoading(providerId);
    setError('');
    setSuccess('');

    try {
      await unlink(user, providerId);
      
      // Refresh user data
      await user.reload();
      const providers = user.providerData.map(p => p.providerId);
      setLinkedProviders(providers);
      
      const providerName = providerId === 'google.com' ? 'Google' : 
                          providerId === 'apple.com' ? 'Apple' : 
                          'Email/Password';
      setSuccess(`Successfully unlinked ${providerName} account!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error: any) {
      console.error('Error unlinking provider:', error);
      setError(`Failed to unlink account: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const isLinked = (providerId: string) => linkedProviders.includes(providerId);

  if (loading) {
    return (
      <div className="grow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-3 mt-8">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
            Authentication Methods
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage how you sign in to your account. You can link multiple sign-in methods for convenience.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Current Email */}
        <section className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Account Email
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {user?.email || 'No email associated'}
              </p>
            </div>
          </div>
        </section>

        {/* Linked Providers */}
        <section>
          <h3 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-4">
            Sign-In Methods
          </h3>
          
          <div className="space-y-3">
            {providers.map((provider) => {
              const linked = isLinked(provider.providerId);
              const isLoading = actionLoading === provider.providerId;
              
              return (
                <div
                  key={provider.providerId}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600 dark:text-gray-400">
                      {provider.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {provider.displayName}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {linked ? 'Linked' : 'Not linked'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    {linked ? (
                      <button
                        onClick={() => handleUnlinkProvider(provider.providerId)}
                        disabled={isLoading || linkedProviders.length <= 1}
                        className="btn-sm border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="animate-spin fill-current shrink-0"
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                            >
                              <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                            </svg>
                            <span>Unlinking...</span>
                          </div>
                        ) : (
                          'Unlink'
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLinkProvider(provider.providerId)}
                        disabled={isLoading}
                        className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <svg
                              className="animate-spin fill-current shrink-0"
                              width="14"
                              height="14"
                              viewBox="0 0 16 16"
                            >
                              <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                            </svg>
                            <span>Linking...</span>
                          </div>
                        ) : (
                          'Link'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Info Box */}
        <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                About Account Linking
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Linking multiple sign-in methods allows you to access your account using any of them. 
                You must keep at least one method linked at all times.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
