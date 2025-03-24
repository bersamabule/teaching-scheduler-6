'use client';

import React, { useEffect, useState } from 'react';
import { supabaseService } from '@/lib/supabase/service';
import { ConnectionStatus } from '@/lib/supabase/service';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * Component that displays the current Supabase connection status
 * with appropriate visual indicators.
 */
const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = false,
  className = ''
}) => {
  const [status, setStatus] = useState<ConnectionStatus>(supabaseService.getStatus());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  useEffect(() => {
    // Register as an observer to get status updates
    const observer = {
      onConnectionStatusChanged: (newStatus: ConnectionStatus, error?: Error) => {
        setStatus(newStatus);
        setErrorMessage(error ? error.message : null);
        setLastUpdated(new Date());
      }
    };
    
    // Register with the service
    supabaseService.addObserver(observer);
    
    // Initial status check
    const currentStatus = supabaseService.getStatus();
    setStatus(currentStatus);
    
    // Cleanup on unmount
    return () => {
      supabaseService.removeObserver(observer);
    };
  }, []);
  
  // Define colors based on status
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Get text indicator
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };
  
  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };
  
  // Render the indicator
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`h-3 w-3 rounded-full ${getStatusColor()} mr-2`}></div>
      
      {showDetails ? (
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="font-medium">{getStatusText()}</span>
            <span className="text-xs text-gray-500 ml-2">
              ({formatTime(lastUpdated)})
            </span>
          </div>
          
          {errorMessage && status === 'error' && (
            <span className="text-xs text-red-600 mt-1 max-w-xs truncate" title={errorMessage}>
              {errorMessage.length > 50 ? `${errorMessage.substring(0, 50)}...` : errorMessage}
            </span>
          )}
          
          {status === 'disconnected' && (
            <span className="text-xs text-gray-600 mt-1">
              Using fallback data
            </span>
          )}
          
          {status === 'connecting' && (
            <span className="text-xs text-gray-600 mt-1">
              Attempting to connect...
            </span>
          )}
        </div>
      ) : (
        <span className="text-sm">{getStatusText()}</span>
      )}
      
      {/* Optional retry button for error states */}
      {(status === 'error' || status === 'disconnected') && (
        <button 
          onClick={() => supabaseService.reconnect()}
          className="ml-3 text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded transition-colors"
          title="Attempt to reconnect to the Supabase database"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator; 