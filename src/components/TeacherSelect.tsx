'use client';

import { useState, useEffect, useRef } from 'react';
import { getTeachers } from '@/lib/supabase/data';

interface TeacherSelectProps {
  selectedTeacherId: number | null;
  onTeacherSelect: (teacherId: number | null) => void;
}

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

export default function TeacherSelect({ selectedTeacherId, onTeacherSelect }: TeacherSelectProps) {
  const [teachers, setTeachers] = useState<Array<{ id: number; name: string; type: string }>>(FALLBACK_TEACHERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Load teachers from Supabase
  useEffect(() => {
    async function loadTeachers() {
      setIsLoading(true);
      try {
        console.log('Attempting to load teachers from database...');
        const teachersData = await getTeachers();
        
        if (!teachersData || teachersData.length === 0) {
          console.log('No teachers found in database, using fallback data');
          setTeachers(FALLBACK_TEACHERS);
        } else {
          console.log(`Loaded ${teachersData.length} teachers from database`);
          const formattedTeachers = teachersData.map(teacher => ({
            id: teacher.Teacher_ID,
            name: teacher.Teacher_name,
            type: teacher.Teacher_Type || 'Unknown'
          }));
          setTeachers(formattedTeachers);
        }
      } catch (error) {
        console.error('Error loading teachers:', error);
        console.log('Using fallback teacher data');
        setTeachers(FALLBACK_TEACHERS);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTeachers();
  }, []);
  
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
  
  // Filter teachers based on search query
  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Clear the selected teacher
  const clearSelection = () => {
    onTeacherSelect(null);
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex items-center w-full px-2 py-1 text-xs text-left text-gray-800 bg-white hover:bg-gray-50 border rounded cursor-pointer h-7"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isLoading ? (
          <span className="text-gray-500">Loading...</span>
        ) : selectedTeacher ? (
          <span className="truncate">{selectedTeacher.name}</span>
        ) : (
          <span className="text-gray-500">Select teacher...</span>
        )}
        <span className="ml-auto flex-shrink-0">
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b">
            <div className="flex items-center p-1">
              <input
                type="text"
                placeholder="Search teachers..."
                className="w-full px-2 py-1 text-xs border-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {selectedTeacherId !== null && (
                <button
                  className="flex-shrink-0 ml-1 px-1.5 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 border rounded"
                  onClick={clearSelection}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-2 text-center text-gray-500 text-xs">
              <svg className="animate-spin h-3 w-3 text-indigo-600 mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading teachers...
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-2 text-center text-gray-500 text-xs">
              No teachers found
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto p-1">
              {/* Native Teachers */}
              {filteredTeachers.some(t => t.type.toLowerCase() === 'native') && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded-t">
                    Native Teachers
                  </div>
                  {filteredTeachers
                    .filter(t => t.type.toLowerCase() === 'native')
                    .map(teacher => (
                      <div
                        key={teacher.id}
                        className={`
                          px-2 py-1 text-xs cursor-pointer truncate
                          ${teacher.id === selectedTeacherId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50'}
                        `}
                        onClick={() => {
                          onTeacherSelect(teacher.id);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        {teacher.name}
                      </div>
                    ))}
                </div>
              )}
              
              {/* Local Teachers */}
              {filteredTeachers.some(t => t.type.toLowerCase() === 'local') && (
                <div className="mt-2">
                  <div className="px-2 py-1 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded-t">
                    Local Teachers
                  </div>
                  {filteredTeachers
                    .filter(t => t.type.toLowerCase() === 'local')
                    .map(teacher => (
                      <div
                        key={teacher.id}
                        className={`
                          px-2 py-1 text-xs cursor-pointer truncate
                          ${teacher.id === selectedTeacherId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50'}
                        `}
                        onClick={() => {
                          onTeacherSelect(teacher.id);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        {teacher.name}
                      </div>
                    ))}
                </div>
              )}
              
              {/* Other Teachers */}
              {filteredTeachers.some(t => !['native', 'local'].includes(t.type.toLowerCase())) && (
                <div className="mt-2">
                  <div className="px-2 py-1 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded-t">
                    Other Teachers
                  </div>
                  {filteredTeachers
                    .filter(t => !['native', 'local'].includes(t.type.toLowerCase()))
                    .map(teacher => (
                      <div
                        key={teacher.id}
                        className={`
                          px-2 py-1 text-xs cursor-pointer truncate
                          ${teacher.id === selectedTeacherId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50'}
                        `}
                        onClick={() => {
                          onTeacherSelect(teacher.id);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        {teacher.name}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 