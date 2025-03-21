'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, addDays, isWithinInterval, parse } from 'date-fns';
import { CalendarEntry } from '@/lib/supabase/data';

interface WeeklyCalendarProps {
  entries: CalendarEntry[];
  selectedDate: string;
  isLoading: boolean;
}

export default function WeeklyCalendar({ entries, selectedDate, isLoading }: WeeklyCalendarProps) {
  // State for displaying a modal with class details
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  
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
  
  // Group entries by day and time
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
      
      return {
        ...day,
        entries: sortedEntries
      };
    });
    
    return groupedEntries;
  }, [entries, weekDays]);
  
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
  
  // Determine the class for the entry (color based on NT-Led status)
  const getEntryClass = (entry: CalendarEntry) => {
    // Handle both boolean true and string 'yes' values
    const ntLed = entry['NT-Led'];
    const isNTLed = ntLed === true || 
                   (typeof ntLed === 'string' && ntLed.toLowerCase() === 'yes');
    
    if (isNTLed) {
      return 'bg-indigo-100 border-indigo-500 text-indigo-800';
    } else {
      return 'bg-emerald-100 border-emerald-500 text-emerald-800';
    }
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
  
  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="ml-2">Loading calendar...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Week Navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">
          Weekly Schedule: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h2>
        
        <div className="flex text-sm">
          <span className="flex items-center mr-4">
            <span className="w-3 h-3 inline-block bg-indigo-100 border border-indigo-500 mr-1 rounded-sm"></span>
            NT-Led Classes
          </span>
          <span className="flex items-center">
            <span className="w-3 h-3 inline-block bg-emerald-100 border border-emerald-500 mr-1 rounded-sm"></span>
            Local Teacher Classes
          </span>
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
                {day.entries.map((entry) => (
                  <div
                    key={`${entry.id}-${entry.Course}`}
                    className={`p-2 rounded border-l-4 text-sm cursor-pointer hover:opacity-90 transition-opacity ${getEntryClass(entry)}`}
                    onClick={() => handleEntryClick(entry)}
                  >
                    <div className="font-medium">{getClassInfo(entry)}</div>
                    <div className="text-xs">{getTimeRange(entry)}</div>
                    <div className="text-xs truncate">
                      {entry.Day1 && `Day1: ${entry.Day1}`}
                      {entry.Day2 && `, Day2: ${entry.Day2}`}
                    </div>
                    {/* Add NT-Led indicator */}
                    {(() => {
                      const ntLed = entry['NT-Led'];
                      return (ntLed === true || (typeof ntLed === 'string' && ntLed.toLowerCase() === 'yes')) && (
                        <div className="text-xs font-semibold text-indigo-800 mt-1">
                          NT-Led: Yes
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Entry Detail Modal */}
      {showModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Class Details</h3>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="col-span-2">
                  <p className="text-gray-600 text-sm">Course:</p>
                  <p className="font-medium">{selectedEntry.Course}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Date:</p>
                  <p className="font-medium">{format(
                    selectedEntry.Date ? 
                      (selectedEntry.Date.includes('T') ? 
                        parseISO(selectedEntry.Date) : 
                        parse(selectedEntry.Date, 'yyyy-MM-dd', new Date())
                      ) : 
                      new Date(), 
                    'MMMM d, yyyy'
                  )}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Time:</p>
                  <p className="font-medium">{getTimeRange(selectedEntry)}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Day 1:</p>
                  <p className="font-medium">{selectedEntry.Day1 || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Day 2:</p>
                  <p className="font-medium">{selectedEntry.Day2 || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Level:</p>
                  <p className="font-medium">{selectedEntry.Level || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">NT-Led:</p>
                  <p className="font-medium">
                    {selectedEntry['NT-Led'] === true ? 'Yes' : 'No'}
                  </p>
                </div>
                
                {selectedEntry.Unit && (
                  <div className="col-span-2">
                    <p className="text-gray-600 text-sm">Unit:</p>
                    <p className="font-medium">{selectedEntry.Unit}</p>
                  </div>
                )}
                
                {selectedEntry.Meeting && (
                  <div className="col-span-2">
                    <p className="text-gray-600 text-sm">Meeting:</p>
                    <p className="font-medium">{selectedEntry.Meeting}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 