'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import {
  Cog6ToothIcon,
  PaintBrushIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

export default function SettingsSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;

  const isActive = (path: string) => pathname?.includes(path);
  const isLiveChatActive = 
    pathname?.includes('/settings/live-chat/basic') ||
    pathname?.includes('/settings/live-chat/appearance') ||
    pathname?.includes('/settings/live-chat/content') ||
    pathname?.includes('/settings/live-chat/features') ||
    pathname?.includes('/settings/live-chat/advanced') ||
    pathname === `/${selectedCompany}/settings/live-chat`;
  
  // Auto-expand Live Chat dropdown if on any live-chat page
  const [liveChatExpanded, setLiveChatExpanded] = useState(isLiveChatActive);

  useEffect(() => {
    if (isLiveChatActive) {
      setLiveChatExpanded(true);
    }
  }, [isLiveChatActive]);

  return (
    <div className="flex flex-nowrap overflow-x-scroll no-scrollbar md:block md:overflow-auto px-3 py-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700/60 min-w-[15rem] md:space-y-3">
      {/* Group 1 */}
      <div>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-3">Business settings</div>
        <ul className="flex flex-nowrap md:block mr-3 md:mr-0">
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/settings/account`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/settings/account') 
                  ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/settings/account') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
              >
                <path d="M8 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5.143 7.91a1 1 0 1 1-1.714-1.033A7.996 7.996 0 0 1 8 10a7.996 7.996 0 0 1 6.857 3.877 1 1 0 1 1-1.714 1.032A5.996 5.996 0 0 0 8 12a5.996 5.996 0 0 0-5.143 2.91Z" />
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/settings/account') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                My Account
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/settings/agents`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/settings/agents') 
                  ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : ''
              }`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/settings/agents') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="17" 
                height="17" 
                viewBox="0 0 24 24"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/settings/agents') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Agents
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/settings/emails`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/settings/emails') 
                  ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/settings/emails') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="17" 
                height="17" 
                viewBox="0 0 24 24"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/settings/emails') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Custom Emails
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/settings/knowledge-base`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/settings/knowledge-base') 
                  ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/settings/knowledge-base') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
              >
                <path d="M8 3.414V6a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1h5a1 1 0 0 1 0 2H9.414l6.293 6.293a1 1 0 1 1-1.414 1.414L8 3.414Zm0 9.172V10a1 1 0 1 1 2 0v5a1 1 0 0 1-1 1H4a1 1 0 0 1 0-2h2.586L.293 7.707a1 1 0 0 1 1.414-1.414L8 12.586Z" />
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/settings/knowledge-base') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Knowledge Base
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/settings/helpdesk`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/settings/helpdesk')
                  ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/settings/helpdesk')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <path d="M11.92 6.851c.044-.027.09-.05.137-.07.481-.275.758-.68.908-1.256.126-.55.169-.81.357-2.058.075-.498.144-.91.217-1.264-4.122.75-7.087 2.984-9.12 6.284a18.087 18.087 0 0 0-1.985 4.585 17.07 17.07 0 0 0-.354 1.506c-.05.265-.076.448-.086.535a1 1 0 0 1-1.988-.226c.056-.49.209-1.312.502-2.357a20.063 20.063 0 0 1 2.208-5.09C5.31 3.226 9.306.494 14.913.004a1 1 0 0 1 .954 1.494c-.237.414-.375.993-.567 2.267-.197 1.306-.244 1.586-.392 2.235-.285 1.094-.789 1.853-1.552 2.363-.748 3.816-3.976 5.06-8.515 4.326a1 1 0 0 1 .318-1.974c2.954.477 4.918.025 5.808-1.556-.628.085-1.335.121-2.127.121a1 1 0 1 1 0-2c1.458 0 2.434-.116 3.08-.429Z" />
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/settings/helpdesk')
                    ? 'text-violet-500 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Help Desk
              </span>
            </Link>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <div className={isLiveChatActive ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04] rounded-lg' : ''}>
              <button
                onClick={() => setLiveChatExpanded(!liveChatExpanded)}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg whitespace-nowrap"
              >
                <div className="flex items-center">
                  <svg 
                    className={`shrink-0 fill-current mr-2 ${
                      isLiveChatActive 
                        ? 'text-violet-500 dark:text-violet-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`} 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16"
                  >
                    <path d="M8 0C3.6 0 0 3.1 0 7s3.6 7 8 7h.6l5.4 2v-4.4c1.2-1.2 2-2.8 2-4.6 0-3.9-3.6-7-8-7zm4 10.8v2.3L8.9 12H8c-3.3 0-6-2.2-6-5s2.7-5 6-5 6 2.2 6 5c0 1.7-1 3.2-2 4.8z"/>
                  </svg>
                  <span 
                    className={`text-sm font-medium ${
                      isLiveChatActive 
                        ? 'text-violet-500 dark:text-violet-400' 
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    Live Chat
                  </span>
                </div>
                {liveChatExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                )}
              </button>
              {liveChatExpanded && (
                <ul className="ml-6 mt-1 space-y-0.5">
                  <li>
                    <Link
                      href={`/${selectedCompany}/settings/live-chat/basic`}
                      className="flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap"
                    >
                      <Cog6ToothIcon
                        className={`shrink-0 mr-2 ${
                          pathname?.endsWith('/live-chat/basic')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                        width="16"
                        height="16"
                      />
                      <span
                        className={`text-sm font-medium ${
                          pathname?.endsWith('/live-chat/basic')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Basic Settings
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${selectedCompany}/settings/live-chat/appearance`}
                      className="flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap"
                    >
                      <PaintBrushIcon
                        className={`shrink-0 mr-2 ${
                          pathname?.endsWith('/live-chat/appearance')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                        width="16"
                        height="16"
                      />
                      <span
                        className={`text-sm font-medium ${
                          pathname?.endsWith('/live-chat/appearance')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Appearance
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${selectedCompany}/settings/live-chat/content`}
                      className="flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap"
                    >
                      <ChatBubbleLeftRightIcon
                        className={`shrink-0 mr-2 ${
                          pathname?.endsWith('/live-chat/content')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                        width="16"
                        height="16"
                      />
                      <span
                        className={`text-sm font-medium ${
                          pathname?.endsWith('/live-chat/content')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Content
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${selectedCompany}/settings/live-chat/features`}
                      className="flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap"
                    >
                      <SparklesIcon
                        className={`shrink-0 mr-2 ${
                          pathname?.endsWith('/live-chat/features')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                        width="16"
                        height="16"
                      />
                      <span
                        className={`text-sm font-medium ${
                          pathname?.endsWith('/live-chat/features')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Features
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${selectedCompany}/settings/live-chat/advanced`}
                      className="flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap"
                    >
                      <WrenchScrewdriverIcon
                        className={`shrink-0 mr-2 ${
                          pathname?.endsWith('/live-chat/advanced')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                        width="16"
                        height="16"
                      />
                      <span
                        className={`text-sm font-medium ${
                          pathname?.endsWith('/live-chat/advanced')
                            ? 'text-violet-500 dark:text-violet-400'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Advanced
                      </span>
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          </li>
          <li className="mr-0.5 md:mr-0 md:mb-0.5">
            <Link 
              href={`/${selectedCompany}/settings/plans`}
              className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                isActive('/settings/plans') 
                  ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]' 
                  : ''
              }`}
            >
              <svg 
                className={`shrink-0 fill-current mr-2 ${
                  isActive('/settings/plans') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} 
                width="16" 
                height="16" 
                viewBox="0 0 16 16"
              >
                <path d="M5 9a1 1 0 1 1 0-2h6a1 1 0 0 1 0 2H5ZM1 4a1 1 0 1 1 0-2h14a1 1 0 0 1 0 2H1Zm0 10a1 1 0 0 1 0-2h14a1 1 0 0 1 0 2H1Z" />
              </svg>
              <span 
                className={`text-sm font-medium ${
                  isActive('/settings/plans') 
                    ? 'text-violet-500 dark:text-violet-400' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                Addons
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

