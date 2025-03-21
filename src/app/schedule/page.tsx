'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parse, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from 'date-fns';
import TeacherSelect from '@/components/TeacherSelect';
import DateSelect from '@/components/DateSelect';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { CalendarEntry, Teacher } from '@/lib/supabase/data';
import { getTeacherSchedule, getCalendarEntries, getCalendarTables, getTeacherById } from '@/lib/supabase/data';

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

  // Load calendar entries when date or teacher changes
  useEffect(() => {
    async function loadCalendarData() {
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
    }
    
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

  return (
    <div className="max-w-7xl mx-auto px-2 py-2">
      {/* Ultra-compact Header with Controls */}
      <div className="bg-white shadow-sm rounded-lg border overflow-hidden mb-2">
        {/* Combined header bar with title, controls and view toggle */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex-shrink-0">
            <h1 className="text-base font-bold text-gray-800">Teaching Schedule</h1>
            <p className="text-xs text-gray-600">Week of {weekDates.start} - {weekDates.end}</p>
          </div>
          
          {/* Unified Controls Section in single row */}
          <div className="flex-grow flex items-center space-x-3">
            {/* Teacher Selection */}
            <div className="flex items-center space-x-1 max-w-[230px] min-w-[150px]">
              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100">
                <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-grow relative">
                <TeacherSelect
                  selectedTeacherId={selectedTeacherId}
                  onTeacherSelect={handleTeacherSelect}
                />
                {teacherDisplay && (
                  <div className="absolute -bottom-4 left-0 flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-1 ${teacherDisplay.isNative ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                    <span className="text-[10px] text-gray-500">{teacherDisplay.type}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Date Navigation */}
            <div className="flex items-center space-x-1 flex-grow-0">
              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100">
                <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handlePreviousDay}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-l border border-r-0 border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                  aria-label="Previous Day"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="w-[130px]">
                  <DateSelect 
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                  />
                </div>
                
                <button
                  onClick={handleNextDay}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-r border border-l-0 border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                  aria-label="Next Day"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center space-x-1">
              <div className="bg-gray-50 rounded px-2 py-1 border text-xs h-7 flex items-center">
                <span className="font-medium">{calendarEntries.length}</span>
                <span className="text-gray-600 ml-1">classes</span>
                {calendarEntries.length > 0 && (
                  <>
                    <span className="mx-1 text-gray-400">|</span>
                    <span className="font-medium">{
                      calendarEntries.filter(entry => 
                        entry['NT-Led'] === true || 
                        (typeof entry['NT-Led'] === 'string' && entry['NT-Led'].toLowerCase() === 'yes')
                      ).length
                    }</span>
                    <span className="text-gray-600 ml-1">NT-Led</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="inline-flex rounded-md shadow-sm flex-shrink-0" role="group">
            <button
              onClick={() => setViewMode('weekly')}
              type="button"
              className={`px-2 py-1 text-xs font-medium border-y border-l rounded-l-lg ${viewMode === 'weekly' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              aria-label="Weekly View"
            >
              <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="ml-1">Weekly</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              type="button"
              className={`px-2 py-1 text-xs font-medium border rounded-r-lg ${viewMode === 'table' 
                ? 'bg-indigo-600 text-white border-indigo-600' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              aria-label="Table View"
            >
              <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="ml-1">Table</span>
            </button>
          </div>
          
          {/* Debug Toggle - Moved to right end */}
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] text-gray-500 hover:text-gray-700 flex items-center whitespace-nowrap"
          >
            {showDebug ? 'Hide' : 'Show'} Debug
            <svg className={`ml-1 w-3 h-3 transform transition-transform ${showDebug ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Debug Information (Collapsible) */}
      {showDebug && (
        <div className="mb-2 bg-gray-50 p-2 rounded-md text-xs border">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-semibold text-xs">Debug Information</h3>
            <button 
              onClick={() => setDebugInfo([])} 
              className="text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-0.5 rounded"
            >
              Clear Logs
            </button>
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

      {/* Main Content */}
      <div>
        {loading ? (
          <div className="bg-white shadow-sm rounded-lg border p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600">Loading schedule...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
            <p className="font-medium">Error loading schedule:</p>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {viewMode === 'weekly' ? (
              <WeeklyCalendar 
                entries={calendarEntries}
                selectedDate={selectedDate}
                isLoading={loading}
              />
            ) : (
              <>
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
              </>
            )}
          </>
        )}
      </div>

      <footer className="mt-2 text-center text-gray-500 text-xs">
        © 2025 Teaching Scheduler 6
      </footer>
    </div>
  );
} 