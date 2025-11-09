'use client';

import { useState } from 'react';
import Image from 'next/image';
import SearchModal from '@/components/search-modal';
import DropdownHelp from '@/components/dropdown-help';
import ThemeToggle from '@/components/theme-toggle';
import DropdownProfile from '@/components/dropdown-profile';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  return (
    <header className="sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md before:bg-gray-50/90 dark:before:bg-[#151D2C]/90 before:-z-10 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700/60">
          {/* Header: Left side */}
          <div className="flex">
            {/* Hamburger button */}
            <button
              className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="w-6 h-6 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-3">
            <div>
              <button
                className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 lg:hover:bg-gray-200 dark:hover:bg-gray-700/50 dark:lg:hover:bg-gray-800 rounded-full ml-3 ${
                  searchModalOpen && 'bg-gray-200 dark:bg-gray-800'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchModalOpen(true);
                }}
                aria-controls="search-modal"
              >
                <span className="sr-only">Search</span>
                <svg
                  className="fill-current text-gray-500/80 dark:text-gray-400/80"
                  width={16}
                  height={16}
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7ZM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5Z" />
                  <path d="m13.314 11.9 2.393 2.393a.999.999 0 1 1-1.414 1.414L11.9 13.314a8.019 8.019 0 0 0 1.414-1.414Z" />
                </svg>
              </button>
              <SearchModal isOpen={searchModalOpen} setIsOpen={setSearchModalOpen} />
            </div>
            <DropdownHelp align="right" />
            <ThemeToggle />
            {/* Divider */}
            <hr className="w-px h-6 bg-gray-200 dark:bg-gray-700/60 border-none" />
            <DropdownProfile align="right" />
          </div>
        </div>
      </div>
    </header>
  );
}
