'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import LiveChatPreview from '../live-chat-preview';

const auth = getAuth(app);

interface ContentSettings {
  welcomeMessage: string;
  placeholderText: string;
  companyName: string;
  offlineMessage: string;
}

export default function ContentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<ContentSettings>({
    welcomeMessage: 'Hi! How can I help you today?',
    placeholderText: 'Type your message...',
    companyName: 'Support',
    offlineMessage: 'We\'re currently offline. Leave us a message and we\'ll get back to you soon!',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        await fetchSettings(user.uid);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchSettings = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/settings/live-chat/content?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.welcomeMessage !== undefined) {
        setSettings(result);
      } else {
        setError(result.error || 'Failed to fetch settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!uid) {
      setError('User not authenticated');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const response = await fetch('/api/settings/live-chat/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          selectedCompany,
          ...settings,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );

  return (
    <div className="grow">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Content Settings
          </h2>
          <div className="text-sm">Customize the messages and text displayed in your live chat widget.</div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            Settings saved successfully!
          </div>
        )}

        {loading ? (
          getSkeleton()
        ) : (
          <div className="space-y-6">
            {/* Welcome Message */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Welcome Message
              </label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) =>
                  setSettings({ ...settings, welcomeMessage: e.target.value })
                }
                className="form-textarea w-full"
                rows={2}
                placeholder="Hi! How can I help you today?"
              />
            </div>

            {/* Placeholder Text */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Input Placeholder
              </label>
              <input
                type="text"
                value={settings.placeholderText}
                onChange={(e) =>
                  setSettings({ ...settings, placeholderText: e.target.value })
                }
                className="form-input w-full"
                placeholder="Type your message..."
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) =>
                  setSettings({ ...settings, companyName: e.target.value })
                }
                className="form-input w-full"
                placeholder="Your Company Name"
              />
            </div>

            {/* Offline Message */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Offline Message
              </label>
              <textarea
                value={settings.offlineMessage}
                onChange={(e) =>
                  setSettings({ ...settings, offlineMessage: e.target.value })
                }
                className="form-textarea w-full"
                rows={2}
                placeholder="We're currently offline..."
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
      <LiveChatPreview contentSettings={settings} />
    </div>
  );
}

