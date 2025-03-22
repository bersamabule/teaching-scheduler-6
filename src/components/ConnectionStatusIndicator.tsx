'use client';

import { useState, useEffect } from 'react';
import { supabaseService, ConnectionStatus, ConnectionObserver } from '@/lib/supabase/service';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export default function ConnectionStatusIndicator({ 
  showDetails = false, 
  className = '' 
}: ConnectionStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>(supabaseService.getStatus());
  const [error, setError] = useState<string | undefined>();
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    // Create observer object
    const observer: ConnectionObserver = {
      onConnectionStatusChanged: (newStatus, newError) => {
        setStatus(newStatus);
        setError(newError?.message);
      }
    };
    
    // Register observer
    supabaseService.addObserver(observer);
    
    // Initial status check
    setStatus(supabaseService.getStatus());
    setError(supabaseService.getLastError()?.message);
    
    // Cleanup
    return () => {
      supabaseService.removeObserver(observer);
    };
  }, []);
  
  // Get status-specific styles
  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };
  
  const handleReconnect = async () => {
    try {
      await supabaseService.reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      {/* Simple indicator */}
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <div 
          className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(status)}`} 
          title={getStatusText(status)}
        />
        {showDetails && (
          <span className="text-xs font-medium">{getStatusText(status)}</span>
        )}
      </div>
      
      {/* Expanded details panel */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 bg-white shadow-lg rounded-md p-3 z-50 w-64">
          <div className="flex items-center mb-2">
            <div className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(status)}`} />
            <span className="font-medium">{getStatusText(status)}</span>
          </div>
          
          {error && (
            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          <div className="text-xs text-gray-500 mb-2">
            {status === 'connected' ? (
              'Supabase connection is healthy.'
            ) : status === 'connecting' ? (
              'Establishing connection to Supabase...'
            ) : status === 'disconnected' ? (
              'Not connected to Supabase. Some features may use fallback data.'
            ) : (
              'Connection error. The application will use fallback data where available.'
            )}
          </div>
          
          {(status === 'disconnected' || status === 'error') && (
            <button
              onClick={handleReconnect}
              className="w-full text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
} 