'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getTeachers, CalendarEntry } from '@/lib/supabase/data';
import { supabaseService } from '@/lib/supabase/service';
import FallbackIndicator from './FallbackIndicator';
import LoadingIndicator from './LoadingIndicator';
import SkeletonLoader from './SkeletonLoader';

interface TeacherSelectProps {
  selectedTeacherId: number | null;
  onTeacherSelect: (teacherId: number | null) => void;
  calendarEntries?: CalendarEntry[];
}

// Unique component ID for synchronization
const COMPONENT_ID = 'TeacherSelect';

// Fallback data in case the database connection fails
const FALLBACK_TEACHERS = [
  { id: 1, name: 'Andrew', type: 'Native' },
  { id: 2, name: 'Emma', type: 'Native' },
  { id: 3, name: 'Michael', type: 'Native' },
  { id: 4, name: 'Liu Wei', type: 'Local' },
  { id: 5, name: 'Zhang Min', type: 'Local' },
  { id: 6, name: 'Wang Fang', type: 'Local' },
  { id: 7, name: 'Chen Jie', type: 'Local' }
];

export default function TeacherSelect({ selectedTeacherId, onTeacherSelect, calendarEntries = [] }: TeacherSelectProps) {
  const [teachers, setTeachers] = useState<Array<{ id: number; name: string; type: string }>>(FALLBACK_TEACHERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [usingFallbackData, setUsingFallbackData] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Debug log helper
  const addDebugLog = (message: string) => {
    console.log(`[TeacherSelect] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };
  
  // Listen for synchronization events
  useEffect(() => {
    const observer = {
      onConnectionStatusChanged: () => {},
      onSynchronizationComplete: () => {
        // Reload data after synchronization
        if (usingFallbackData) {
          addDebugLog('Synchronization completed, reloading teacher data');
          loadTeachers();
        }
      }
    };

    supabaseService.addObserver(observer);
    return () => {
      supabaseService.removeObserver(observer);
    };
  }, [usingFallbackData]);
  
  // Load teachers from Supabase
  useEffect(() => {
    loadTeachers();
  }, []);
  
  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      addDebugLog('Attempting to load teachers from database...');
      const teachersData = await getTeachers();
      
      if (!teachersData || teachersData.length === 0) {
        addDebugLog('No teachers found in database, using fallback data');
        setTeachers(FALLBACK_TEACHERS);
        setUsingFallbackData(true);
        supabaseService.registerFallbackUsage(COMPONENT_ID);
      } else {
        addDebugLog(`Loaded ${teachersData.length} teachers from database`);
        setUsingFallbackData(false);
        supabaseService.unregisterFallbackUsage(COMPONENT_ID);
        
        // First, log the raw teacher data to debug format
        const firstTeacher = teachersData[0];
        addDebugLog(`Raw teacher example: ${JSON.stringify(firstTeacher)}`);
        
        const formattedTeachers = teachersData.map(teacher => {
          // Handle different case variations for teacher type
          let teacherType = (teacher.Teacher_Type || teacher.TEACHER_TYPE || teacher.teacher_type || 'Unknown');
          
          // Normalize case for proper filtering
          if (typeof teacherType === 'string') {
            // Make lowercase first to normalize
            teacherType = teacherType.toLowerCase(); 
            
            // For display purposes, capitalize first letter
            teacherType = teacherType.charAt(0).toUpperCase() + teacherType.slice(1);
            
            // Map "native" and "local" variations to standard forms
            if (teacherType.toLowerCase() === 'native') {
              teacherType = 'Native';
            } else if (teacherType.toLowerCase() === 'local') {
              teacherType = 'Local';
            }
          }
          
          return {
            id: teacher.Teacher_ID || teacher.TEACHER_ID || teacher.teacher_id,
            name: teacher.Teacher_name || teacher.TEACHER_NAME || teacher.teacher_name || 'Unknown',
            type: teacherType
          };
        });
        
        // Log the first few teachers for debugging
        formattedTeachers.slice(0, 3).forEach(t => {
          addDebugLog(`Formatted teacher: ${t.id} - ${t.name} (${t.type})`);
        });
        
        setTeachers(formattedTeachers);
      }
    } catch (error) {
      addDebugLog(`Error loading teachers: ${error instanceof Error ? error.message : String(error)}`);
      addDebugLog('Using fallback teacher data');
      setTeachers(FALLBACK_TEACHERS);
      setUsingFallbackData(true);
      supabaseService.registerFallbackUsage(COMPONENT_ID);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cleanup fallback registration on unmount
  useEffect(() => {
    return () => {
      if (usingFallbackData) {
        supabaseService.unregisterFallbackUsage(COMPONENT_ID);
      }
    };
  }, [usingFallbackData]);
  
  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Find the selected teacher
  const selectedTeacher = teachers.find(teacher => teacher.id === selectedTeacherId);
  
  // Calculate workload (class count) for each teacher based on provided entries
  const teacherWorkloads = useMemo(() => {
    const workloads: { [teacherId: number]: number } = {};
    
    // Initialize count for all loaded teachers
    teachers.forEach(t => { workloads[t.id] = 0; });

    calendarEntries.forEach(entry => {
      const isNtLed = entry['NT-Led'] === true || String(entry['NT-Led']).toLowerCase() === 'true';
      
      if (isNtLed) {
        // Assign NT-Led classes to Native teachers
        teachers.forEach(teacher => {
          if (teacher.type.toLowerCase() === 'native') {
            workloads[teacher.id] = (workloads[teacher.id] || 0) + 1;
          }
        });
      } else {
        // Assign to specific teachers in Day1/Day2 if they exist in our list
        [entry.Day1, entry.Day2].forEach(assignedTeacherName => {
          const teacher = teachers.find(t => t.name === assignedTeacherName);
          if (teacher) {
            workloads[teacher.id] = (workloads[teacher.id] || 0) + 1;
          }
        });
      }
    });

    return workloads;
  }, [calendarEntries, teachers]);
  
  // Filter teachers based on search query
  const filteredTeachers = useMemo(() => 
    searchQuery.trim() === ''
      ? teachers
      : teachers.filter(teacher => 
          teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
  , [teachers, searchQuery]);
  
  // Clear the selected teacher
  const clearSelection = () => {
    onTeacherSelect(null);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      {usingFallbackData && (
        <div className="mb-2">
          <FallbackIndicator position="inline" />
        </div>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <div 
          className={`
            flex items-center w-full px-2 py-1 text-xs text-left text-gray-800 bg-white hover:bg-gray-50 border rounded cursor-pointer h-7
            ${isLoading ? 'opacity-75' : ''} 
          `}
          onClick={() => !isLoading && setIsOpen(!isOpen)}
        >
          {isLoading ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-gray-500">Loading teachers...</span>
              <LoadingIndicator type="dots" size="small" className="mx-1" />
            </div>
          ) : selectedTeacher ? (
            <span className="truncate">{selectedTeacher.name}</span>
          ) : (
            <span className="text-gray-500">Select teacher...</span>
          )}
          <span className="ml-auto flex-shrink-0">
            <svg className={`w-3 h-3 text-gray-400 ${isLoading ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-xs ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
            <div className="px-2 py-1 sticky top-0 bg-white z-10">
              <input
                type="text"
                placeholder="Search teachers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              />
            </div>
            
            <button
              onClick={clearSelection}
              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
            >
              -- Clear Selection --
            </button>

            {filteredTeachers.length === 0 ? (
              <div className="px-3 py-1.5 text-gray-500 italic">No teachers found.</div>
            ) : (
              filteredTeachers.map((teacher) => {
                const isSelected = teacher.id === selectedTeacherId;
                const workload = teacherWorkloads[teacher.id] || 0;

                return (
                  <button
                    key={teacher.id}
                    onClick={() => {
                      onTeacherSelect(teacher.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`
                      block w-full text-left px-3 py-1.5 flex justify-between items-center
                      ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}
                    `}
                  >
                    <div>
                      <span className={isSelected ? 'font-semibold' : ''}>{teacher.name}</span>
                      <span className={`ml-2 text-xs ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`}>({teacher.type})</span>
                    </div>
                    <span 
                      className={`text-xs px-1.5 py-0.5 rounded ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}
                      title={`${workload} classes this week`}
                    >
                      {workload}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
} 