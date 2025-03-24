'use client';

import { useState, useEffect } from 'react';
import { supabaseService } from '@/lib/supabase/service';

interface SynchronizationIndicatorProps {
  position?: 'top' | 'inline';
  className?: string;
}

/**
 * SynchronizationIndicator component
 * Displays a visual indicator when data is being synchronized after reconnection
 */
export default function SynchronizationIndicator({ 
  position = 'inline', 
  className = '' 
}: SynchronizationIndicatorProps) {
  const [isSynchronizing, setIsSynchronizing] = useState<boolean>(false);
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [completionTimer, setCompletionTimer] = useState<NodeJS.Timeout | null>(null);

  // Listen for synchronization events
  useEffect(() => {
    const observer = {
      onConnectionStatusChanged: () => {},
      onSynchronizationStart: () => {
        setIsSynchronizing(true);
        setShowCompleted(false);
        
        // Clear any existing completion timer
        if (completionTimer) {
          clearTimeout(completionTimer);
          setCompletionTimer(null);
        }
      },
      onSynchronizationComplete: () => {
        setIsSynchronizing(false);
        setShowCompleted(true);
        
        // Hide the completion message after 5 seconds
        const timer = setTimeout(() => {
          setShowCompleted(false);
        }, 5000);
        
        setCompletionTimer(timer);
      }
    };

    supabaseService.addObserver(observer);
    return () => {
      supabaseService.removeObserver(observer);
      if (completionTimer) {
        clearTimeout(completionTimer);
      }
    };
  }, [completionTimer]);

  // Don't render anything if no synchronization is happening or was recently completed
  if (!isSynchronizing && !showCompleted) {
    return null;
  }

  // Position-specific styling
  const styles = position === 'top' 
    ? 'w-full px-3 py-2 border-b text-sm' 
    : 'inline-flex items-center px-2 py-1 text-xs rounded';

  // Status-specific styling
  const statusStyles = isSynchronizing
    ? 'bg-blue-50 border-blue-200 text-blue-800'
    : 'bg-green-50 border-green-200 text-green-800';

  return (
    <div className={`${styles} ${statusStyles} ${className}`}>
      <div className="flex items-center gap-1.5">
        {isSynchronizing ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-blue-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="font-medium">
              Synchronizing data...
            </div>
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="font-medium">
              Data synchronized successfully
            </div>
          </>
        )}
      </div>
    </div>
  );
} 