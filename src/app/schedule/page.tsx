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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-6">Teacher Schedule</h1>
      
      {/* Show synchronization indicator at the top of the page */}
      <div className="mb-6">
        <SynchronizationIndicator position="top" />
      </div>
      
      {isOffline && (
        <div className="mb-6">
          <FallbackIndicator position="top" showDetails={true} />
        </div>
      )}
      
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="col-span-1">
              <h2 className="text-lg font-semibold mb-2">Select Teacher</h2>
              <ErrorBoundary onError={handleTeacherSelectError}>
                <TeacherSelect
                  selectedTeacherId={selectedTeacherId}
                  onTeacherSelect={handleTeacherSelect}
                />
              </ErrorBoundary>
            </div>
            
            <div className="col-span-1 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-2">Select Date</h2>
              <ErrorBoundary onError={handleDateSelectError}>
                <DateSelect
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  onPreviousDay={handlePreviousDay}
                  onNextDay={handleNextDay}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {selectedTeacher ? `${selectedTeacher.name}'s Schedule` : 'Schedule'}
            {selectedTeacher && <span className="text-sm font-normal ml-2 text-gray-500">({selectedTeacher.type} Teacher)</span>}
          </h2>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4">
              Week of {weekDates.start} - {weekDates.end}
            </span>
            <button
              onClick={toggleViewMode}
              className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              disabled={loading}
            >
              {loading ? (
                <LoadingIndicator type="dots" size="small" />
              ) : (
                viewMode === 'weekly' ? 'Table View' : 'Weekly View'
              )}
            </button>
          </div>
        </div>

        <ErrorBoundary onError={handleCalendarError}>
          {loading ? (
            viewMode === 'weekly' ? (
              <SkeletonLoader type="calendar" />
            ) : (
              <SkeletonLoader type="table" count={5} />
            )
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          ) : (
            <>
              {viewMode === 'weekly' ? (
                <WeeklyCalendar
                  entries={calendarEntries}
                  selectedDate={selectedDate}
                  isLoading={loading}
                  usingFallbackData={isOffline}
                  onRefreshRequest={handleRefreshData}
                />
              ) : (
                <LoadingOverlay isLoading={loading} text="Loading data...">
                  {calendarEntries.length > 0 ? (
                    <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
                      <h2 className="text-sm font-semibold p-2 border-b bg-gray-50">
                        {selectedTeacher ? (
                          <>Teacher: {selectedTeacher.Teacher_name}</>
                        ) : (
                          <>All Classes</>
                        )}
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <th className="border-b px-3 py-2">Date</th>
                              <th className="border-b px-3 py-2">Day</th>
                              <th className="border-b px-3 py-2">Course</th>
                              <th className="border-b px-3 py-2">Level</th>
                              <th className="border-b px-3 py-2">Time</th>
                              <th className="border-b px-3 py-2">Day 1</th>
                              <th className="border-b px-3 py-2">Day 2</th>
                              <th className="border-b px-3 py-2">NT-Led</th>
                              <th className="border-b px-3 py-2">Class ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {calendarEntries
                              .sort((a, b) => {
                                // First sort by date
                                const dateA = new Date(a.Date);
                                const dateB = new Date(b.Date);
                                const dateDiff = dateA.getTime() - dateB.getTime();
                                
                                if (dateDiff !== 0) return dateDiff;
                                
                                // Then by start time
                                const timeA = a.Start || '00:00';
                                const timeB = b.Start || '00:00';
                                return timeA.localeCompare(timeB);
                              })
                              .map((entry) => {
                                // Format date for display
                                const entryDate = entry.Date ? 
                                  (entry.Date.includes('T') ? 
                                    parseISO(entry.Date) : 
                                    parse(entry.Date, 'yyyy-MM-dd', new Date())
                                  ) : 
                                  new Date();
                                
                                const formattedDate = format(entryDate, 'MMM d, yyyy');
                                const dayOfWeek = format(entryDate, 'EEE');
                                const isSelectedDay = format(entryDate, 'yyyy-MM-dd') === selectedDate;
                                const isToday = format(entryDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                
                                // Is this an NT-Led class?
                                const isNTLed = entry['NT-Led'] === true || 
                                  (typeof entry['NT-Led'] === 'string' && entry['NT-Led'].toLowerCase() === 'yes');
                                
                                return (
                                  <tr 
                                    key={`${entry.id}-${entry.Course}`} 
                                    className={`
                                      hover:bg-gray-50 text-sm
                                      ${isSelectedDay ? 'bg-indigo-50' : ''}
                                      ${isToday ? 'bg-blue-50' : ''}
                                      ${isNTLed ? 'font-medium' : ''}
                                    `}
                                  >
                                    <td className="px-3 py-2">{formattedDate}</td>
                                    <td className="px-3 py-2">{dayOfWeek}</td>
                                    <td className="px-3 py-2">{entry.Course}</td>
                                    <td className="px-3 py-2">{entry.Level}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{entry.Start} - {entry.End}</td>
                                    <td className="px-3 py-2">{entry.Day1}</td>
                                    <td className="px-3 py-2">{entry.Day2}</td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-block rounded-full w-2.5 h-2.5 ${
                                        isNTLed ? 'bg-indigo-500' : 'bg-gray-300'
                                      }`}></span>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">{entry['Class.ID']}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                      <p className="text-sm font-medium">No classes scheduled for the week of {
                        parse(selectedDate, 'yyyy-MM-dd', new Date()).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      } {selectedTeacher ? `with ${selectedTeacher.Teacher_name}` : ''}.</p>
                    </div>
                  )}
                </LoadingOverlay>
              )}
            </>
          )}
        </ErrorBoundary>

        {/* Debug Information (Collapsible) */}
        {showDebug && (
          <div className="mt-4 bg-gray-50 p-2 rounded-md text-xs border">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-xs">Debug Information</h3>
              <div className="flex items-center space-x-2">
                {loading && <LoadingIndicator type="dots" size="small" />}
                <button 
                  onClick={() => setDebugInfo([])} 
                  className="text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded"
                >
                  Clear Logs
                </button>
              </div>
            </div>
            <div className="max-h-20 overflow-y-auto">
              {debugInfo.length > 0 ? (
                <ul className="list-disc pl-4">
                  {debugInfo.map((log, index) => (
                    <li key={index} className={`${log.includes('NT-Led') ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}>
                      {log}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No logs yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 