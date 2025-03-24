'use client';

import React from 'react';

interface SkeletonLoaderProps {
  type?: 'text' | 'card' | 'list' | 'table' | 'calendar';
  count?: number;
  width?: string;
  height?: string;
  className?: string;
}

/**
 * SkeletonLoader component
 * Displays animated placeholders during content loading
 */
export default function SkeletonLoader({
  type = 'text',
  count = 1,
  width,
  height,
  className = ''
}: SkeletonLoaderProps) {
  // Base skeleton style
  const baseClass = 'animate-pulse bg-gray-200 rounded';
  
  // Width and height classes
  const sizeClasses = `${width || 'w-full'} ${height || 'h-4'}`;
  
  // Generate skeleton items based on count
  const renderSkeletonItems = () => {
    return Array.from({ length: count }).map((_, index) => (
      <div key={index} className={`${baseClass} ${sizeClasses} ${className} mb-2`}></div>
    ));
  };
  
  // Render list skeleton
  const renderListSkeleton = () => {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`${baseClass} w-4 h-4 rounded-full`}></div>
            <div className={`${baseClass} w-full h-4`}></div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render card skeleton
  const renderCardSkeleton = () => {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="border rounded p-4">
            <div className={`${baseClass} w-3/4 h-5 mb-3`}></div>
            <div className={`${baseClass} w-full h-4 mb-2`}></div>
            <div className={`${baseClass} w-full h-4 mb-2`}></div>
            <div className="flex justify-between mt-4">
              <div className={`${baseClass} w-20 h-6 rounded-md`}></div>
              <div className={`${baseClass} w-8 h-8 rounded-full`}></div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Render table skeleton
  const renderTableSkeleton = () => {
    return (
      <div className="border rounded overflow-hidden">
        <div className="grid grid-cols-4 gap-4 p-3 border-b bg-gray-50">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`header-${index}`} className={`${baseClass} h-4`}></div>
          ))}
        </div>
        {Array.from({ length: count }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid grid-cols-4 gap-4 p-3 border-b">
            {Array.from({ length: 4 }).map((_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className={`${baseClass} h-4`}></div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  // Render calendar skeleton
  const renderCalendarSkeleton = () => {
    return (
      <div className="border rounded overflow-hidden">
        <div className="grid grid-cols-7 gap-0 border-b">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={`header-${index}`} className="p-2 border-r last:border-r-0">
              <div className={`${baseClass} h-4 mb-1`}></div>
              <div className={`${baseClass} w-8 h-6 mx-auto`}></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0">
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div key={`day-${dayIndex}`} className="p-2 border-r last:border-r-0 border-b min-h-[120px]">
              {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, eventIndex) => (
                <div 
                  key={`event-${dayIndex}-${eventIndex}`} 
                  className={`${baseClass} h-7 mb-2 rounded-md`}
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Return the appropriate skeleton based on type
  switch (type) {
    case 'text':
      return <>{renderSkeletonItems()}</>;
    case 'list':
      return <>{renderListSkeleton()}</>;
    case 'card':
      return <>{renderCardSkeleton()}</>;
    case 'table':
      return <>{renderTableSkeleton()}</>;
    case 'calendar':
      return <>{renderCalendarSkeleton()}</>;
    default:
      return <>{renderSkeletonItems()}</>;
  }
} 