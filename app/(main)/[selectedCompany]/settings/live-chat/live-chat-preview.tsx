'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';

const auth = getAuth(app);

interface LiveChatConfig {
  enabled: boolean;
  position: string;
  theme: string;
  primaryColor: string;
  borderRadius: string;
  size: string;
  bubbleShape: string;
  bubbleIcon: string;
  customIconUrl: string;
  welcomeMessage: string;
  placeholderText: string;
  showAvatar: boolean;
  companyName: string;
  showTypingIndicator: boolean;
  showOnlineStatus: boolean;
  offlineMessage: string;
  customCSS: string;
}

interface LiveChatPreviewProps {
  // Real-time updates from form
  basicSettings?: Partial<Pick<LiveChatConfig, 'enabled' | 'position' | 'theme' | 'size'>>;
  appearanceSettings?: Partial<Pick<LiveChatConfig, 'bubbleShape' | 'bubbleIcon' | 'customIconUrl' | 'primaryColor' | 'borderRadius'>>;
  contentSettings?: Partial<Pick<LiveChatConfig, 'welcomeMessage' | 'placeholderText' | 'companyName' | 'offlineMessage'>>;
  featuresSettings?: Partial<Pick<LiveChatConfig, 'showAvatar' | 'showTypingIndicator' | 'showOnlineStatus'>>;
  advancedSettings?: Partial<Pick<LiveChatConfig, 'customCSS'>>;
}

