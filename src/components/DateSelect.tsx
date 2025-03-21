'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addDays, subDays, parseISO, isToday, isSameDay, startOfWeek, addWeeks, subWeeks } from 'date-fns';

interface DateSelectProps {
  selectedDate: string; // Format: 'yyyy-MM-dd'
  onDateSelect: (date: string) => void;
}

export default function DateSelect({ selectedDate, onDateSelect }: DateSelectProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Convert the selected date string to a Date object
  const selectedDateObj = parseISO(selectedDate);
  
  // Calculate the start of the current week (for the calendar view)
  const startOfCurrentWeek = startOfWeek(selectedDateObj, { weekStartsOn: 1 }); // Start on Monday
  
  // State for the currently visible week in the calendar
  const [visibleWeekStart, setVisibleWeekStart] = useState(startOfCurrentWeek);
  
  // Generate days for 2 weeks (current + next week)
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(visibleWeekStart, i);
    return {
      date,
      day: format(date, 'd'),
      dayOfWeek: format(date, 'EEE'),
      month: format(date, 'MMM'),
      dateString: format(date, 'yyyy-MM-dd'),
      isToday: isToday(date),
      isSelected: isSameDay(date, selectedDateObj)
    };
  });
  
  // Calculate week rows
  const weekRows = [
    calendarDays.slice(0, 7), // First week
    calendarDays.slice(7, 14)  // Second week
  ];
  
  // Handle outside click to close the calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current && 
        !calendarRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Navigate to previous weeks
  const showPreviousWeeks = () => {
    setVisibleWeekStart(subWeeks(visibleWeekStart, 2));
  };
  
  // Navigate to next weeks
  const showNextWeeks = () => {
    setVisibleWeekStart(addWeeks(visibleWeekStart, 2));
  };
  
  // Handle date selection
  const handleDateSelect = (dateString: string) => {
    onDateSelect(dateString);
    setShowCalendar(false);
  };
  
  // Go to today
  const goToToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    onDateSelect(today);
    setVisibleWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setShowCalendar(false);
  };
  
  // Format the date for display in the button
  const formattedDate = format(selectedDateObj, 'MMM d, yyyy');
  
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full px-2 py-1 text-xs text-left text-gray-800 bg-white hover:bg-gray-50 focus:outline-none border rounded h-8"
        aria-haspopup="true"
        aria-expanded={showCalendar}
      >
        {formattedDate}
        <span className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      
      {showCalendar && (
        <div 
          ref={calendarRef}
          className="absolute z-10 mt-1 bg-white rounded-md shadow-lg border border-gray-200 w-56 right-0"
        >
          {/* Calendar Header */}
          <div className="p-1 border-b flex justify-between items-center bg-gray-50">
            <div className="text-xs font-medium">
              {format(visibleWeekStart, 'MMM yyyy')}
            </div>
            <div className="flex space-x-1">
              <button 
                onClick={showPreviousWeeks}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-600"
                aria-label="Previous weeks"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={goToToday}
                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Today
              </button>
              <button 
                onClick={showNextWeeks}
                className="p-0.5 rounded hover:bg-gray-200 text-gray-600"
                aria-label="Next weeks"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Calendar Body */}
          <div className="p-1">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 mb-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <div key={index} className="text-center text-[10px] font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="space-y-1">
              {weekRows.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day) => (
                    <button
                      key={day.dateString}
                      onClick={() => handleDateSelect(day.dateString)}
                      className={`
                        p-0.5 text-center text-xs rounded
                        ${day.isSelected ? 'bg-indigo-600 text-white font-medium' : 
                          day.isToday ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}
                      `}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 