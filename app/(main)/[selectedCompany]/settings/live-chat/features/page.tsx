'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import LiveChatPreview from '../live-chat-preview';

const auth = getAuth(app);

interface FeaturesSettings {
  showAvatar: boolean;
  showTypingIndicator: boolean;
  showOnlineStatus: boolean;
}

export default function FeaturesSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<FeaturesSettings>({
    showAvatar: true,
    showTypingIndicator: true,
    showOnlineStatus: true,
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
        `/api/settings/live-chat/features?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.showAvatar !== undefined) {
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
      const response = await fetch('/api/settings/live-chat/features', {
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
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );

  return (
    <div className="grow">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Features Settings
          </h2>
          <div className="text-sm">Toggle features and functionality for your live chat widget.</div>
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
            {/* Show Avatar */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showAvatar}
                onChange={(e) =>
                  setSettings({ ...settings, showAvatar: e.target.checked })
                }
                className="form-checkbox h-4 w-4 text-violet-600"
              />
              <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                Show Avatar
              </span>
            </label>

            {/* Show Typing Indicator */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showTypingIndicator}
                onChange={(e) =>
                  setSettings({ ...settings, showTypingIndicator: e.target.checked })
                }
                className="form-checkbox h-4 w-4 text-violet-600"
              />
              <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                Show Typing Indicator
              </span>
            </label>

            {/* Show Online Status */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showOnlineStatus}
                onChange={(e) =>
                  setSettings({ ...settings, showOnlineStatus: e.target.checked })
                }
                className="form-checkbox h-4 w-4 text-violet-600"
              />
              <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                Show Online Status
              </span>
            </label>

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
      <LiveChatPreview featuresSettings={settings} />
    </div>
  );
}

