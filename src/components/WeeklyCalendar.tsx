'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO, startOfWeek, addDays, isWithinInterval, parse } from 'date-fns';
import { CalendarEntry } from '@/lib/supabase/data';
import FallbackIndicator from './FallbackIndicator';
import { supabaseService } from '@/lib/supabase/service';
import LoadingOverlay from './LoadingOverlay';
import SkeletonLoader from './SkeletonLoader';

// Unique component ID for synchronization
const COMPONENT_ID = 'WeeklyCalendar';

interface WeeklyCalendarProps {
  entries: CalendarEntry[];
  selectedDate: string;
  isLoading: boolean;
  usingFallbackData?: boolean;
  onRefreshRequest?: () => void;
}

export default function WeeklyCalendar({ 
  entries, 
  selectedDate, 
  isLoading, 
  usingFallbackData = false,
  onRefreshRequest
}: WeeklyCalendarProps) {
  // State for displaying a modal with class details
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  // Add state for filters
  const [courseTypeFilter, setCourseTypeFilter] = useState<string>('all');
  const [showFilterOptions, setShowFilterOptions] = useState<boolean>(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside the filter dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterOptions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Register/unregister component for fallback data
  useEffect(() => {
    if (usingFallbackData) {
      supabaseService.registerFallbackUsage(COMPONENT_ID);
    } else {
      supabaseService.unregisterFallbackUsage(COMPONENT_ID);
    }
    
    return () => {
      supabaseService.unregisterFallbackUsage(COMPONENT_ID);
    };
  }, [usingFallbackData]);
  
  // Listen for synchronization events
  useEffect(() => {
    const observer = {
      onConnectionStatusChanged: () => {},
      onSynchronizationComplete: () => {
        // Request data refresh after synchronization
        if (usingFallbackData && onRefreshRequest) {
          console.log(`[${COMPONENT_ID}] Synchronization completed, requesting data refresh`);
          onRefreshRequest();
        }
      }
    };

    supabaseService.addObserver(observer);
    return () => {
      supabaseService.removeObserver(observer);
    };
  }, [usingFallbackData, onRefreshRequest]);
  
  // Get start of the current week (Monday)
  const weekStart = useMemo(() => {
    return startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
  }, [selectedDate]);
  
  // Create array of weekdays
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dayStr: format(date, 'EEEE'), // Monday, Tuesday, etc.
        dayShort: format(date, 'EEE'), // Mon, Tue, etc.
        dateStr: format(date, 'yyyy-MM-dd'), // 2023-01-01
        displayDate: format(date, 'MMM d'), // Jan 1
        isToday: format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      };
    });
  }, [weekStart]);
  
  // Group entries by day and time and apply filters
  const entriesByDay = useMemo(() => {
    const groupedEntries = weekDays.map(day => {
      // Filter entries for this day
      const dayEntries = entries.filter(entry => {
        if (!entry.Date) return false;
        const entryDate = entry.Date.includes('T') 
          ? parseISO(entry.Date) 
          : parse(entry.Date, 'yyyy-MM-dd', new Date());
        return format(entryDate, 'yyyy-MM-dd') === day.dateStr;
      });
      
      // Sort entries by start time
      const sortedEntries = dayEntries.sort((a, b) => {
        const timeA = a.Start || '00:00';
        const timeB = b.Start || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      // Apply course type filter
      const filteredEntries = courseTypeFilter === 'all' 
        ? sortedEntries 
        : sortedEntries.filter(entry => {
            const course = (entry.Course || '').toLowerCase();
            
            switch(courseTypeFilter) {
              case 'sprouts':
                return course.includes('sprout');
              case 'clovers':
                return course.includes('clover');
              case 'guardians':
                return course.includes('guardian');
              case 'workshops':
                return course.includes('workshop') || course.includes('special');
              case 'advanced':
                return (entry.Level || '').toLowerCase().includes('advanced') || 
                       (entry.Level || '').toLowerCase().includes('a');
              case 'ntled':
                const ntLed = entry['NT-Led'];
                return ntLed === true || (typeof ntLed === 'string' && ntLed.toLowerCase() === 'yes');
              default:
                return true;
            }
          });
      
      return {
        ...day,
        entries: filteredEntries
      };
    });
    
    return groupedEntries;
  }, [entries, weekDays, courseTypeFilter]);
  
  // Get unique course types for filtering
  const courseTypes = useMemo(() => {
    // Get all unique courses
    const courses = new Set<string>();
    
    entries.forEach(entry => {
      if (entry.Course) {
        const course = entry.Course.toLowerCase();
        if (course.includes('sprout')) courses.add('sprouts');
        else if (course.includes('clover')) courses.add('clovers');
        else if (course.includes('guardian')) courses.add('guardians');
        else if (course.includes('workshop') || course.includes('special')) courses.add('workshops');
      }
      
      if (entry.Level) {
        const level = entry.Level.toLowerCase();
        if (level.includes('advanced') || level.includes('a')) courses.add('advanced');
      }
    });
    
    return Array.from(courses);
  }, [entries]);
  
  // Get the time range for an entry
  const getTimeRange = (entry: CalendarEntry) => {
    const start = entry.Start || 'TBD';
    const end = entry.End || 'TBD';
    return `${start} - ${end}`;
  };
  
  // Handle entry click to show details
  const handleEntryClick = (entry: CalendarEntry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };
  
  // Determine the class for the entry based on course type and NT-Led status
  const getEntryClass = (entry: CalendarEntry) => {
    // Get course type to determine base color
    const course = (entry.Course || '').toLowerCase();
    const level = (entry.Level || '').toLowerCase();
    
    // Handle both boolean true and string 'yes' values for NT-Led
    const ntLed = entry['NT-Led'];
    const isNTLed = ntLed === true || (typeof ntLed === 'string' && ntLed.toLowerCase() === 'yes');
    
    // Base style - all entries get a border and rounded corners
    const baseStyle = "border-l-4 rounded";
    
    // Determine color scheme based on course type
    let colorScheme = '';
    
    if (course.includes('sprout')) {
      // Sprouts classes - purple theme
      colorScheme = isNTLed 
        ? 'bg-purple-100 border-purple-500 text-purple-800' 
        : 'bg-purple-50 border-purple-400 text-purple-700';
    } 
    else if (course.includes('clover')) {
      // Clovers classes - green theme
      colorScheme = isNTLed 
        ? 'bg-emerald-100 border-emerald-500 text-emerald-800' 
        : 'bg-emerald-50 border-emerald-400 text-emerald-700';
    }
    else if (course.includes('guardian')) {
      // Guardians classes - blue theme
      colorScheme = isNTLed 
        ? 'bg-blue-100 border-blue-500 text-blue-800' 
        : 'bg-blue-50 border-blue-400 text-blue-700';
    }
    else if (course.includes('workshop') || course.includes('special')) {
      // Workshop or special classes - amber/yellow theme
      colorScheme = 'bg-amber-100 border-amber-500 text-amber-800';
    }
    else if (level.includes('advanced') || level.includes('a')) {
      // Advanced level - red/pink theme
      colorScheme = isNTLed 
        ? 'bg-rose-100 border-rose-500 text-rose-800' 
        : 'bg-rose-50 border-rose-400 text-rose-700';
    }
    else {
      // Default for other courses
      colorScheme = isNTLed 
        ? 'bg-indigo-100 border-indigo-500 text-indigo-800' 
        : 'bg-slate-100 border-slate-500 text-slate-800';
    }
    
    return `${baseStyle} ${colorScheme}`;
  };
  
  // Generate a unique key for each entry
  const getUniqueEntryKey = (entry: CalendarEntry, day: string, index: number) => {
    // Combine multiple fields to ensure uniqueness
    const id = entry.id || '';
    const course = entry.Course || '';
    const classId = entry['Class.ID'] || '';
    const time = entry.Start || '';
    const level = entry.Level || '';
    
    // Use a combination of fields plus the index to guarantee uniqueness
    return `${day}-${id}-${course}-${classId}-${time}-${level}-${index}`;
  };
  
  // Function to get detailed class information
  const getClassInfo = (entry: CalendarEntry) => {
    const classId = entry['Class.ID'] || '';
    const level = entry.Level || '';
    const course = entry.Course || '';
    return `${course} ${level} (${classId})`;
  };
  
  // Close the modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedEntry(null);
  };
  
  // Improved loading display
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-bold">
            <div className="animate-pulse bg-gray-200 h-6 w-48 rounded"></div>
          </h2>
          <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
        </div>
        <SkeletonLoader type="calendar" />
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {usingFallbackData && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <FallbackIndicator showDetails={false} />
        </div>
      )}
      
      <div className="overflow-x-auto">
        {/* Week Navigation */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">
              Weekly Schedule: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
            
            {/* Filter Button */}
            <div className="relative" ref={filterDropdownRef}>
              <button 
                onClick={() => setShowFilterOptions(!showFilterOptions)}
                className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                {courseTypeFilter === 'all' ? 'Filter' : `Filtered: ${courseTypeFilter}`}
              </button>
              
              {/* Filter Options Dropdown */}
              {showFilterOptions && (
                <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-md overflow-hidden z-10 border border-gray-200">
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        setCourseTypeFilter('all');
                        setShowFilterOptions(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs ${courseTypeFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                    >
                      All Courses
                    </button>
                    
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">Course Type</div>
                    
                    <button 
                      onClick={() => {
                        setCourseTypeFilter('sprouts');
                        setShowFilterOptions(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center ${courseTypeFilter === 'sprouts' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                    >
                      <span className="w-2 h-2 mr-2 inline-block bg-purple-100 border-l-4 border-purple-500 rounded-sm"></span>
                      Sprouts
                    </button>
                    
                    <button 
                      onClick={() => {
                        setCourseTypeFilter('clovers');
                        setShowFilterOptions(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center ${courseTypeFilter === 'clovers' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                    >
                      <span className="w-2 h-2 mr-2 inline-block bg-emerald-100 border-l-4 border-emerald-500 rounded-sm"></span>
                      Clovers
                    </button>
                    
                    <button 
                      onClick={() => {
                        setCourseTypeFilter('guardians');
                        setShowFilterOptions(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center ${courseTypeFilter === 'guardians' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                    >
                      <span className="w-2 h-2 mr-2 inline-block bg-blue-100 border-l-4 border-blue-500 rounded-sm"></span>
                      Guardians
                    </button>
                    
                    <button 
                      onClick={() => {
                        setCourseTypeFilter('workshops');
                        setShowFilterOptions(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center ${courseTypeFilter === 'workshops' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                    >
                      <span className="w-2 h-2 mr-2 inline-block bg-amber-100 border-l-4 border-amber-500 rounded-sm"></span>
                      Workshops
                    </button>
                    
                    <button 
                      onClick={() => {
                        setCourseTypeFilter('advanced');
                        setShowFilterOptions(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center ${courseTypeFilter === 'advanced' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                    >
                      <span className="w-2 h-2 mr-2 inline-block bg-rose-100 border-l-4 border-rose-500 rounded-sm"></span>
                      Advanced
                    </button>
                    
                    <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">Teacher Type</div>
                    
                    <button 
                      onClick={() => {
                        setCourseTypeFilter('ntled');
                        setShowFilterOptions(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-xs flex items-center ${courseTypeFilter === 'ntled' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}`}
                    >
                      <span className="w-2 h-2 mr-2 inline-block bg-indigo-100 border border-indigo-500 rounded-sm"></span>
                      NT-Led Only
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Color Coding Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center px-2 py-1 bg-gray-50 rounded">
              <span className="font-medium mr-2">Course Types:</span>
              
              <span className="flex items-center mr-2">
                <span className="w-3 h-3 inline-block bg-purple-100 border-l-4 border-purple-500 mr-1 rounded-sm"></span>
                <span>Sprouts</span>
              </span>
              
              <span className="flex items-center mr-2">
                <span className="w-3 h-3 inline-block bg-emerald-100 border-l-4 border-emerald-500 mr-1 rounded-sm"></span>
                <span>Clovers</span>
              </span>
              
              <span className="flex items-center mr-2">
                <span className="w-3 h-3 inline-block bg-blue-100 border-l-4 border-blue-500 mr-1 rounded-sm"></span>
                <span>Guardians</span>
              </span>
              
              <span className="flex items-center mr-2">
                <span className="w-3 h-3 inline-block bg-amber-100 border-l-4 border-amber-500 mr-1 rounded-sm"></span>
                <span>Workshops</span>
              </span>
              
              <span className="flex items-center">
                <span className="w-3 h-3 inline-block bg-rose-100 border-l-4 border-rose-500 mr-1 rounded-sm"></span>
                <span>Advanced</span>
              </span>
            </div>
            
            <div className="flex items-center px-2 py-1 bg-gray-50 rounded">
              <span className="font-medium mr-2">Teacher Types:</span>
              
              <span className="flex items-center mr-3">
                <span className="w-3 h-3 inline-block bg-indigo-100 border border-indigo-500 mr-1 rounded-sm"></span>
                <span>NT-Led</span>
              </span>
              
              <span className="flex items-center">
                <span className="w-3 h-3 inline-block bg-slate-100 border border-slate-500 mr-1 rounded-sm"></span>
                <span>Local Teacher</span>
              </span>
            </div>
            
            {/* Current Filter Indicator */}
            {courseTypeFilter !== 'all' && (
              <div className="flex items-center px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
                <span className="font-medium mr-2">Filter Active:</span>
                <span className="capitalize">{courseTypeFilter}</span>
                <button 
                  onClick={() => setCourseTypeFilter('all')}
                  className="ml-2 text-indigo-500 hover:text-indigo-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 divide-x">
          {/* Day Headers */}
          {weekDays.map((day) => {
            // Get the number of entries for this day
            const dayEntries = entriesByDay.find(d => d.dateStr === day.dateStr)?.entries || [];
            const entryCount = dayEntries.length;
            
            // Count NT-Led classes
            const ntLedCount = dayEntries.filter(entry => {
              const ntLed = entry['NT-Led'];
              return ntLed === true || (typeof ntLed === 'string' && ntLed.toLowerCase() === 'yes');
            }).length;
            
            return (
              <div 
                key={day.dateStr} 
                className={`p-2 text-center font-medium ${day.isToday ? 'bg-blue-50' : ''}`}
              >
                <div className="text-sm text-gray-600">{day.dayShort}</div>
                <div className={`text-base ${
                  day.dateStr === selectedDate 
                    ? 'text-indigo-600 font-bold' 
                    : day.isToday 
                      ? 'text-blue-600' 
                      : ''
                }`}>
                  {day.displayDate}
                  {day.isToday && <span className="ml-1 text-xs text-blue-600">(Today)</span>}
                </div>
                {entryCount > 0 && (
                  <div className="mt-1 text-xs">
                    <span className="bg-gray-100 rounded-full px-2 py-0.5">
                      {entryCount} {entryCount === 1 ? 'class' : 'classes'}
                    </span>
                    {ntLedCount > 0 && (
                      <span className="ml-1 bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5">
                        {ntLedCount} NT-Led
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Calendar Content */}
        <div className="grid grid-cols-7 divide-x min-h-[30rem]">
          {entriesByDay.map((day) => (
            <div 
              key={day.dateStr} 
              className={`p-2 ${day.dateStr === selectedDate ? 'bg-indigo-50' : day.isToday ? 'bg-blue-50' : ''}`}
            >
              {day.entries.length === 0 ? (
                <div className="text-center text-gray-500 text-sm italic py-4">No classes</div>
              ) : (
                <div className="space-y-2">
                  {day.entries.map((entry, index) => (
                    <div
                      key={getUniqueEntryKey(entry, day.dateStr, index)}
                      className={`