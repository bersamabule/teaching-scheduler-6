'use client';

import { useEffect } from 'react';

// Component to initialize console monitoring
export default function ConsoleMonitor() {
  useEffect(() => {
    // Only load in development and in the browser
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      import('@/lib/mcp/console-monitor').then(() => {
        console.log('[MCP] Console monitoring active');
      }).catch(err => {
        console.error('[MCP] Failed to initialize console monitoring:', err);
      });
    }
  }, []);
  
  // This component doesn't render anything
  return null;
} 