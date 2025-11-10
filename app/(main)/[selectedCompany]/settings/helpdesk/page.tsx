'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';

const auth = getAuth(app);

interface HelpdeskSettings {
  subdomain: string;
  defaultForward: string;
  aiMessagesOn: boolean;
  aiSuggestionsOn: boolean;
}

export default function HelpdeskPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [kbRefreshLoading, setKbRefreshLoading] = useState(false);
  const [kbRefreshText, setKbRefreshText] = useState('Refresh Knowledge');
  const [refreshError, setRefreshError] = useState('');
  const [refreshSuccess, setRefreshSuccess] = useState('');

  const [settings, setSettings] = useState<HelpdeskSettings>({
    subdomain: '',
    defaultForward: '',
    aiMessagesOn: false,
    aiSuggestionsOn: false,
  });

  const [defaultForwardInput, setDefaultForwardInput] = useState('');

  // Fetch user authentication and settings
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        fetchSettings(user.uid);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router, selectedCompany]);

  // Fetch settings from API
  const fetchSettings = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/settings/helpdesk?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        setDefaultForwardInput(result.data.defaultForward || '');
      } else {
        setError(result.error || 'Failed to fetch settings');
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  // Save email forwarding
  const saveEmailForwarding = async () => {
    setSaving(true);
    setSaved(false);
    setError('');

    if (!uid) {
      setError('User is not authenticated');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/settings/helpdesk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          defaultForward: defaultForwardInput,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings((prev) => ({ ...prev, defaultForward: defaultForwardInput }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || 'Failed to save email forwarding');
      }
    } catch (err: any) {
      console.error('Error saving email forwarding:', err);
      setError(err.message || 'Failed to save email forwarding');
    } finally {
      setSaving(false);
    }
  };

  // Toggle AI Messages
  const toggleAIMessages = async () => {
    if (!uid) {
      setError('User is not authenticated');
      return;
    }

    const newValue = !settings.aiMessagesOn;

    try {
      const response = await fetch('/api/settings/helpdesk/ai-messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          aiMessagesOn: newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings((prev) => ({ ...prev, aiMessagesOn: newValue }));
      } else {
        setError(result.error || 'Failed to update Auto Response setting');
      }
    } catch (err: any) {
      console.error('Error updating AI messages:', err);
      setError(err.message || 'Failed to update Auto Response setting');
    }
  };

  // Toggle AI Suggestions
  const toggleAISuggestions = async () => {
    if (!uid) {
      setError('User is not authenticated');
      return;
    }

    const newValue = !settings.aiSuggestionsOn;

    try {
      const response = await fetch('/api/settings/helpdesk/ai-suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          aiSuggestionsOn: newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSettings((prev) => ({ ...prev, aiSuggestionsOn: newValue }));
      } else {
        setError(result.error || 'Failed to update Auto Suggest setting');
      }
    } catch (err: any) {
      console.error('Error updating AI suggestions:', err);
      setError(err.message || 'Failed to update Auto Suggest setting');
    }
  };

  // Refresh knowledge base
  const refreshTrainingData = async () => {
    setRefreshError('');
    setRefreshSuccess('');
    setKbRefreshLoading(true);
    setKbRefreshText('Refreshing...');

    if (!uid) {
      console.error('User is not authenticated');
      setRefreshError('User is not authenticated');
      setKbRefreshLoading(false);
      setKbRefreshText('Refresh Knowledge');
      return;
    }

    try {
      const response = await fetch('/api/training/refreshknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid,
          selectedCompany: selectedCompany || 'default',
          waitForIndexing: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKbRefreshText('Refreshed ✔️');
        setRefreshSuccess(data.message || 'Knowledge base refreshed successfully!');
      } else {
        const errorMsg = data.error?.message || data.error || 'Unknown error occurred';
        setRefreshError('There was an error refreshing the knowledge base: ' + errorMsg);
        setKbRefreshText('Refresh Knowledge');
      }

      setKbRefreshLoading(false);
    } catch (error: any) {
      console.error('Refresh error:', error);
      setRefreshError('There seems to be an error with the connection. Please try reloading the page');
      setKbRefreshLoading(false);
      setKbRefreshText('Refresh Knowledge');
    }
  };

  // Skeleton loader
  const getSkeleton = () => {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  };

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">My Help Desk</h2>
        
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        {saved && <p className="text-green-600 dark:text-green-400">Saved</p>}

        {/* Email Section */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Email</h2>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/2">
              <label className="block text-sm font-medium mb-1" htmlFor="defaultSub">
                Linked to subdomain
              </label>
              {loading && getSkeleton()}
              {!loading && (
                <div className="relative">
                  <input
                    required
                    readOnly
                    value={settings.subdomain}
                    placeholder="example"
                    id="defaultSub"
                    className="form-input w-full"
                    type="text"
                  />
                  <div className="absolute inset-0 left-auto flex items-center pointer-events-none">
                    <span className="text-sm text-gray-400 dark:text-gray-500 font-medium px-3">
                      @ourkd.help
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Email Forwarding Section */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Email Forwarding
          </h2>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/2">
              <label className="block text-sm font-medium mb-1" htmlFor="defaultForward">
                From email
              </label>
              {loading && getSkeleton()}
              {!loading && (
                <>
                  <input
                    placeholder="Example support@yourdomain.com"
                    value={defaultForwardInput}
                    onChange={(e) => setDefaultForwardInput(e.target.value)}
                    id="defaultForward"
                    className="form-input w-full"
                    type="text"
                  />
                  {defaultForwardInput && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      * Please go to your email provider and forward emails from{' '}
                      <b>{defaultForwardInput}</b> to <b>{settings.subdomain}@ourkd.help</b>
                    </p>
                  )}
                  <div className="mt-4">
                    {!saving ? (
                      <button
                        type="button"
                        onClick={saveEmailForwarding}
                        className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                      >
                        Save Changes
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                        disabled
                      >
                        <svg
                          className="animate-spin fill-current shrink-0"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                        </svg>
                        <span className="ml-2">Loading</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Charlie Auto Response Section */}
        <section>
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">
            Charlie Auto Response ⭐
          </h2>

          {/* Auto Response Setting */}
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Auto Response
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Charlie will automatically respond to customer messages
          </div>
          {loading && getSkeleton()}
          {!loading && (
            <div className="flex items-center mt-5">
              <div className="form-switch">
                <input
                  type="checkbox"
                  id="toggleAutoResponse"
                  className="sr-only"
                  checked={settings.aiMessagesOn}
                  onChange={toggleAIMessages}
                />
                <label htmlFor="toggleAutoResponse">
                  <span className="bg-white shadow-sm" aria-hidden="true"></span>
                  <span className="sr-only">Auto Response</span>
                </label>
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 italic ml-2">
                {!settings.aiMessagesOn ? 'Off' : 'On'}
              </div>
            </div>
          )}

          {/* Auto Suggest Setting */}
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1 mt-6">
            Auto Suggest
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Charlie will suggest responses for you to review before sending
          </div>
          {loading && getSkeleton()}
          {!loading && (
            <div className="flex items-center mt-5">
              <div className="form-switch">
                <input
                  type="checkbox"
                  id="toggleAutoSuggest"
                  className="sr-only"
                  checked={settings.aiSuggestionsOn}
                  onChange={toggleAISuggestions}
                />
                <label htmlFor="toggleAutoSuggest">
                  <span className="bg-white shadow-sm" aria-hidden="true"></span>
                  <span className="sr-only">Auto Suggest</span>
                </label>
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 italic ml-2">
                {!settings.aiSuggestionsOn ? 'Off' : 'On'}
              </div>
            </div>
          )}

          {/* Info about behavior */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60 rounded-lg">
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <strong>How it works:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li>Both off: No AI assistance</li>
                <li>Auto Response on: Charlie responds automatically</li>
                <li>Auto Suggest on: Charlie suggests responses for review</li>
                <li>Both on: Auto Response takes priority</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Knowledge Sources Section */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Knowledge Sources
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            By default, all knowledge comes from your kb. Click the button below to refresh your
            knowledge
          </div>
          {refreshError && (
            <p className="text-red-600 dark:text-red-400 mb-2">{refreshError}</p>
          )}
          {refreshSuccess && (
            <p className="text-green-600 dark:text-green-400 mb-2">{refreshSuccess}</p>
          )}
          {!kbRefreshLoading ? (
            <button
              onClick={refreshTrainingData}
              type="button"
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            >
              {kbRefreshText}
            </button>
          ) : (
            <button
              type="button"
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
              disabled
            >
              <svg
                className="animate-spin fill-current shrink-0"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
              </svg>
              <span className="ml-2">Refreshing</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

