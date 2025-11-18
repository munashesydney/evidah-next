(function() {
  'use strict';

  /*
   * AI Knowledge Desk Live Chat Widget
   * 
   * Features:
   * - Real-time chat with AI assistant
   * - Markdown support for bot responses
   * - Dark/light theme toggle
   * - Chat history and session management
   * - Responsive design
   * 
   * Markdown Support:
   * - Headers (# ## ###)
   * - Bold (**text**) and italic (*text*)
   * - Inline code (`code`) and code blocks (```code```)
   * - Links [text](url)
   * - Lists (- item, 1. item)
   * - Blockquotes (> text)
   * - Horizontal rules (---)
   */

  // Environment detection
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isFileProtocol = window.location.protocol === 'file:';
  const isLocalhost = isLocal || isFileProtocol;

  // API endpoints - use app.evidah.com for production
  const PRODUCTION_BASE = 'https://app.evidah.com';
  const DEV_BASE = 'http://localhost:3002';
  const BASE_URL = isLocalhost ? DEV_BASE : PRODUCTION_BASE;
  
  const API_BASE = BASE_URL + '/api/employee/respond';
  const CONFIG_API_BASE = BASE_URL + '/api/public/live-chat/config';

  // Default configuration
  const defaultConfig = {
    enabled: true,
    position: 'bottom-right',
    theme: 'default',
    primaryColor: '#6366f1',
    borderRadius: '12',
    size: 'medium',
    bubbleShape: 'rectangle',
    bubbleIcon: 'chat',
    customIconUrl: '',
    welcomeMessage: 'Hi! How can I help you today?',
    placeholderText: 'Type your message...',
    showAvatar: true,
    companyName: 'Support',
    showTypingIndicator: true,
    showOnlineStatus: false, // Changed to false since we don't track online status
    offlineMessage: 'We\'re currently offline. Leave us a message and we\'ll get back to you soon!',
    customCSS: ''
  };

  // Global configuration will be loaded from cloud
  let config = { ...defaultConfig };
  let isConfigLoaded = false;
  let isDarkMode = false;

  // Markdown detection function
  function containsMarkdown(text) {
    const markdownPatterns = [
      /^#{1,6}\s/, // Headers
      /\*\*.*?\*\*/, // Bold
      /\*.*?\*/, // Italic
      /`.*?`/, // Inline code
      /```[\s\S]*?```/, // Code blocks
      /\[.*?\]\(.*?\)/, // Links
      /^\s*[-*+]\s/, // Unordered lists
      /^\s*\d+\.\s/, // Ordered lists
      /^\s*>\s/, // Blockquotes
      /^\|.*\|$/, // Tables
      /^---$/, // Horizontal rules
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
  }

  // Simple markdown to HTML converter
  function markdownToHTML(text) {
    if (!containsMarkdown(text)) {
      return text;
    }

    let html = text;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 style="margin: 8px 0 4px 0; font-size: 14px; font-weight: 600; color: inherit;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="margin: 8px 0 4px 0; font-size: 15px; font-weight: 600; color: inherit;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="margin: 8px 0 4px 0; font-size: 16px; font-weight: 600; color: inherit;">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');

    // Inline code
    html = html.replace(/`(.*?)`/g, `<code style="background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 13px;">$1</code>`);

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
      return `<pre style="background: ${isDarkMode ? '#374151' : '#f3f4f6'}; padding: 8px; border-radius: 6px; margin: 8px 0; overflow-x: auto; font-family: monospace; font-size: 12px; border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};"><code>${code.trim()}</code></pre>`;
    });

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>');

    // Unordered lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li style="margin: 2px 0;">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li style="margin: 2px 0;">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ol style="margin: 8px 0; padding-left: 20px;">$1</ol>');

    // Blockquotes
    html = html.replace(/^\s*>\s+(.*$)/gim, `<blockquote style="border-left: 3px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}; padding-left: 12px; margin: 8px 0; font-style: italic; color: ${isDarkMode ? '#9ca3af' : '#6b7280'};">$1</blockquote>`);

    // Horizontal rules
    html = html.replace(/^---$/gm, `<hr style="border: none; border-top: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}; margin: 12px 0;">`);

    // Convert line breaks to <br> tags
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // Chat state
  let isOpen = false;
  let isTyping = false;
  let messages = [];
  let sessionId = generateSessionId();
  let userInfo = null;
  let chatId = null;
  let showingChatHistory = false;
  let showingAllChats = false;

  function generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  function generateChatId() {
    return 'chat_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  function getStorageKey(key) {
    return `aikd_livechat_${config.uid}_${config.selectedCompany}_${key}`;
  }

  function saveUserSession() {
    if (userInfo && chatId) {
      localStorage.setItem(getStorageKey('userInfo'), JSON.stringify(userInfo));
      localStorage.setItem(getStorageKey('chatId'), chatId);
    }
  }

  function loadUserSession() {
    try {
      const savedUserInfo = localStorage.getItem(getStorageKey('userInfo'));
      const savedChatId = localStorage.getItem(getStorageKey('chatId'));
      
      if (savedUserInfo && savedChatId) {
        userInfo = JSON.parse(savedUserInfo);
        chatId = savedChatId;
        return true;
      }
    } catch (e) {
      console.warn('Failed to load user session:', e);
    }
    return false;
  }

  function clearUserSession() {
    localStorage.removeItem(getStorageKey('userInfo'));
    localStorage.removeItem(getStorageKey('chatId'));
    userInfo = null;
    chatId = null;
  }

  async function loadConfiguration() {
    try {
      // Get configuration parameters from window object or URL
      const params = window.AikdLiveChatParams || {};
      const uid = params.uid;
      const selectedCompany = params.selectedCompany || 'default';
      const liveChatId = params.liveChatId || 'default';

      if (!uid) {
        console.error('Live Chat: uid parameter is required');
        return false;
      }

      console.log('Loading live chat configuration from cloud:', { uid, selectedCompany, liveChatId });

      const response = await fetch(
        `${CONFIG_API_BASE}?uid=${encodeURIComponent(uid)}&selectedCompany=${encodeURIComponent(selectedCompany)}&liveChatId=${encodeURIComponent(liveChatId)}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.config) {
        // Merge cloud config with defaults and add the IDs for API calls
        config = { 
          ...defaultConfig, 
          ...data.config,
          uid,
          selectedCompany
        };
        isConfigLoaded = true;
        console.log('Live chat configuration loaded successfully:', config);
        return true;
      } else {
        console.error('Failed to load live chat configuration:', data);
        return false;
      }
    } catch (error) {
      console.error('Error loading live chat configuration:', error);
      return false;
    }
  }

  function renderBubbleIcon() {
    if (config.bubbleIcon === 'custom' && config.customIconUrl) {
      return `<img src="${config.customIconUrl}" alt="icon" style="width: 20px; height: 20px; object-fit: contain;" />`;
    }
    if (config.bubbleIcon === 'message') {
      return `<svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 20 20">
        <path d="M18 13a3 3 0 0 1-3 3H7l-4 3v-3H3a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8z" />
      </svg>`;
    }
    if (config.bubbleIcon === 'robot') {
      return `<svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 2a1 1 0 112 0v1h2a2 2 0 012 2v2a4 4 0 012 3.465V15a2 2 0 01-2 2h-1a2 2 0 11-4 0H9a2 2 0 11-4 0H4a2 2 0 01-2-2V10.465A4 4 0 014 7V5a2 2 0 012-2h2V2zM7 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z" />
      </svg>`;
    }
    // default chat icon
    return `<svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 20 20">
      <path d="M8 0C3.6 0 0 3.1 0 7s3.6 7 8 7h.6l5.4 2v-4.4c1.2-1.2 2-2.8 2-4.6 0-3.9-3.6-7-8-7zm4 10.8v2.3L8.9 12H8c-3.3 0-6-2.2-6-5s2.7-5 6-5 6 2.2 6 5c0 1.7-1 3.2-2 4.8z"/>
    </svg>`;
  }

  function createUserInfoForm() {
    return `
      <div style="padding: 20px; text-align: center;">
        <h3 style="margin: 0 0 16px 0; color: ${isDarkMode ? '#f9fafb' : '#1f2937'}; font-size: 16px; font-weight: 600;">
          Let's get started!
        </h3>
        <p style="margin: 0 0 20px 0; color: ${isDarkMode ? '#d1d5db' : '#6b7280'}; font-size: 14px;">
          Please provide your details to start chatting with us.
        </p>
        <form id="aikd-user-info-form" style="display: flex; flex-direction: column; gap: 16px;">
          <input
            id="aikd-user-name"
            type="text"
            placeholder="Your Name"
            required
            style="
              padding: 10px 12px;
              border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
              border-radius: 8px;
              font-size: 14px;
              background: ${isDarkMode ? '#374151' : '#ffffff'};
              color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
              outline: none;
            "
          />
          <input
            id="aikd-user-email"
            type="email"
            placeholder="Your Email"
            required
            style="
              padding: 10px 12px;
              border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
              border-radius: 8px;
              font-size: 14px;
              background: ${isDarkMode ? '#374151' : '#ffffff'};
              color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
              outline: none;
            "
          />
          <button
            type="submit"
            style="
              background: ${config.primaryColor};
              color: white;
              border: none;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            "
          >
            Start Chat
          </button>
        </form>
      </div>
    `;
  }

  function createChatHistoryView() {
    return `
      <div style="padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="margin: 0; color: ${isDarkMode ? '#f9fafb' : '#1f2937'}; font-size: 16px; font-weight: 600;">
            Welcome back, ${userInfo.name}!
          </h3>
          <button
            id="aikd-view-all-chats-btn"
            style="
              background: none;
              border: none;
              color: ${config.primaryColor};
              font-size: 12px;
              cursor: pointer;
              text-decoration: underline;
              padding: 4px 8px;
            "
          >
            View All Chats
          </button>
        </div>
        <div style="margin-bottom: 16px;">
          <button
            id="aikd-new-chat-btn"
            style="
              width: 100%;
              background: ${config.primaryColor};
              color: white;
              border: none;
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              margin-bottom: 12px;
            "
          >
            + Start New Chat
          </button>
          <button
            id="aikd-continue-chat-btn"
            style="
              width: 100%;
              background: ${isDarkMode ? '#374151' : '#f3f4f6'};
              color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
              border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
              padding: 12px 16px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            "
          >
            Continue Current Chat
          </button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <button
            id="aikd-change-user-btn"
            style="
              background: none;
              border: 1px solid ${isDarkMode ? '#374151' : '#d1d5db'};
              color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
              transition: all 0.2s;
            "
          >
            🔄 Change User
          </button>
          <button
            id="aikd-settings-btn"
            style="
              background: none;
              border: 1px solid ${isDarkMode ? '#374151' : '#d1d5db'};
              color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
              transition: all 0.2s;
            "
          >
            ⚙️ Settings
          </button>
        </div>
        <div style="font-size: 12px; color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; text-align: center;">
          <a href="#" id="aikd-clear-session" style="color: ${config.primaryColor}; text-decoration: none;">
            Clear session & start fresh
          </a>
        </div>
      </div>
    `;
  }

  function createAllChatsView() {
    return `
      <div style="padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="margin: 0; color: ${isDarkMode ? '#f9fafb' : '#1f2937'}; font-size: 16px; font-weight: 600;">
            Your Chat History
          </h3>
          <button
            id="aikd-back-to-welcome-btn"
            style="
              background: none;
              border: none;
              color: ${config.primaryColor};
              font-size: 12px;
              cursor: pointer;
              text-decoration: underline;
              padding: 4px 8px;
            "
          >
            ← Back
          </button>
        </div>
        <div id="aikd-all-chats-list" style="max-height: 300px; overflow-y: auto;">
          <div style="text-align: center; padding: 20px; color: ${isDarkMode ? '#9ca3af' : '#6b7280'};">
            Loading your chats...
          </div>
        </div>
      </div>
    `;
  }

  function createChatWidget() {
    console.log('Creating chat widget with config:', config);
    
    if (!config.enabled) {
      console.log('Chat widget disabled');
      return;
    }

    const widgetId = 'aikd-livechat-widget';
    if (document.getElementById(widgetId)) {
      console.log('Widget already exists');
      return; // Already exists
    }

    // Create widget container
    const widget = document.createElement('div');
    widget.id = widgetId;
    widget.style.cssText = `
      position: fixed;
      ${config.position.includes('bottom') ? 'bottom: 24px' : 'top: 24px'};
      ${config.position.includes('right') ? 'right: 24px' : 'left: 24px'};
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      flex-direction: column;
      ${config.position.includes('right') ? 'align-items: flex-end' : 'align-items: flex-start'};
    `;

    // Chat button
    const buttonSize = config.size === 'small' ? '48px' : config.size === 'large' ? '64px' : '56px';
    const button = document.createElement('div');
    button.style.cssText = `
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${config.primaryColor};
      border-radius: ${config.bubbleShape === 'circle' ? '50%' : config.borderRadius + 'px'};
      ${config.bubbleShape === 'circle' ? 
        `width: ${buttonSize}; height: ${buttonSize};` : 
        `padding: ${config.size === 'small' ? '12px' : config.size === 'large' ? '16px' : '14px'};`
      }
    `;

    if (config.bubbleShape === 'circle') {
      button.innerHTML = renderBubbleIcon();
    } else {
      button.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          ${config.showAvatar ? `
            <div style="width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <svg style="width: 16px; height: 16px; color: #6b7280;" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
              </svg>
            </div>
          ` : ''}
          <div style="color: white; font-weight: 500; flex: 1;">
            ${config.companyName || 'Chat with us'}
          </div>
          <div style="color: white;">
            <svg id="aikd-toggle-icon" style="width: 16px; height: 16px; transform: ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      `;
    }

    button.addEventListener('click', toggleChat);
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });

    // Chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'aikd-chat-window';
    const windowWidth = config.size === 'small' ? '288px' : config.size === 'large' ? '384px' : '320px';
    const windowHeight = config.size === 'small' ? '300px' : config.size === 'large' ? '450px' : '350px';
    
    chatWindow.style.cssText = `
      width: ${windowWidth};
      height: ${windowHeight};
      background: ${isDarkMode ? '#1f2937' : '#ffffff'};
      border-radius: ${config.borderRadius}px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
      display: none;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.95);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      background: ${config.primaryColor};
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e5e7eb;
    `;

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        ${config.showAvatar ? `
          <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <svg style="width: 14px; height: 14px; color: white;" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
          </div>
        ` : ''}
        <div style="flex: 1;">
          <div style="color: white; font-weight: 600; font-size: 14px;">${config.companyName || 'Support Team'}</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div id="aikd-menu-btn" style="color: white; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" title="Menu">
          <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
          </svg>
        </div>
        <div id="aikd-theme-toggle" style="color: white; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="window.AikdLiveChat.toggleTheme()">
          <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div style="color: white; cursor: pointer; padding: 4px; border-radius: 4px; transition: background 0.2s;" onclick="window.AikdLiveChat.close()">
          <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `;

    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'aikd-messages';
    messagesContainer.style.cssText = `
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 150px;
      max-height: calc(100% - 140px);
    `;

    // Initialize chat content based on user state
    setTimeout(() => {
      updateChatContent();
    }, 100);

    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.id = 'aikd-input-container';
    inputContainer.style.cssText = `
      padding: 16px;
      border-top: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      background: ${isDarkMode ? '#1f2937' : '#ffffff'};
      min-height: 72px;
      box-sizing: border-box;
    `;
    
    console.log('Creating input container');

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = config.placeholderText;
    input.style.cssText = `
      flex: 1;
      border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
      background: ${isDarkMode ? '#374151' : '#ffffff'};
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    `;
    
    input.addEventListener('focus', () => {
      input.style.borderColor = config.primaryColor;
      input.style.boxShadow = `0 0 0 3px ${config.primaryColor}20`;
    });
    
    input.addEventListener('blur', () => {
      input.style.borderColor = isDarkMode ? '#4b5563' : '#d1d5db';
      input.style.boxShadow = 'none';
    });

    const sendButton = document.createElement('button');
    sendButton.innerHTML = 'Send';
    sendButton.style.cssText = `
      background: ${config.primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    sendButton.addEventListener('mouseenter', () => {
      sendButton.style.transform = 'translateY(-1px)';
      sendButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });
    sendButton.addEventListener('mouseleave', () => {
      sendButton.style.transform = 'translateY(0)';
      sendButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });

    function sendMessage() {
      const message = input.value.trim();
      if (!message) return;

      addMessage('user', message);
      input.value = '';
      
      // Send to AI
      sendToAI(message);
    }

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // Add menu button event listener
    const menuBtn = document.getElementById('aikd-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', toggleMenu);
    }

    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    
    console.log('Input and send button created, appending to input container');
    console.log('Input container:', inputContainer);

    chatWindow.appendChild(header);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputContainer);
    
    console.log('Input container appended to chat window');

    widget.appendChild(button);
    widget.appendChild(chatWindow);

    document.body.appendChild(widget);
    
    console.log('Widget created and appended to body');
    console.log('Messages container:', document.getElementById('aikd-messages'));
    console.log('Chat window:', document.getElementById('aikd-chat-window'));
    console.log('Input container:', document.getElementById('aikd-input-container'));
    
    // Verify chat window structure
    const chatWindowElement = document.getElementById('aikd-chat-window');
    if (chatWindowElement) {
      console.log('Chat window children count:', chatWindowElement.children.length);
      console.log('Chat window children:', Array.from(chatWindowElement.children).map(child => `${child.tagName}#${child.id}`));
    }

    // Apply custom CSS if provided
    if (config.customCSS) {
      const style = document.createElement('style');
      style.textContent = config.customCSS;
      document.head.appendChild(style);
    }
  }

  function toggleChat() {
    isOpen = !isOpen;
    const chatWindow = document.getElementById('aikd-chat-window');
    const toggleIcon = document.getElementById('aikd-toggle-icon');
    
    if (chatWindow) {
      if (isOpen) {
        chatWindow.style.display = 'flex';
        setTimeout(() => {
          chatWindow.style.transform = 'scale(1)';
          chatWindow.style.opacity = '1';
        }, 10);
      } else {
        chatWindow.style.transform = 'scale(0.95)';
        chatWindow.style.opacity = '0';
        setTimeout(() => {
          chatWindow.style.display = 'none';
        }, 200);
      }
    }

    if (toggleIcon) {
      toggleIcon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }

  function updateChatContent() {
    const messagesContainer = document.getElementById('aikd-messages');
    const inputContainer = document.getElementById('aikd-input-container');
    
    if (!messagesContainer) return;

    // Check if user has session
    const hasSession = loadUserSession();
    
    if (!hasSession) {
      // Show user info form
      showingChatHistory = false;
      showingAllChats = false;
      messagesContainer.innerHTML = createUserInfoForm();
      inputContainer.style.display = 'none';
      setupUserInfoForm();
    } else {
      // Show chat history options for returning users
      showingChatHistory = true;
      showingAllChats = false;
      messagesContainer.innerHTML = createChatHistoryView();
      inputContainer.style.display = 'none';
      setupChatHistoryView();
    }
  }

  function setupUserInfoForm() {
    const form = document.getElementById('aikd-user-info-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('aikd-user-name').value.trim();
        const email = document.getElementById('aikd-user-email').value.trim();
        
        if (name && email) {
          userInfo = { name, email };
          chatId = generateChatId();
          saveUserSession();
          startNewChat();
        }
      });
    }
  }

  function setupChatHistoryView() {
    const newChatBtn = document.getElementById('aikd-new-chat-btn');
    const continueChatBtn = document.getElementById('aikd-continue-chat-btn');
    const clearSessionBtn = document.getElementById('aikd-clear-session');
    const viewAllChatsBtn = document.getElementById('aikd-view-all-chats-btn');
    const changeUserBtn = document.getElementById('aikd-change-user-btn');
    const settingsBtn = document.getElementById('aikd-settings-btn');
    
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        chatId = generateChatId();
        saveUserSession();
        startNewChat();
      });
    }
    
    if (continueChatBtn) {
      continueChatBtn.addEventListener('click', () => {
        loadChatHistory();
      });
    }
    
    if (clearSessionBtn) {
      clearSessionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearUserSession();
        updateChatContent();
      });
    }
    
    if (viewAllChatsBtn) {
      viewAllChatsBtn.addEventListener('click', () => {
        showAllChats();
      });
    }
    
    if (changeUserBtn) {
      changeUserBtn.addEventListener('click', () => {
        clearUserSession();
        updateChatContent();
      });
    }
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        showSettings();
      });
    }
  }

  function startNewChat() {
    const messagesContainer = document.getElementById('aikd-messages');
    const inputContainer = document.getElementById('aikd-input-container');
    
    showingChatHistory = false;
    messages = [];
    
    messagesContainer.innerHTML = '';
    inputContainer.style.display = 'flex';
    
    // Add welcome message
    if (config.welcomeMessage) {
      addMessage('bot', config.welcomeMessage);
    }
  }

  async function loadChatHistory() {
    const messagesContainer = document.getElementById('aikd-messages');
    const inputContainer = document.getElementById('aikd-input-container');
    
    showingChatHistory = false;
    messagesContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Loading chat history...</div>';
    
    try {
      const response = await fetch(
        `${BASE_URL}/api/public/live-chat/history?uid=${encodeURIComponent(config.uid)}&selectedCompany=${encodeURIComponent(config.selectedCompany)}&chatId=${encodeURIComponent(chatId)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        let loadedMessages = data.messages || [];
        
        // Deduplicate messages (remove consecutive duplicate AI responses)
        loadedMessages = deduplicateMessages(loadedMessages);
        
        // Update the global messages array
        messages = loadedMessages;
        
        messagesContainer.innerHTML = '';
        inputContainer.style.display = 'flex';
        
        // Display chat history
        loadedMessages.forEach(msg => {
          addMessageToDOM(msg.type, msg.content);
        });
        
        // If no history, show welcome message
        if (loadedMessages.length === 0 && config.welcomeMessage) {
          addMessage('bot', config.welcomeMessage);
        }
      } else {
        throw new Error('Failed to load chat history');
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      messagesContainer.innerHTML = '';
      inputContainer.style.display = 'flex';
      addMessage('bot', 'Welcome back! How can I help you today?');
    }
  }

  async function showAllChats() {
    const messagesContainer = document.getElementById('aikd-messages');
    const inputContainer = document.getElementById('aikd-input-container');
    
    showingAllChats = true;
    showingChatHistory = false;
    messagesContainer.innerHTML = createAllChatsView();
    inputContainer.style.display = 'none';
    
    setupAllChatsView();
    await loadAllChats();
  }

  function setupAllChatsView() {
    const backBtn = document.getElementById('aikd-back-to-welcome-btn');
    
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        showingAllChats = false;
        showingChatHistory = true;
        updateChatContent();
      });
    }
  }

  async function loadAllChats() {
    const chatsListContainer = document.getElementById('aikd-all-chats-list');
    
    if (!chatsListContainer) return;
    
    try {
      const response = await fetch(
        `${BASE_URL}/api/public/live-chat/all-chats?uid=${encodeURIComponent(config.uid)}&selectedCompany=${encodeURIComponent(config.selectedCompany)}&userEmail=${encodeURIComponent(userInfo.email)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const chats = data.chats || [];
        
        if (chats.length === 0) {
          chatsListContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: ${isDarkMode ? '#9ca3af' : '#6b7280'};">
              <div style="margin-bottom: 8px;">📝</div>
              <div>No previous chats found</div>
              <div style="font-size: 12px; margin-top: 8px;">Start a new conversation to see it here</div>
            </div>
          `;
          return;
        }
        
        // Sort chats by last activity (newest first)
        chats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
        
        const chatsHTML = chats.map(chat => {
          const lastMessage = chat.lastMessage || { content: 'No messages yet', type: 'bot' };
          const messagePreview = lastMessage.content.length > 50 
            ? lastMessage.content.substring(0, 50) + '...' 
            : lastMessage.content;
          
          const date = new Date(chat.lastActivity);
          const timeAgo = getTimeAgo(date);
          
          return `
            <div 
              class="aikd-chat-item" 
              data-chat-id="${chat.chatId}"
              style="
                padding: 12px;
                border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.2s;
                background: ${isDarkMode ? '#1f2937' : '#ffffff'};
              "
              data-hover-bg="${isDarkMode ? '#374151' : '#f9fafb'}"
              data-normal-bg="${isDarkMode ? '#1f2937' : '#ffffff'}"
            >
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                <div style="font-size: 12px; color: ${isDarkMode ? '#9ca3af' : '#6b7280'};">
                  ${timeAgo}
                </div>
                <div style="font-size: 10px; color: ${isDarkMode ? '#6b7280' : '#9ca3af'};">
                  ${chat.messageCount || 0} messages
                </div>
              </div>
              <div style="
                font-size: 13px; 
                color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
                line-height: 1.4;
                display: flex;
                align-items: flex-start;
                gap: 8px;
              ">
                <div style="
                  width: 6px; 
                  height: 6px; 
                  border-radius: 50%; 
                  background: ${lastMessage.type === 'user' ? config.primaryColor : (isDarkMode ? '#6b7280' : '#9ca3af')};
                  margin-top: 6px;
                  flex-shrink: 0;
                "></div>
                <div style="flex: 1;">${messagePreview}</div>
              </div>
            </div>
          `;
        }).join('');
        
        chatsListContainer.innerHTML = chatsHTML;
        
        // Add click handlers and hover effects to chat items
        document.querySelectorAll('.aikd-chat-item').forEach(item => {
          const hoverBg = item.getAttribute('data-hover-bg');
          const normalBg = item.getAttribute('data-normal-bg');
          
          item.addEventListener('mouseenter', () => {
            item.style.background = hoverBg;
          });
          
          item.addEventListener('mouseleave', () => {
            item.style.background = normalBg;
          });
          
          item.addEventListener('click', () => {
            const chatId = item.getAttribute('data-chat-id');
            loadSpecificChat(chatId);
          });
        });
        
      } else {
        throw new Error('Failed to load chats');
      }
    } catch (error) {
      console.error('Error loading all chats:', error);
      chatsListContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: ${isDarkMode ? '#9ca3af' : '#6b7280'};">
          <div style="margin-bottom: 8px;">⚠️</div>
          <div>Failed to load chat history</div>
          <div style="font-size: 12px; margin-top: 8px;">Please try again later</div>
        </div>
      `;
    }
  }

  function loadSpecificChat(specificChatId) {
    chatId = specificChatId;
    saveUserSession();
    showingAllChats = false;
    showingChatHistory = false;
    loadChatHistory();
  }

  function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  }

  function deduplicateMessages(messages) {
    if (!messages || messages.length === 0) return messages;
    
    const deduplicated = [];
    let lastBotMessage = null;
    
    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i];
      
      // Always keep user messages
      if (currentMessage.type === 'user') {
        deduplicated.push(currentMessage);
        lastBotMessage = null;
        continue;
      }
      
      // For bot messages, check if it's a duplicate
      if (currentMessage.type === 'bot') {
        const isDuplicate = lastBotMessage && 
          lastBotMessage.type === 'bot' && 
          lastBotMessage.content === currentMessage.content &&
          Math.abs((lastBotMessage.timestamp || 0) - (currentMessage.timestamp || 0)) < 5000; // Within 5 seconds
        
        if (!isDuplicate) {
          deduplicated.push(currentMessage);
          lastBotMessage = currentMessage;
        } else {
          console.log('Removing duplicate bot message:', currentMessage.content);
        }
      }
    }
    
    return deduplicated;
  }

  function showSettings() {
    const messagesContainer = document.getElementById('aikd-messages');
    const inputContainer = document.getElementById('aikd-input-container');
    
    if (!messagesContainer) return;
    
    showingChatHistory = false;
    showingAllChats = false;
    messagesContainer.innerHTML = createSettingsView();
    inputContainer.style.display = 'none';
    setupSettingsView();
  }

  function createSettingsView() {
    return `
      <div style="padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="margin: 0; color: ${isDarkMode ? '#f9fafb' : '#1f2937'}; font-size: 16px; font-weight: 600;">
            Settings
          </h3>
          <button
            id="aikd-back-from-settings-btn"
            style="
              background: none;
              border: none;
              color: ${config.primaryColor};
              font-size: 12px;
              cursor: pointer;
              text-decoration: underline;
              padding: 4px 8px;
            "
          >
            ← Back
          </button>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="margin-bottom: 12px;">
            <label style="
              display: block;
              color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 6px;
            ">
              Current User
            </label>
            <div style="
              padding: 12px;
              background: ${isDarkMode ? '#374151' : '#f3f4f6'};
              border-radius: 8px;
              border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
            ">
              <div style="color: ${isDarkMode ? '#f9fafb' : '#1f2937'}; font-weight: 500;">${userInfo.name}</div>
              <div style="color: ${isDarkMode ? '#9ca3af' : '#6b7280'}; font-size: 12px;">${userInfo.email}</div>
            </div>
          </div>
          <button
            id="aikd-change-user-settings-btn"
            style="
              width: 100%;
              background: ${isDarkMode ? '#374151' : '#f3f4f6'};
              color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
              border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
              padding: 10px 12px;
              border-radius: 6px;
              font-size: 13px;
              cursor: pointer;
              transition: all 0.2s;
            "
          >
            🔄 Change User
          </button>
        </div>
        <div style="margin-bottom: 16px;">
          <div style="margin-bottom: 12px;">
            <label style="
              display: block;
              color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 6px;
            ">
              Theme
            </label>
            <button
              id="aikd-theme-settings-btn"
              style="
                width: 100%;
                background: ${isDarkMode ? '#374151' : '#f3f4f6'};
                color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
                border: 1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
                padding: 10px 12px;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
              "
            >
              ${isDarkMode ? '🌙' : '☀️'} ${isDarkMode ? 'Dark' : 'Light'} Mode
            </button>
          </div>
        </div>
        <div style="margin-bottom: 16px;">
          <button
            id="aikd-clear-all-data-btn"
            style="
              width: 100%;
              background: #ef4444;
              color: white;
              border: none;
              padding: 10px 12px;
              border-radius: 6px;
              font-size: 13px;
              cursor: pointer;
              transition: all 0.2s;
            "
          >
            🗑️ Clear All Data
          </button>
        </div>
      </div>
    `;
  }

  function setupSettingsView() {
    const backBtn = document.getElementById('aikd-back-from-settings-btn');
    const changeUserBtn = document.getElementById('aikd-change-user-settings-btn');
    const themeBtn = document.getElementById('aikd-theme-settings-btn');
    const clearDataBtn = document.getElementById('aikd-clear-all-data-btn');
    
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        showingChatHistory = true;
        showingAllChats = false;
        const messagesContainer = document.getElementById('aikd-messages');
        const inputContainer = document.getElementById('aikd-input-container');
        messagesContainer.innerHTML = createChatHistoryView();
        inputContainer.style.display = 'none';
        setupChatHistoryView();
      });
    }
    
    if (changeUserBtn) {
      changeUserBtn.addEventListener('click', () => {
        clearUserSession();
        updateChatContent();
      });
    }
    
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        toggleTheme();
        // Update the theme button text
        themeBtn.innerHTML = `${isDarkMode ? '🌙' : '☀️'} ${isDarkMode ? 'Dark' : 'Light'} Mode`;
      });
    }
    
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all your chat data? This action cannot be undone.')) {
          clearUserSession();
          localStorage.removeItem(getStorageKey());
          updateChatContent();
        }
      });
    }
  }

  function addMessage(type, content) {
    // Check for duplicate bot messages before adding
    if (type === 'bot') {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && 
          lastMessage.type === 'bot' && 
          lastMessage.content === content &&
          Date.now() - lastMessage.timestamp < 5000) { // Within 5 seconds
        console.log('Preventing duplicate bot message:', content);
        return; // Don't add duplicate
      }
    }
    
    addMessageToDOM(type, content);
    
    // Store message in array
    const message = { type, content, timestamp: Date.now() };
    messages.push(message);
    
    // Save to database if this is a real conversation
    if (!showingChatHistory && userInfo && chatId) {
      saveChatMessage(message);
    }
  }

  function addMessageToDOM(type, content) {
    const messagesContainer = document.getElementById('aikd-messages');
    if (!messagesContainer) {
      console.warn('Messages container not found');
      return;
    }

    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
      display: flex;
      ${type === 'user' ? 'justify-content: flex-end' : 'justify-content: flex-start'};
      margin-bottom: 8px;
    `;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      word-wrap: break-word;
      overflow-wrap: break-word;
      ${type === 'user' 
        ? `background: ${config.primaryColor}; color: white;`
        : `background: ${isDarkMode ? '#374151' : '#f3f4f6'}; color: ${isDarkMode ? '#f9fafb' : '#1f2937'};`
      }
    `;

    // Render markdown for bot messages, plain text for user messages
    if (type === 'bot' && containsMarkdown(content)) {
      bubble.innerHTML = markdownToHTML(content);
    } else {
      bubble.textContent = content;
    }

    messageEl.appendChild(bubble);
    messagesContainer.appendChild(messageEl);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    console.log('Message added to DOM:', type, content);
  }

  async function saveChatMessage(message) {
    try {
      await fetch(`${BASE_URL}/api/public/live-chat/save-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: config.uid,
          selectedCompany: config.selectedCompany,
          chatId: chatId,
          userInfo: userInfo,
          message: message
        })
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  function showTypingIndicator() {
    if (isTyping) return;
    isTyping = true;

    const messagesContainer = document.getElementById('aikd-messages');
    if (!messagesContainer) return;

    const typingEl = document.createElement('div');
    typingEl.id = 'aikd-typing-indicator';
    typingEl.style.cssText = `
      display: flex;
      justify-content: flex-start;
      margin-bottom: 8px;
    `;

    typingEl.innerHTML = `
      <div style="background: ${isDarkMode ? '#374151' : '#f3f4f6'}; color: ${isDarkMode ? '#f9fafb' : '#1f2937'}; padding: 8px 12px; border-radius: 12px; max-width: 75%;">
        <div style="display: flex; gap: 4px;">
          <div style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: aikd-bounce 1.4s infinite both;"></div>
          <div style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: aikd-bounce 1.4s infinite both; animation-delay: 0.1s;"></div>
          <div style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: aikd-bounce 1.4s infinite both; animation-delay: 0.2s;"></div>
        </div>
      </div>
    `;

    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add bounce animation
    if (!document.getElementById('aikd-bounce-style')) {
      const style = document.createElement('style');
      style.id = 'aikd-bounce-style';
      style.textContent = `
        @keyframes aikd-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  function hideTypingIndicator() {
    isTyping = false;
    const typingEl = document.getElementById('aikd-typing-indicator');
    if (typingEl) {
      typingEl.remove();
    }
  }

  async function sendToAI(message) {
    if (!config.uid || !config.selectedCompany) {
      addMessage('bot', 'Sorry, the chat configuration is incomplete. Please contact support.');
      return;
    }

    if (!userInfo || !chatId) {
      addMessage('bot', 'Sorry, your session is invalid. Please refresh the page.');
      return;
    }

    // Prevent duplicate calls
    if (window.aikdSendingMessage) {
      console.log('Already sending message, ignoring duplicate call');
      return;
    }
    window.aikdSendingMessage = true;

    showTypingIndicator();

    try {
      // Build conversation history in the format expected by the API
      const conversationMessages = messages.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add current message
      conversationMessages.push({
        role: 'user',
        content: message
      });

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: config.uid,
          companyId: config.selectedCompany,
          employee: 'marquavious', // Live chat uses Marquavious
          messages: conversationMessages,
          context: {
            customerName: userInfo.name,
            customerEmail: userInfo.email,
            sessionId: sessionId,
          },
          maxSearchIterations: 5,
          temperature: 0.7,
          includeMetadata: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      hideTypingIndicator();
      
      if (data.success && data.data && data.data.response) {
        // Add the AI response to the UI
        // addMessage will handle saving to Firebase
        addMessage('bot', data.data.response);
      } else {
        console.error('Unexpected response format:', data);
        addMessage('bot', "Sorry, I couldn't process your message right now. Please try again.");
      }
    } catch (error) {
      console.error('Live chat error:', error);
      hideTypingIndicator();
      addMessage('bot', 'Sorry, there was a connection issue. Please try again.');
    } finally {
      window.aikdSendingMessage = false;
    }
  }

  function toggleTheme() {
    isDarkMode = !isDarkMode;
    
    // Update chat window background
    const chatWindow = document.getElementById('aikd-chat-window');
    if (chatWindow) {
      chatWindow.style.background = isDarkMode ? '#1f2937' : '#ffffff';
      chatWindow.style.borderColor = isDarkMode ? '#374151' : '#e5e7eb';
    }
    
    // Update input container
    const inputContainer = document.getElementById('aikd-input-container');
    if (inputContainer) {
      inputContainer.style.background = isDarkMode ? '#1f2937' : '#ffffff';
      inputContainer.style.borderTopColor = isDarkMode ? '#374151' : '#e5e7eb';
    }
    
    // Update input field
    const input = inputContainer?.querySelector('input');
    if (input) {
      input.style.background = isDarkMode ? '#374151' : '#ffffff';
      input.style.color = isDarkMode ? '#f9fafb' : '#1f2937';
      input.style.borderColor = isDarkMode ? '#4b5563' : '#d1d5db';
    }
    
    // Update existing messages
    const messages = document.querySelectorAll('#aikd-messages > div');
    messages.forEach(msgEl => {
      const bubble = msgEl.querySelector('div');
      if (bubble && !bubble.style.background.includes(config.primaryColor)) {
        bubble.style.background = isDarkMode ? '#374151' : '#f3f4f6';
        bubble.style.color = isDarkMode ? '#f9fafb' : '#1f2937';
        
        // Update code blocks in markdown content
        const codeBlocks = bubble.querySelectorAll('pre');
        codeBlocks.forEach(block => {
          block.style.background = isDarkMode ? '#374151' : '#f3f4f6';
          block.style.borderColor = isDarkMode ? '#4b5563' : '#d1d5db';
        });
        
        // Update blockquotes in markdown content
        const blockquotes = bubble.querySelectorAll('blockquote');
        blockquotes.forEach(quote => {
          quote.style.borderLeftColor = isDarkMode ? '#4b5563' : '#d1d5db';
          quote.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
        });
        
        // Update inline code in markdown content
        const inlineCode = bubble.querySelectorAll('code:not(pre code)');
        inlineCode.forEach(code => {
          code.style.background = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        });
      }
    });
    
    // Update theme toggle icon
    const themeToggle = document.getElementById('aikd-theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = isDarkMode ? 
        `<svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>` :
        `<svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
        </svg>`;
    }
  }

  function toggleMenu() {
    const existingMenu = document.getElementById('aikd-menu-dropdown');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const menuBtn = document.getElementById('aikd-menu-btn');
    if (!menuBtn) return;

    const menuDropdown = document.createElement('div');
    menuDropdown.id = 'aikd-menu-dropdown';
    menuDropdown.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      background: ${isDarkMode ? '#1f2937' : '#ffffff'};
      border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      min-width: 160px;
      padding: 8px 0;
      margin-top: 4px;
    `;

    const menuItems = [
      { text: '📋 View All Chats', action: () => showAllChats() },
      { text: '⚙️ Settings', action: () => showSettings() },
      { text: '🔄 Change User', action: () => { clearUserSession(); updateChatContent(); } },
      { text: '🗑️ Clear Data', action: () => { 
        if (confirm('Clear all chat data?')) {
          clearUserSession();
          localStorage.removeItem(getStorageKey());
          updateChatContent();
        }
      }}
    ];

    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.style.cssText = `
        padding: 8px 16px;
        color: ${isDarkMode ? '#f9fafb' : '#1f2937'};
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      `;
      menuItem.textContent = item.text;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = isDarkMode ? '#374151' : '#f3f4f6';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent';
      });
      
      menuItem.addEventListener('click', () => {
        item.action();
        menuDropdown.remove();
      });
      
      menuDropdown.appendChild(menuItem);
    });

    // Position the menu relative to the menu button
    const rect = menuBtn.getBoundingClientRect();
    menuDropdown.style.top = `${rect.bottom + 4}px`;
    menuDropdown.style.right = '8px';

    document.body.appendChild(menuDropdown);

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menuDropdown.contains(e.target) && !menuBtn.contains(e.target)) {
        menuDropdown.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  // Public API
  window.AikdLiveChat = {
    open: () => {
      if (!isOpen) toggleChat();
    },
    close: () => {
      if (isOpen) toggleChat();
    },
    toggle: toggleChat,
    toggleTheme: toggleTheme,
    sendMessage: (message) => {
      if (message) {
        addMessage('user', message);
        sendToAI(message);
      }
    }
  };

  // Initialize when DOM is ready
  async function initializeLiveChat() {
    const configLoaded = await loadConfiguration();
    if (configLoaded) {
      createChatWidget();
    } else {
      console.error('Failed to load live chat configuration. Widget will not be displayed.');
    }
  }



  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLiveChat);
  } else {
    initializeLiveChat();
  }

})();

