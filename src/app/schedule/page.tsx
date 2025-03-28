'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parse, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import TeacherSelect from '@/components/TeacherSelect';
import DateSelect from '@/components/DateSelect';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { CalendarEntry, Teacher } from '@/lib/supabase/data';
import { getTeacherSchedule, getCalendarEntries, getCalendarTables, getTeacherById } from '@/lib/supabase/data';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { supabaseService } from '@/lib/supabase/service';
import FallbackIndicator from '@/components/FallbackIndicator';
import SynchronizationIndicator from '@/components/SynchronizationIndicator';
import LoadingIndicator from '@/components/LoadingIndicator';
import LoadingOverlay from '@/components/LoadingOverlay';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'weekly'>('weekly');
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(supabaseService.isOffline());
  
  // Calculate week range for display
  const weekDates = useMemo(() => {
    const currentDate = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const weekEnd = addDays(weekStart, 6); // End on Sunday
    return {
      start: format(weekStart, 'MMM d'),
      end: format(weekEnd, 'MMM d, yyyy')
    };
  }, [selectedDate]);
  
  // Add debug log function
  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Listen for connection status changes to detect offline mode
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

  // Load selected teacher details
  useEffect(() => {
    if (!selectedTeacherId) {
      setSelectedTeacher(null);
      return;
    }
    
    async function loadTeacherDetails() {
      try {
        // Only call getTeacherById if we have a valid ID
        if (selectedTeacherId !== null) {
          const teacher = await getTeacherById(selectedTeacherId);
          setSelectedTeacher(teacher);
          addDebugLog(`Loaded teacher: ${teacher?.Teacher_name} (${teacher?.Teacher_Type})`);
        }
      } catch (error) {
        console.error('Error loading teacher details:', error);
        setSelectedTeacher(null);
      }
    }
    
    loadTeacherDetails();
  }, [selectedTeacherId]);

  // Extract loadCalendarData as a separate function
  const loadCalendarData = async () => {
    setLoading(true);
    setError(null);
    setCalendarEntries([]);
    
    try {
      addDebugLog(`Loading schedule for date: ${selectedDate}`);
      
      // For weekly view, we need to load the entire week's data
      const currentDate = parse(selectedDate, 'yyyy-MM-dd', new Date());
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // End on Sunday
      
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      addDebugLog(`Loading data for week: ${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`);
      
      if (selectedTeacherId !== null) {
        addDebugLog(`Loading schedule for teacher ID: ${selectedTeacherId}`);
        
        // Load teacher data for the entire week in parallel for better performance
        const teacherPromises = daysInWeek.map(day => {
          const dayString = format(day, 'yyyy-MM-dd');
          return getTeacherSchedule(selectedTeacherId, dayString);
        });
        
        // Wait for all days to load
        const weekResults = await Promise.all(teacherPromises);
        
        // Combine all results
        const allWeekEntries: CalendarEntry[] = weekResults.flatMap((entries, index) => {
          const dayString = format(daysInWeek[index], 'yyyy-MM-dd');
          
          // Count NT-Led classes for debugging
          const ntLedClasses = entries.filter(entry => 
            entry['NT-Led'] === true || 
            (typeof entry['NT-Led'] === 'string' && entry['NT-Led'].toLowerCase() === 'yes')
          );
          
          if (entries.length > 0) {
            addDebugLog(`${dayString}: Found ${entries.length} entries (${ntLedClasses.length} are NT-Led)`);
            
            // Log each NT-Led class for debugging
            ntLedClasses.forEach(entry => {
              addDebugLog(`NT-Led class on ${dayString}: ${entry.Course} ${entry.Level} (${entry['Class.ID']}) at ${entry.Start}-${entry.End}`);
            });
          }
          
          return entries;
        });
        
        addDebugLog(`Total week entries: ${allWeekEntries.length}`);
        setCalendarEntries(allWeekEntries);
      } else {
        // No teacher selected, get all entries for the entire week
        const calendarTables = await getCalendarTables();
        addDebugLog(`Found ${calendarTables.length} calendar tables: ${calendarTables.join(', ')}`);
        
        // Create an array of promises for all day/table combinations
        const allQueries: Promise<CalendarEntry[]>[] = [];
        const queryInfo: { day: Date; tableName: string }[] = [];
        
        // For each day in the week
        for (const day of daysInWeek) {
          const dayString = format(day, 'yyyy-MM-dd');
          
          // For each calendar table
          for (const tableName of calendarTables) {
            // Create a promise for this day/table combination
            allQueries.push(
              getCalendarEntries(tableName, { date: dayString })
                .catch(error => {
                  addDebugLog(`Error fetching from ${tableName} for ${dayString}: ${error.message}`);
                  return [] as CalendarEntry[]; // Return empty array on error
                })
            );
            queryInfo.push({ day, tableName });
          }
        }
        
        // Execute all queries in parallel
        const results = await Promise.all(allQueries);
        
        // Process all results
        const allWeekEntries: CalendarEntry[] = [];
        results.forEach((entries, index) => {
          const { day, tableName } = queryInfo[index];
          const dayString = format(day, 'yyyy-MM-dd');
          
          if (entries.length > 0) {
            // Count NT-Led classes for debugging
            const ntLedClasses = entries.filter(entry => 
              entry['NT-Led'] === true || 
              (typeof entry['NT-Led'] === 'string' && entry['NT-Led'].toLowerCase() === 'yes')
            );
            
            addDebugLog(`${dayString} - ${tableName}: Found ${entries.length} entries (${ntLedClasses.length} are NT-Led)`);
            allWeekEntries.push(...entries);
          }
        });
        
        setCalendarEntries(allWeekEntries);
        addDebugLog(`Total entries for week: ${allWeekEntries.length}`);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      setError(`Failed to load schedule: ${(error as Error).message}`);
      addDebugLog(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load calendar entries when date or teacher changes
  useEffect(() => {
    loadCalendarData();
  }, [selectedDate, selectedTeacherId]);

  // Function to identify which table/course level an entry belongs to
  const identifyTableFromEntry = (entry: CalendarEntry): string => {
    const course = entry.Course?.toLowerCase() || '';
    if (course.includes('sprouts1')) return 'Sprouts1';
    if (course.includes('sprouts2')) return 'Sprouts2';
    if (course.includes('clovers1') || course.includes('clover1')) return 'Clovers1A';
    if (course.includes('clovers2') || course.includes('clover2')) return 'Clovers2A';
    if (course.includes('guardians3') || course.includes('guardian3')) return 'Guardians3';
    return 'Unknown';
  };

  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    addDebugLog(`Date changed to: ${date}`);
  };

  // Navigate to previous day
  const handlePreviousDay = () => {
    const date = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const newDate = subDays(date, 1);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  // Navigate to next day
  const handleNextDay = () => {
    const date = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const newDate = addDays(date, 1);
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  // Handle teacher selection
  const handleTeacherSelect = (teacherId: number | null) => {
    setSelectedTeacherId(teacherId);
  };

  // Toggle view mode
  const toggleViewMode = () => {
    setViewMode(viewMode === 'table' ? 'weekly' : 'table');
  };

  // Get selected teacher display info
  const teacherDisplay = useMemo(() => {
    if (!selectedTeacher) return null;
    return {
      name: selectedTeacher.Teacher_name,
      type: selectedTeacher.Teacher_Type,
      isNative: selectedTeacher.Teacher_Type?.toLowerCase().includes('native') || false
    };
  }, [selectedTeacher]);

  // Custom error handlers for different components
  const handleTeacherSelectError = (error: Error, errorInfo: React.ErrorInfo) => {
    addDebugLog(`TeacherSelect Error: ${error.message}`);
    console.error("TeacherSelect Error Details:", errorInfo);
  };

  const handleDateSelectError = (error: Error, errorInfo: React.ErrorInfo) => {
    addDebugLog(`DateSelect Error: ${error.message}`);
    console.error("DateSelect Error Details:", errorInfo);
  };

  const handleCalendarError = (error: Error, errorInfo: React.ErrorInfo) => {
    addDebugLog(`Calendar Error: ${error.message}`);
    console.error("Calendar Error Details:", errorInfo);
  };

  // Handle data refresh request (called after synchronization)
  const handleRefreshData = () => {
    addDebugLog('Data refresh requested after synchronization');
    // Reload the calendar data for the current teacher and date
    loadCalendarData();
  };

  const errorFallback = <ErrorFallbackComponent />; // Define a reusable fallback component instance

  return (
    <div className="flex flex-col h-full">
      {isOffline && <FallbackIndicator />}
      <SynchronizationIndicator />

      {/* Header Controls - added print-hide class */}
      <div className="bg-white shadow-sm p-4 rounded-lg mb-4 sticky top-0 z-10 print-hide">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Use fallback prop for ErrorBoundary */}
          <ErrorBoundary fallback={errorFallback} onError={handleTeacherSelectError} key={`teacher-select-${selectedTeacherId}`}>
            <TeacherSelect 
              selectedTeacherId={selectedTeacherId}
              onTeacherSelect={handleTeacherSelect}
              calendarEntries={calendarEntries}
            />
          </ErrorBoundary>
          
          {/* Use fallback prop for ErrorBoundary */}
          <ErrorBoundary fallback={errorFallback} onError={handleDateSelectError} key={`date-select-${selectedDate}`}>
            <DateSelect 
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect} 
            />
          </ErrorBoundary>

          <div className="flex items-center justify-between md:justify-end space-x-2">
            <button 
              onClick={handlePreviousDay} 
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 print-hide"
              disabled={loading}
            >
              &lt; Prev Week
            </button>
            <button 
              onClick={handleNextDay} 
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 print-hide"
              disabled={loading}
            >
              Next Week &gt;
            </button>
            <button onClick={handleRefreshData} disabled={loading} className="p-2 bg-green-100 text-green-700 rounded disabled:opacity-50 print-hide">
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button onClick={() => window.print()} className="p-2 bg-blue-100 text-blue-700 rounded print-hide">
              Print
            </button>
            <button onClick={() => setShowDebug(!showDebug)} className="p-2 bg-yellow-100 text-yellow-700 rounded print-hide">Debug</button>
          </div>
        </div>
        {selectedTeacher && (
          <div className="mt-2 text-sm text-gray-600 font-medium print-show">
            Filtering by: {selectedTeacher.Teacher_name} ({selectedTeacher.Teacher_Type || 'Unknown Type'})
          </div>
        )}
        <div className="mt-1 text-sm text-gray-500 print-show">Displaying week: {weekDates.start} - {weekDates.end}</div>
      </div>

      {/* Calendar View */}
      <div className="flex-grow overflow-auto">
        {loading && calendarEntries.length === 0 && (
          <div className="p-4">
            <SkeletonLoader type="calendar" />
          </div>
        )}
        {error && <div className="p-4 text-red-500">Error: {error}</div>}
        {!loading && !error && 
          <ErrorBoundary fallback={errorFallback} onError={handleCalendarError} key={`calendar-${selectedDate}-${selectedTeacherId}`}>
            <WeeklyCalendar 
              entries={calendarEntries} 
              currentDate={selectedDate}
              selectedTeacher={selectedTeacher}
              isLoading={loading}
              usingFallbackData={isOffline}
              onRefreshRequest={handleRefreshData}
            />
          </ErrorBoundary>
        }
      </div>

      {/* Debug Info Panel - hide on print */}
      {showDebug && (
        <div className="fixed bottom-0 right-0 bg-gray-800 text-white p-4 w-full md:w-1/3 h-1/3 overflow-y-auto shadow-lg z-50 print-hide">
          <h3 className="text-lg font-semibold mb-2">Debug Log</h3>
          <button onClick={() => setDebugInfo([])} className="absolute top-2 right-2 text-xs bg-red-500 px-2 py-1 rounded">Clear</button>
          <pre className="text-xs">
            {debugInfo.map((log, index) => <div key={index}>{log}</div>)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Renamed ErrorFallback to avoid conflict, keep it simple
function ErrorFallbackComponent() {
  // Note: This simple version doesn't have access to resetErrorBoundary
  // For a retry button, the ErrorBoundary component itself provides one, 
  // or the fallback prop could be a function component receiving props.
  return (
    <div role="alert" className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      <p className="font-bold">Component Error</p>
      <p className="text-sm">This section could not be loaded. Please try refreshing.</p>
    </div>
  );
}