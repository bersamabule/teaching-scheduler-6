'use client';

import { useState, useEffect } from 'react';
import { supabaseService } from '@/lib/supabase/service';

interface FallbackIndicatorProps {
  position?: 'top' | 'inline';
  showDetails?: boolean;
  className?: string;
}

/**
 * FallbackIndicator component
 * Displays a visual indicator when the application is using fallback data instead of live data
 */
export default function FallbackIndicator({ 
  position = 'inline', 
  showDetails = false,
  className = '' 
}: FallbackIndicatorProps) {
  const [isOffline, setIsOffline] = useState<boolean>(supabaseService.isOffline());
  const [expanded, setExpanded] = useState<boolean>(false);

  // Listen for connection status changes
  useEffect(() => {
    const observer = {
      onConnectionStatusChanged: () => {
        setIsOffline(supabaseService.isOffline());
      }
    };

    supabaseService.addObserver(observer);
    return () => {
      supabaseService.removeObserver(observer);
    };
  }, []);

  // Don't render anything if we're online
  if (!isOffline) {
    return null;
  }

  // Position-specific styling
  const styles = position === 'top' 
    ? 'w-full px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-800' 
    : 'inline-flex items-center px-2 py-1 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded';

  return (
    <div className={`${styles} ${className}`}>
      <div className="flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="font-medium text-xs">
          Using Fallback Data
        </div>
        {showDetails && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="ml-2 text-amber-700 hover:text-amber-900"
            aria-label={expanded ? "Hide details" : "Show details"}
          >
            <svg className={`h-3.5 w-3.5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      
      {showDetails && expanded && (
        <div className="mt-1.5 text-xs text-amber-700 max-w-md pl-5">
          <p>The application is currently using local fallback data because it cannot connect to the Supabase database.</p>
          <div className="mt-1 flex space-x-2">
            <button 
              onClick={() => supabaseService.reconnect()}
              className="px-2 py-0.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300"
            >
              Reconnect
            </button>
            <button 
              onClick={() => setExpanded(false)}
              className="px-2 py-0.5 text-xs bg-white hover:bg-gray-50 text-gray-600 rounded border border-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 