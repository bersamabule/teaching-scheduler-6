'use client';

import React from 'react';
import Link from 'next/link';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-indigo-600">
                  Teaching Scheduler 6
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link 
                  href="/explorer" 
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Database Explorer
                </Link>
                <Link 
                  href="/schedule" 
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Schedule
                </Link>
                {process.env.NODE_ENV !== 'production' && (
                  <button
                    onClick={() => {
                      // Trigger the keyboard shortcut for ConsoleMonitor
                      if (typeof window !== 'undefined') {
                        const event = new KeyboardEvent('keydown', {
                          key: 'd',
                          ctrlKey: true,
                          altKey: true,
                          bubbles: true
                        });
                        window.dispatchEvent(event);
                      }
                    }}
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Debug Console
                  </button>
                )}
              </div>
            </div>
            
            {/* Add connection status indicator */}
            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <ConnectionStatusIndicator showDetails />
              </div>
            </div>
          </div>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Teaching Scheduler 6
          </p>
        </div>
      </footer>
    </div>
  );
} 