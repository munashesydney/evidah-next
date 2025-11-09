'use client';

import { useState } from 'react';
import Sidebar from './sidebar';
import Header from './header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden [&:has([data-chat-page])]:overflow-hidden">
        {/* Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow [&>*:first-child]:scroll-mt-16 [&:has([data-chat-page])]:h-[calc(100%-4rem)] [&:has([data-chat-page])]:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
