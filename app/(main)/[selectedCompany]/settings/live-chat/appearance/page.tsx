'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import LiveChatPreview from '../live-chat-preview';

const auth = getAuth(app);

interface AppearanceSettings {
  bubbleShape: string;
  bubbleIcon: string;
  customIconUrl: string;
  primaryColor: string;
  borderRadius: string;
}

export default function AppearanceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<AppearanceSettings>({
    bubbleShape: 'rectangle',
    bubbleIcon: 'chat',
    customIconUrl: '',
    primaryColor: '#6366f1',
    borderRadius: '12',
  });

  const bubbleShapeOptions = [
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'circle', label: 'Circle' },
  ];

  const bubbleIconOptions = [
    { value: 'chat', label: 'Chat' },
    { value: 'message', label: 'Message' },
    { value: 'robot', label: 'Robot' },
    { value: 'custom', label: 'Custom (URL)' },
  ];

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
        `/api/settings/live-chat/appearance?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.bubbleShape !== undefined) {
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
      const response = await fetch('/api/settings/live-chat/appearance', {
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
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );

  return (
    <div className="grow">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Appearance Settings
          </h2>
          <div className="text-sm">Customize the look and feel of your live chat widget.</div>
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
            {/* Bubble Shape */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Bubble Shape
              </label>
              <select
                value={settings.bubbleShape}
                onChange={(e) =>
                  setSettings({ ...settings, bubbleShape: e.target.value })
                }
                className="form-select w-full"
              >
                {bubbleShapeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bubble Icon (when circle) */}
            {settings.bubbleShape === 'circle' && (
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                  Bubble Icon
                </label>
                <select
                  value={settings.bubbleIcon}
                  onChange={(e) =>
                    setSettings({ ...settings, bubbleIcon: e.target.value })
                  }
                  className="form-select w-full"
                >
                  {bubbleIconOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {settings.bubbleIcon === 'custom' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                      Custom Icon URL
                    </label>
                    <input
                      type="url"
                      value={settings.customIconUrl}
                      onChange={(e) =>
                        setSettings({ ...settings, customIconUrl: e.target.value })
                      }
                      className="form-input w-full"
                      placeholder="https://example.com/icon.png"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Primary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryColor: e.target.value })
                  }
                  className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryColor: e.target.value })
                  }
                  className="form-input flex-1"
                  placeholder="#6366f1"
                />
              </div>
            </div>

            {/* Theme Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>🌓 Automatic Theming:</strong> Your chat widget now automatically adapts to light and dark modes! Users can toggle between themes using the button in the chat header for optimal readability.
                </div>
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Border Radius (px)
              </label>
              <input
                type="number"
                value={settings.borderRadius}
                onChange={(e) =>
                  setSettings({ ...settings, borderRadius: e.target.value })
                }
                className="form-input w-full"
                min="0"
                max="50"
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
      <LiveChatPreview appearanceSettings={settings} />
    </div>
  );
}