export default function LiveChatPreview({
  basicSettings,
  appearanceSettings,
  contentSettings,
  featuresSettings,
  advancedSettings,
}: LiveChatPreviewProps = {}) {
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [config, setConfig] = useState<LiveChatConfig | null>(null);
  const [chatWindowOpen, setChatWindowOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        await fetchConfig(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  // Refetch config periodically to get updates (but real-time props take priority)
  useEffect(() => {
    if (!uid) return;

    const interval = setInterval(() => {
      fetchConfig(uid);
    }, 2000); // Check every 2 seconds for updates

    return () => clearInterval(interval);
  }, [uid]);

  const fetchConfig = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/settings/live-chat?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.enabled !== undefined) {
        setConfig(result as LiveChatConfig);
      }
    } catch (err) {
      console.error('Failed to fetch live chat config:', err);
    }
  };

  // Merge real-time settings with fetched config
  const mergedConfig = config ? {
    ...config,
    ...basicSettings,
    ...appearanceSettings,
    ...contentSettings,
    ...featuresSettings,
    ...advancedSettings,
  } : null;

  const renderBubbleIcon = () => {
    if (!mergedConfig) return null;

    if (mergedConfig.bubbleIcon === 'custom' && mergedConfig.customIconUrl) {
      return (
        <img
          src={mergedConfig.customIconUrl}
          alt="icon"
          className="w-5 h-5 object-contain"
        />
      );
    }
    if (mergedConfig.bubbleIcon === 'message') {
      return (
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M18 13a3 3 0 0 1-3 3H7l-4 3v-3H3a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8z" />
        </svg>
      );
    }
    if (mergedConfig.bubbleIcon === 'robot') {
      return (
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a1 1 0 112 0v1h2a2 2 0 012 2v2a4 4 0 012 3.465V15a2 2 0 01-2 2h-1a2 2 0 11-4 0H9a2 2 0 11-4 0H4a2 2 0 01-2-2V10.465A4 4 0 014 7V5a2 2 0 012-2h2V2zM7 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
      );
    }
    // default chat icon
    return (
      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8 0C3.6 0 0 3.1 0 7s3.6 7 8 7h.6l5.4 2v-4.4c1.2-1.2 2-2.8 2-4.6 0-3.9-3.6-7-8-7zm4 10.8v2.3L8.9 12H8c-3.3 0-6-2.2-6-5s2.7-5 6-5 6 2.2 6 5c0 1.7-1 3.2-2 4.8z"/>
      </svg>
    );
  };

  if (!mergedConfig || !mergedConfig.enabled) {
    return null;
  }

  const displayConfig = mergedConfig;

  return (
    <>
      {/* Live Chat Widget Preview - Positioned on the actual page */}
      <div
        className={`fixed ${displayConfig.position.includes('bottom') ? 'bottom-6' : 'top-6'} ${displayConfig.position.includes('right') ? 'right-6' : 'left-6'} z-50 transition-all duration-300 flex flex-col ${displayConfig.position.includes('right') ? 'items-end' : 'items-start'}`}
      >
        {/* Chat Button */}
        <div
          className="cursor-pointer shadow-lg transition-all duration-200 hover:scale-105 mb-3 flex items-center justify-center"
          style={{
            backgroundColor: displayConfig.primaryColor,
            borderRadius: displayConfig.bubbleShape === 'circle' ? '9999px' : `${displayConfig.borderRadius}px`,
            width: displayConfig.bubbleShape === 'circle' ? (displayConfig.size === 'small' ? '48px' : displayConfig.size === 'large' ? '64px' : '56px') : 'auto',
            height: displayConfig.bubbleShape === 'circle' ? (displayConfig.size === 'small' ? '48px' : displayConfig.size === 'large' ? '64px' : '56px') : 'auto',
            padding: displayConfig.bubbleShape === 'circle' ? '0' : (displayConfig.size === 'small' ? '12px' : displayConfig.size === 'large' ? '16px' : '14px'),
            transition: 'border-radius 0.2s ease, background-color 0.2s ease'
          }}
          onClick={() => setChatWindowOpen(!chatWindowOpen)}
        >
          {displayConfig.bubbleShape === 'circle' ? (
            <div className="flex items-center justify-center">
              {renderBubbleIcon()}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {displayConfig.showAvatar && (
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className="text-white font-medium flex-1">
                {displayConfig.companyName || 'Chat with us'}
              </div>
              {displayConfig.showOnlineStatus && (
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              )}
              {/* Toggle Icon */}
              <div className="text-white">
                <svg className={`w-4 h-4 transform transition-transform duration-200 ${chatWindowOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Chat Window Preview */}
        {chatWindowOpen && (
          <div
            className="shadow-xl border transition-all duration-300 animate-in slide-in-from-bottom-4 flex flex-col"
            style={{
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb',
              borderRadius: `${displayConfig.borderRadius}px`,
              height: displayConfig.size === 'small' ? '300px' : displayConfig.size === 'large' ? '450px' : '350px',
              width: displayConfig.size === 'small' ? '18rem' : displayConfig.size === 'large' ? '24rem' : '20rem',
              transition: 'border-radius 0.2s ease'
            }}
          >
            {/* Header */}
            <div
              className="p-4 border-b flex items-center justify-between flex-shrink-0"
              style={{
                backgroundColor: displayConfig.primaryColor,
                borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                borderTopLeftRadius: `${displayConfig.borderRadius}px`,
                borderTopRightRadius: `${displayConfig.borderRadius}px`
              }}
            >
              <div className="flex items-center space-x-2">
                {displayConfig.showAvatar && (
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="text-white font-medium text-sm">{displayConfig.companyName || 'Support Team'}</div>
                  {displayConfig.showOnlineStatus && (
                    <div className="text-white text-xs opacity-80 flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                      Online now
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Theme toggle */}
                <div
                  className="text-white hover:bg-white/10 cursor-pointer p-1 rounded transition-colors"
                  onClick={() => setIsDarkMode(!isDarkMode)}
                >
                  {isDarkMode ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {/* Close button */}
                <div
                  className="text-white hover:bg-white/10 cursor-pointer p-1 rounded transition-colors"
                  onClick={() => setChatWindowOpen(false)}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="flex">
                <div
                  className="rounded-lg p-3 max-w-xs text-sm"
                  style={{
                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                    color: isDarkMode ? '#f9fafb' : '#1f2937'
                  }}
                >
                  {displayConfig.welcomeMessage}
                </div>
              </div>

              <div className="flex justify-end">
                <div
                  className="rounded-lg p-3 max-w-xs text-sm text-white"
                  style={{ backgroundColor: displayConfig.primaryColor }}
                >
                  This is a preview message
                </div>
              </div>

              {displayConfig.showTypingIndicator && (
                <div className="flex">
                  <div
                    className="rounded-lg p-3 max-w-xs"
                    style={{
                      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6'
                    }}
                  >
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div
              className="p-4 border-t flex-shrink-0"
              style={{
                borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                borderBottomLeftRadius: `${displayConfig.borderRadius}px`,
                borderBottomRightRadius: `${displayConfig.borderRadius}px`
              }}
            >
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder={displayConfig.placeholderText}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm transition-all duration-200"
                  style={{
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                    borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                    color: isDarkMode ? '#f9fafb' : '#1f2937'
                  }}
                  readOnly
                />
                <button
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-200 hover:transform hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                  style={{
                    backgroundColor: displayConfig.primaryColor,
                    borderRadius: '8px'
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Badge */}
        <div className={`absolute -top-8 ${displayConfig.position.includes('right') ? 'right-0' : 'left-0'} bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs font-medium`}>
          PREVIEW
        </div>
      </div>
    </>
  );
}

