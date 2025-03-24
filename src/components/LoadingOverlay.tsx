'use client';

import React from 'react';
import LoadingIndicator from './LoadingIndicator';

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  transparent?: boolean;
  children: React.ReactNode;
  position?: 'fixed' | 'absolute';
  minHeight?: string;
  className?: string;
}

/**
 * LoadingOverlay component
 * Displays content with a loading overlay when isLoading is true
 */
export default function LoadingOverlay({
  isLoading,
  text = 'Loading...',
  transparent = false,
  children,
  position = 'absolute',
  minHeight = '12rem',
  className = ''
}: LoadingOverlayProps) {
  return (
    <div className={`relative ${minHeight && `min-h-[${minHeight}]`} ${className}`}>
      {children}
      
      {isLoading && (
        <div 
          className={`
            ${position} inset-0 z-10 flex items-center justify-center
            ${transparent ? 'bg-white/70' : 'bg-white/90'} 
            backdrop-blur-[1px] transition-all duration-200
          `}
        >
          <LoadingIndicator 
            type="spinner" 
            size="medium" 
            text={text} 
          />
        </div>
      )}
    </div>
  );
} 