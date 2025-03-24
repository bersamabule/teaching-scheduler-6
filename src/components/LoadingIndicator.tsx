'use client';

import React from 'react';

interface LoadingIndicatorProps {
  type?: 'spinner' | 'pulse' | 'dots';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

/**
 * LoadingIndicator component
 * Displays a visual loading indicator with optional text
 */
export default function LoadingIndicator({
  type = 'spinner',
  size = 'medium',
  text,
  fullScreen = false,
  overlay = false,
  className = ''
}: LoadingIndicatorProps) {
  // Size classes for different components
  const sizeClasses = {
    small: {
      container: 'px-2 py-1',
      spinner: 'h-4 w-4',
      pulse: 'h-4 w-4',
      dots: 'h-1 w-1 mx-0.5',
      text: 'text-xs ml-2'
    },
    medium: {
      container: 'px-3 py-2',
      spinner: 'h-6 w-6',
      pulse: 'h-6 w-6',
      dots: 'h-2 w-2 mx-1',
      text: 'text-sm ml-3'
    },
    large: {
      container: 'px-4 py-3',
      spinner: 'h-8 w-8',
      pulse: 'h-8 w-8',
      dots: 'h-3 w-3 mx-1.5',
      text: 'text-base ml-4'
    }
  };

  // Container classes based on props
  const containerClasses = `
    flex items-center justify-center
    ${fullScreen ? 'fixed inset-0 z-50' : 'inline-flex'}
    ${overlay ? 'bg-white bg-opacity-75' : ''}
    ${sizeClasses[size].container}
    ${className}
  `;

  // Render spinner
  const renderSpinner = () => (
    <svg 
      className={`animate-spin ${sizeClasses[size].spinner} text-indigo-600`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // Render pulse
  const renderPulse = () => (
    <div className={`${sizeClasses[size].pulse} rounded-full bg-indigo-600 opacity-75 animate-pulse`}></div>
  );

  // Render dots
  const renderDots = () => (
    <div className="flex">
      <div className={`${sizeClasses[size].dots} rounded-full bg-indigo-600 animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`${sizeClasses[size].dots} rounded-full bg-indigo-600 animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`${sizeClasses[size].dots} rounded-full bg-indigo-600 animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );

  // Render loading indicator based on type
  const renderLoadingIndicator = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner();
      case 'pulse':
        return renderPulse();
      case 'dots':
        return renderDots();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={containerClasses}>
      {renderLoadingIndicator()}
      {text && <span className={`${sizeClasses[size].text} text-gray-700`}>{text}</span>}
    </div>
  );
} 