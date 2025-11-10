'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Cog6ToothIcon,
  PaintBrushIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

export default function LiveChatSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;

  const isActive = (path: string) => pathname?.endsWith(path);

  const navItems = [
    { path: '/basic', label: 'Basic Settings', icon: Cog6ToothIcon },
    { path: '/appearance', label: 'Appearance', icon: PaintBrushIcon },
    { path: '/content', label: 'Content', icon: ChatBubbleLeftRightIcon },
    { path: '/features', label: 'Features', icon: SparklesIcon },
    { path: '/advanced', label: 'Advanced', icon: WrenchScrewdriverIcon },
  ];

  return (
    <div className="flex flex-nowrap overflow-x-scroll no-scrollbar md:block md:overflow-auto px-3 py-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700/60 min-w-[12rem] md:space-y-3">
      <div>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-3">Configuration</div>
        <ul className="flex flex-nowrap md:block mr-3 md:mr-0">
          {navItems.map((item) => (
            <li key={item.path} className="mr-0.5 md:mr-0 md:mb-0.5">
              <Link
                href={`/${selectedCompany}/settings/live-chat${item.path}`}
                className={`flex items-center px-2.5 py-2 rounded-lg whitespace-nowrap ${
                  isActive(item.path)
                    ? 'bg-linear-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04]'
                    : ''
                }`}
              >
                <item.icon
                  className={`shrink-0 mr-2 ${
                    isActive(item.path)
                      ? 'text-violet-500 dark:text-violet-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  width="16"
                  height="16"
                />
                <span
                  className={`text-sm font-medium ${
                    isActive(item.path)
                      ? 'text-violet-500 dark:text-violet-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

