'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import LiveChatPreview from '../live-chat-preview';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

const auth = getAuth(app);

interface BasicSettings {
  enabled: boolean;
  position: string;
  theme: string;
  size: string;
}

export default function BasicSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const [settings, setSettings] = useState<BasicSettings>({
    enabled: true,
    position: 'bottom-right',
    theme: 'default',
    size: 'medium',
  });

  const positionOptions = [
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-left', label: 'Top Left' },
  ];

  const themeOptions = [
    { value: 'default', label: 'Default' },
    { value: 'minimal', label: 'Minimal' },
    { value: 'rounded', label: 'Rounded' },
    { value: 'modern', label: 'Modern' },
  ];

  const sizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
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
        `/api/settings/live-chat/basic?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.enabled !== undefined) {
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
      const response = await fetch('/api/settings/live-chat/basic', {
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

  const getIntegrationCode = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const scriptUrl = isLocalhost
      ? 'http://localhost:5173'
      : 'https://app.evidah.com';
    
    return `<script>
window.AikdLiveChatParams = { uid: '${uid}', selectedCompany: '${selectedCompany}', liveChatId: 'default' };
</script>
<script src="${scriptUrl}/livechat.js"></script>`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getIntegrationCode());
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="grow">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Basic Settings
          </h2>
          <div className="text-sm">Configure the basic behavior of your live chat widget.</div>
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
            {/* Enable/Disable */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                  className="form-checkbox h-4 w-4 text-violet-600"
                />
                <span className="ml-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                  Enable Live Chat
                </span>
              </label>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Position
              </label>
              <select
                value={settings.position}
                onChange={(e) =>
                  setSettings({ ...settings, position: e.target.value })
                }
                className="form-select w-full"
              >
                {positionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.value })
                }
                className="form-select w-full"
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">
                Size
              </label>
              <select
                value={settings.size}
                onChange={(e) =>
                  setSettings({ ...settings, size: e.target.value })
                }
                className="form-select w-full"
              >
                {sizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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

        {/* Integration Code Section */}
        {!loading && uid && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700/60">
            <div>
              <h4 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Integration Code</h4>
              <div className="bg-gray-900 rounded-lg p-4 text-sm relative">
                <div className="text-gray-400 mb-2 text-xs">Add this code to your website:</div>
                <code className="text-green-400 text-xs block overflow-x-auto whitespace-pre-wrap">
                  {getIntegrationCode()}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                  title="Copy code"
                >
                  {codeCopied ? (
                    <CheckIcon className="w-5 h-5 text-green-400" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>🚀 Cloud-Powered:</strong> This tiny script automatically loads your latest configuration from our servers. When you update colors, messages, or any settings here, they'll instantly apply to your website - no code updates needed!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <LiveChatPreview basicSettings={settings} />
    </div>
  );
}

