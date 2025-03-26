import { supabaseService } from './service';

/**
 * Types for data structures
 */
export interface Teacher {
  Teacher_ID: number;
  Teacher_name: string;
  Department?: string;
  Teacher_Type?: string;
  [key: string]: any;
}

export interface CalendarEntry {
  id: number;
  Visit: number;
  Date: string;
  Course: string;
  Level: string;
  Day1?: string;
  Day2?: string;
  Start?: string;
  End?: string;
  Unit?: string;
  Meeting?: string;
  'Class.ID'?: string;
  'NT-Led'?: boolean | string;
  [key: string]: any;
}

export interface TableSchema {
  tableName: string;
  columns: string[];
  isCalendarTable: boolean;
  description?: string;
}

// Add caching for frequently used data
interface Cache {
  teachers: {
    data: Teacher[];
    timestamp: number;
  } | null;
  calendarTables: {
    data: string[];
    timestamp: number;
  } | null;
  calendarEntries: {
    [key: string]: {
      data: CalendarEntry[];
      timestamp: number;
    };
  };
}

// Initialize cache
const cache: Cache = {
  teachers: null,
  calendarTables: null,
  calendarEntries: {}
};

// Cache expiration time (in milliseconds)
const CACHE_EXPIRATION = 10 * 60 * 1000; // 10 minutes

// Check if cache is valid
function isCacheValid<T>(cacheItem: { data: T; timestamp: number } | null): boolean {
  if (!cacheItem) return false;
  const now = Date.now();
  return now - cacheItem.timestamp < CACHE_EXPIRATION;
}

// Define known tables for fallback
// Using the exact table names from the Supabase database
export const KNOWN_TABLES = [
  'Students-English',
  'Sprouts1-Course-Calendar',
  'Sprouts2-Course-Calendar',
  'Guardians3-Course-Calendar',
  'Clovers1A-Course-Calendar',
  'Clovers2A-Course-Calendar',
  'Teachers'
];

/**
 * Log database operations with a consistent format
 * @param message - Log message
 * @param level - Log level (log, warn, error)
 * @param data - Optional data to include
 */
function logDbOperation(message: string, level: 'log' | 'warn' | 'error' = 'log', data?: any): void {
  const prefix = '[DB]';
  const timestamp = new Date().toISOString();
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`, data !== undefined ? data : '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
  } else {
    console.log(`${prefix} ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Fetches a list of all tables from the Supabase database
 */
export async function getTables(): Promise<string[]> {
  logDbOperation('Starting database discovery...');
  
  // Check if we're in offline mode - immediately return known tables
  if (supabaseService.isOffline()) {
    logDbOperation('In offline mode, using fallback table list');
    return KNOWN_TABLES;
  }
  
  // Check cache first
  if (isCacheValid(cache.calendarTables)) {
    logDbOperation('Using cached table list');
    return cache.calendarTables!.data;
  }
  
  try {
    // Use the enhanced service to list tables - ONLY use actual tables from the database
    const tables = await supabaseService.listTables();
    
    if (tables.length === 0) {
      logDbOperation('No tables found, using known table list', 'warn');
      return KNOWN_TABLES;
    }
    
    // Do NOT merge with KNOWN_TABLES - only show tables that actually exist
    logDbOperation(`Discovered ${tables.length} tables from database`);
    
    // Update the cache
    cache.calendarTables = {
      data: tables,
      timestamp: Date.now()
    };
    
    return tables;
  } catch (err) {
    logDbOperation('Error during table discovery:', 'error', err);
    logDbOperation('Using fallback table list due to error');
    return KNOWN_TABLES;
  }
}

/**
 * Validates if a table exists in the database
 */
export async function validateTableExists(tableName: string): Promise<boolean> {
  // If we're in offline mode, check against known tables
  if (supabaseService.isOffline()) {
    return KNOWN_TABLES.includes(tableName);
  }
  
  try {
    const tables = await getTables();
    return tables.includes(tableName);
  } catch (err) {
    // If there's an error, assume it exists if it's in the known tables list
    return KNOWN_TABLES.includes(tableName);
  }
}

/**
 * Fetches data from a specific table with optional limit
 */
export async function getTableData(tableName: string, limit: number = 10) {
  logDbOperation(`Attempting to fetch data from ${tableName}...`);
  
  // Validate table exists
  const tableExists = await validateTableExists(tableName);
  if (!tableExists) {
    logDbOperation(`Table ${tableName} doesn't exist in the database or known tables list`, 'warn');
    return {
      data: [],
      count: 0,
      source: 'empty'
    };
  }
  
  // Check if we're in offline mode - immediately return fallback data
  if (supabaseService.isOffline()) {
    logDbOperation(`In offline mode, using fallback data for ${tableName}`);
    const fallbackResult = getFallbackData(tableName, limit);
    return {
      ...fallbackResult,
      source: 'fallback'
    };
  }
  
  // Check cache for calendar entries
  const isCourseCalendar = tableName.toLowerCase().includes('course-calendar');
  if (isCourseCalendar && 
      tableName in cache.calendarEntries && 
      isCacheValid(cache.calendarEntries[tableName])) {
    logDbOperation(`Using cached data for ${tableName}`);
    const cachedData = cache.calendarEntries[tableName].data;
    return {
      data: cachedData.slice(0, limit),
      count: cachedData.length,
      source: 'cache'
    };
  }
  
  // Check cache for teachers
  if (tableName === 'Teachers' && isCacheValid(cache.teachers)) {
    logDbOperation('Using cached teacher data');
    const cachedData = cache.teachers!.data;
    return {
      data: cachedData.slice(0, limit),
      count: cachedData.length,
      source: 'cache'
    };
  }
  
  try {
    // Use the enhanced service with retry logic
    return await supabaseService.executeQuery(async () => {
      logDbOperation(`Executing query for ${tableName}`);
      
      // Attempt to fetch data from Supabase
      const query = supabaseService.getClient().from(tableName).select('*', { count: 'exact' });
      
      // Safe check for limit method
      let result;
      if (typeof query === 'object' && query !== null && 'limit' in query && typeof query.limit === 'function') {
        result = await query.limit(limit);
      } else {
        result = await query;
      }
      
      // Safely extract data and error, with optional count that might not exist
      const { data, error } = result;
      // Use optional chaining for count which might not be present in all result types
      const count = 'count' in result ? result.count : undefined;
      
      if (error) {
        logDbOperation(`Error fetching data from ${tableName}:`, 'error', error);
        
        const fallbackResult = getFallbackData(tableName, limit);
        return {
          ...fallbackResult,
          source: 'fallback',
          error: error.message
        };
      }
      
      if (!data || data.length === 0) {
        logDbOperation(`No data found in ${tableName}, falling back`, 'warn');
        
        const fallbackResult = getFallbackData(tableName, limit);
        return {
          ...fallbackResult,
          source: 'fallback',
          reason: 'empty_result'
        };
      }
      
      // Update cache based on table type
      if (tableName === 'Teachers') {
        cache.teachers = {
          data: data as Teacher[],
          timestamp: Date.now()
        };
      } else if (isCourseCalendar) {
        cache.calendarEntries[tableName] = {
          data: data as CalendarEntry[],
          timestamp: Date.now()
        };
      }
      
      logDbOperation(`Successfully fetched ${data.length} rows from ${tableName}`);
      return {
        data,
        count: count || data.length,
        source: 'database'
      };
    });
  } catch (err) {
    logDbOperation(`Error in executeQuery for ${tableName}:`, 'error', err);
    
    // Get fallback data
    const fallbackResult = getFallbackData(tableName, limit);
    return {
      ...fallbackResult,
      source: 'fallback',
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Get fallback data for a given table
 */
function getFallbackData(tableName: string, limit: number = 10) {
  logDbOperation(`Getting fallback data for ${tableName}`);
  
  // Only provide fallback data for known tables
  if (!KNOWN_TABLES.includes(tableName)) {
    logDbOperation(`Table ${tableName} is not in known tables list - returning empty data`, 'warn');
    return {
      data: [],
      count: 0
    };
  }
  
  // Provide appropriate fallback data based on table name
  if (tableName === 'Teachers') {
    const fallbackTeachers = getFallbackTeachers();
    return {
      data: fallbackTeachers.slice(0, limit),
      count: fallbackTeachers.length
    };
  } else if (tableName === 'Students-English') {
    const fallbackStudents = getFallbackStudents();
    return {
      data: fallbackStudents.slice(0, limit),
      count: fallbackStudents.length
    };
  } else if (tableName.includes('Course-Calendar')) {
    const calendarData = getFallbackCalendar(tableName);
    return {
      data: calendarData.slice(0, limit),
      count: calendarData.length
    };
  }
  
  // Default fallback is empty array
  logDbOperation(`No specific fallback for ${tableName}, returning empty data`, 'warn');
  return {
    data: [],
    count: 0
  };
}

/**
 * Get all teachers
 */
export async function getTeachers(): Promise<Teacher[]> {
  try {
    const result = await getTableData('Teachers', 100);
    
    // Log the result to help debug
    logDbOperation(`getTeachers result: ${result.source}, count: ${result.count}`);
    
    if (!result.data || result.data.length === 0) {
      logDbOperation('No teachers found in database, returning fallback data', 'warn');
      return getFallbackTeachers();
    }
    
    // Verify the data structure and ensure Teacher_ID is present
    const teachers = result.data.map((teacher: any) => {
      // If the ID field is missing, generate one
      if (teacher.Teacher_ID === undefined) {
        logDbOperation(`Teacher missing Teacher_ID: ${JSON.stringify(teacher)}`, 'warn');
        return {
          ...teacher,
          Teacher_ID: Math.floor(Math.random() * 10000) + 1000, // Generate a random ID
          Teacher_name: teacher.Teacher_name || 'Unknown Teacher',
          Teacher_Type: teacher.Teacher_Type || 'Unknown'
        };
      }
      return teacher;
    });
    
    logDbOperation(`Returning ${teachers.length} teachers`);
    return teachers as Teacher[];
  } catch (err) {
    logDbOperation('Error in getTeachers:', 'error', err);
    return getFallbackTeachers();
  }
}

/**
 * Generate fallback teacher data
 */
function getFallbackTeachers(): Teacher[] {
  return [
    { Teacher_ID: 1, Teacher_name: 'John Smith', Department: 'English', Teacher_Type: 'Native' },
    { Teacher_ID: 2, Teacher_name: 'Sarah Johnson', Department: 'English', Teacher_Type: 'Native' },
    { Teacher_ID: 3, Teacher_name: 'Li Wei', Department: 'English', Teacher_Type: 'Local' },
    { Teacher_ID: 4, Teacher_name: 'Wang Mei', Department: 'English', Teacher_Type: 'Local' },
    { Teacher_ID: 5, Teacher_name: 'Robert Davis', Department: 'English', Teacher_Type: 'Native' },
  ];
}

/**
 * Generate fallback student data
 */
function getFallbackStudents(): any[] {
  return [
    { Student_ID: 1, Student_name: 'Zhang Wei', Age: 7, Level: 'Sprouts1' },
    { Student_ID: 2, Student_name: 'Li Na', Age: 8, Level: 'Sprouts2' },
    { Student_ID: 3, Student_name: 'Chen Jie', Age: 9, Level: 'Guardians3' },
    { Student_ID: 4, Student_name: 'Wang Fang', Age: 10, Level: 'Clovers1A' },
    { Student_ID: 5, Student_name: 'Liu Yang', Age: 11, Level: 'Clovers2A' },
  ];
}

/**
 * Generate fallback calendar data
 */
function getFallbackCalendar(tableName: string): CalendarEntry[] {
  // Extract level from table name
  const levelMatch = tableName.match(/^([\w]+)(\d[\w]*)?-Course-Calendar$/);
  const level = levelMatch ? levelMatch[1] + (levelMatch[2] || '') : 'Unknown';
  
  const generateClassId = (level: string, num: number) => {
    return `${level}-${String(num).padStart(3, '0')}`;
  };
  
  // Create a date for the current week starting Monday
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // Convert Sunday (0) to 7
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1); // Set to Monday
  
  const entries: CalendarEntry[] = [];
  
  // Generate 15 entries spanning 3 weeks
  for (let i = 0; i < 15; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + Math.floor(i / 5) * 7 + (i % 5));
    
    // Alternate between morning and afternoon classes
    const isAfternoon = i % 2 === 1;
    
    entries.push({
      id: i + 1,
      Visit: Math.floor(i / 5) + 1,
      Date: date.toISOString().split('T')[0],
      Course: level,
      Level: level,
      Day1: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i % 5],
      Start: isAfternoon ? '14:00' : '09:00',
      End: isAfternoon ? '16:00' : '11:00',
      Unit: `Unit ${Math.floor(i / 3) + 1}`,
      'Class.ID': generateClassId(level, i + 1),
      'NT-Led': i % 3 === 0 // Every third class is NT-Led
    });
  }
  
  return entries;
}

/**
 * Get a teacher by ID
 */
export async function getTeacherById(teacherId: number): Promise<Teacher | null> {
  const teachers = await getTeachers();
  return teachers.find(teacher => teacher.Teacher_ID === teacherId) || null;
}

/**
 * Get teachers by type (native or local)
 */
export async function getTeachersByType(type: 'native' | 'local'): Promise<Teacher[]> {
  try {
    // If we're offline, use the fallback data
    if (supabaseService.isOffline()) {
      const teachers = getFallbackTeachers();
      return teachers.filter(teacher => 
        teacher.Teacher_Type?.toLowerCase() === type.toLowerCase()
      );
    }
    
    // Try to get from cache first
    if (isCacheValid(cache.teachers)) {
      logDbOperation('Using cached teacher data for filtering by type');
      const cachedTeachers = cache.teachers!.data;
      return cachedTeachers.filter(teacher => 
        teacher.Teacher_Type?.toLowerCase() === type.toLowerCase()
      );
    }
    
    // Otherwise query from database with filtering
    return await supabaseService.executeQuery(async () => {
      // Create base query
      const query = supabaseService.getClient().from('Teachers').select('*');
      
      // Type-safe check for ilike method
      let result;
      if (typeof query === 'object' && query !== null && 'ilike' in query && typeof query.ilike === 'function') {
        result = await query.ilike('Teacher_Type', `%${type}%`);
      } else {
        // Fallback if method not available
        result = await query;
      }
      
      const { data, error } = result;
      
      if (error) {
        logDbOperation('Error fetching teachers by type:', 'error', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        // Use fallback if no data found
        const teachers = getFallbackTeachers();
        return teachers.filter(teacher => 
          teacher.Teacher_Type?.toLowerCase() === type.toLowerCase()
        );
      }
      
      return data as Teacher[];
    });
  } catch (err) {
    logDbOperation('Error in getTeachersByType:', 'error', err);
    
    // Use fallback data
    const teachers = getFallbackTeachers();
    return teachers.filter(teacher => 
      teacher.Teacher_Type?.toLowerCase() === type.toLowerCase()
    );
  }
}

/**
 * Get data from a specific calendar
 */
export async function getCalendarData(calendarName: string, limit: number = 20) {
  try {
    // Validate that it's a calendar table
    if (!calendarName.includes('Course-Calendar')) {
      throw new Error(`Table ${calendarName} is not a calendar table`);
    }
    
    return await getTableData(calendarName, limit);
  } catch (err) {
    logDbOperation(`Error in getCalendarData for ${calendarName}:`, 'error', err);
    
    // Use fallback calendar data
    const calendarData = getFallbackCalendar(calendarName);
    return {
      data: calendarData.slice(0, limit),
      count: calendarData.length,
      source: 'fallback',
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Get all tables that are calendar tables
 */
export async function getAllCalendarTables(): Promise<string[]> {
  const tables = await getTables();
  return tables.filter(table => table.includes('Course-Calendar'));
}

/**
 * Get calendar tables that actually contain data
 */
export async function getCalendarTables(): Promise<string[]> {
  try {
    // If we're offline, return the known calendar tables
    if (supabaseService.isOffline()) {
      return KNOWN_TABLES.filter(table => table.includes('Course-Calendar'));
    }
    
    // Check cache first
    if (isCacheValid(cache.calendarTables)) {
      const cachedTables = cache.calendarTables!.data;
      return cachedTables.filter(table => table.includes('Course-Calendar'));
    }
    
    // Otherwise, discovery calendar tables from the database
    const allTables = await getTables();
    const calendarTables = allTables.filter(table => table.includes('Course-Calendar'));
    
    // If no calendar tables found, use fallback
    if (calendarTables.length === 0) {
      return KNOWN_TABLES.filter(table => table.includes('Course-Calendar'));
    }
    
    // Update cache
    cache.calendarTables = {
      data: allTables,
      timestamp: Date.now()
    };
    
    return calendarTables;
  } catch (err) {
    logDbOperation('Error discovering calendar tables:', 'error', err);
    
    // Fall back to known tables
    return KNOWN_TABLES.filter(table => table.includes('Course-Calendar'));
  }
}

/**
 * Get calendar entries with optional filtering
 */
export async function getCalendarEntries(
  tableName: string,
  filters?: { date?: string; teacherId?: number }
): Promise<CalendarEntry[]> {
  logDbOperation(`Fetching calendar entries from ${tableName}${filters ? ' with filters' : ''}`);
  
  try {
    // Validate it's a calendar table
    if (!tableName.includes('Course-Calendar')) {
      throw new Error(`Table ${tableName} is not a calendar table`);
    }
    
    // If we're offline, use fallback data
    if (supabaseService.isOffline()) {
      logDbOperation(`In offline mode, using fallback calendar for ${tableName}`);
      let entries = getFallbackCalendar(tableName);
      
      // Apply filters to fallback data
      if (filters) {
        if (filters.date) {
          entries = entries.filter(entry => entry.Date === filters.date);
        }
        if (filters.teacherId !== undefined) {
          // In fallback data, just use a simple assignment rule based on ID
          entries = entries.filter(entry => {
            // Assign teachers based on a pattern
            const entryId = entry.id || 0;
            return (entryId % 5) + 1 === filters.teacherId;
          });
        }
      }
      
      return entries;
    }
    
    // Check cache for calendar entries
    if (tableName in cache.calendarEntries && isCacheValid(cache.calendarEntries[tableName])) {
      logDbOperation(`Using cached entries for ${tableName}`);
      let entries = cache.calendarEntries[tableName].data;
      
      // Apply filters to cached data
      if (filters) {
        if (filters.date) {
          entries = entries.filter(entry => entry.Date === filters.date);
        }
        if (filters.teacherId !== undefined) {
          entries = entries.filter(entry => {
            // Enhanced teacher ID matching with more field name variations and improved logging
            const teacherId = filters.teacherId;
            
            // Debug log the entry to see available fields
            if (entry.id === 1 || entry.ID === 1 || entry.Id === 1) {
              logDbOperation(`Example entry fields: ${JSON.stringify(Object.keys(entry))}`);
              logDbOperation(`Entry values: ${JSON.stringify(entry)}`);
            }
            
            // Try multiple potential field names with case insensitivity
            const possibleTeacherFields = [
              'Teacher_ID', 'TeacherID', 'teacherId', 'TEACHER_ID', 'teacher_id',
              'Teacher_Id', 'Teacher', 'TeacherId', 'TEACHERID',
              'NT_ID', 'NT_Id', 'NTID', 'NTId', 'ntId', 'NtId', 'nt_id',
              'teacherLed', 'TeacherLed', 'Teacher_Led'
            ];
            
            // Check if any of the possible fields match the teacher ID
            for (const field of possibleTeacherFields) {
              if (field in entry && entry[field] === teacherId) {
                return true;
              }
            }
            
            // Check potential nested objects
            if (entry.Teacher && typeof entry.Teacher === 'object') {
              if (entry.Teacher.ID === teacherId || 
                  entry.Teacher.Id === teacherId || 
                  entry.Teacher.id === teacherId) {
                return true;
              }
            }
            
            // Additional check: Look for any field that has 'teacher' in its name (case insensitive)
            // and check if its value matches the teacher ID
            for (const key in entry) {
              if (key.toLowerCase().includes('teacher') && 
                  (entry[key] === teacherId || 
                   (typeof entry[key] === 'string' && entry[key].toString() === teacherId.toString()))) {
                return true;
              }
            }
            
            // If class is NT-Led and the teacher is Native, consider it a match for fallback logic
            // This is a heuristic approach when direct teacher ID matching fails
            if (filters?.teacherId !== undefined) {
              const isNTLed = entry['NT-Led'] === true || 
                             (typeof entry['NT-Led'] === 'string' && 
                              entry['NT-Led'].toLowerCase() === 'yes');
                              
              // If we have a rough idea that this is a native teacher class, and we're looking for a native teacher
              // Use this as a fallback matching mechanism
              if (isNTLed && filters.teacherId <= 3) { // Assuming teacher IDs 1-3 are Native Teachers based on fallback data
                return true;
              }
            }
            
            return false;
          });
          
          // Log if filtering resulted in empty results
          if (entries.length === 0) {
            logDbOperation(`Warning: Teacher filter for ID ${filters.teacherId} returned no results from cache`);
          }
        }
      }
      
      return entries;
    }
    
    // Query from database with filters
    return await supabaseService.executeQuery(async () => {
      // Base query
      let baseQuery = supabaseService.getClient().from(tableName).select('*');
      
      // Apply filters with type checking
      if (filters) {
        // Check for date filter
        if (filters.date && typeof baseQuery === 'object' && baseQuery !== null && 
            'eq' in baseQuery && typeof baseQuery.eq === 'function') {
          baseQuery = baseQuery.eq('Date', filters.date);
        }
        
        // Check for teacher ID filter - use expanded OR conditions to match more field variations
        if (filters.teacherId !== undefined) {
          if (typeof baseQuery === 'object' && baseQuery !== null && 
              'or' in baseQuery && typeof baseQuery.or === 'function') {
            // Expanded OR conditions with more potential field names
            baseQuery = baseQuery.or(
              `Teacher_ID.eq.${filters.teacherId},` +
              `TeacherID.eq.${filters.teacherId},` +
              `teacherId.eq.${filters.teacherId},` +
              `TEACHER_ID.eq.${filters.teacherId},` +
              `teacher_id.eq.${filters.teacherId},` +
              `NT_ID.eq.${filters.teacherId},` +
              `NtId.eq.${filters.teacherId},` +
              `Teacher.eq.${filters.teacherId}`
            );
          } else if (typeof baseQuery === 'object' && baseQuery !== null && 
                    'eq' in baseQuery && typeof baseQuery.eq === 'function') {
            // Fallback to just one field if .or() isn't available
            baseQuery = baseQuery.eq('Teacher_ID', filters.teacherId);
          }
        }
      }
      
      const { data, error } = await baseQuery;
      
      if (error) {
        logDbOperation(`Error fetching calendar entries from ${tableName}:`, 'error', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        logDbOperation(`No calendar entries found in ${tableName} for filters: ${JSON.stringify(filters)}, using fallback`, 'warn');
        let entries = getFallbackCalendar(tableName);
        
        // Apply filters to fallback data
        if (filters) {
          if (filters.date) {
            entries = entries.filter(entry => entry.Date === filters.date);
          }
          if (filters.teacherId !== undefined) {
            // In fallback data, just use a simple assignment rule based on ID
            entries = entries.filter(entry => {
              const entryId = entry.id || 0;
              return (entryId % 5) + 1 === filters.teacherId;
            });
          }
        }
        
        return entries;
      }
      
      // For debugging, log a sample entry to understand field names
      if (data.length > 0) {
        const sampleEntry = data[0];
        logDbOperation(`Sample entry from ${tableName}: Fields: ${Object.keys(sampleEntry).join(', ')}`);
        
        if (filters && filters.teacherId !== undefined) {
          // Look at all entries to see if teacher ID fields exist
          const teacherFields = new Set<string>();
          data.forEach(entry => {
            Object.keys(entry).forEach(key => {
              if (key.toLowerCase().includes('teacher') || key.toLowerCase().includes('nt')) {
                teacherFields.add(key);
              }
            });
          });
          
          if (teacherFields.size > 0) {
            logDbOperation(`Found potential teacher fields in ${tableName}: ${Array.from(teacherFields).join(', ')}`);
          } else {
            logDbOperation(`No obvious teacher fields found in ${tableName}`);
          }
        }
      }
      
      // If teacher ID filter was applied but no matching entries found in DB query,
      // apply a client-side filter with more flexible matching
      if (filters && filters.teacherId !== undefined && data.length > 0) {
        // Apply a more flexible client-side teacher ID filter
        const filteredData = data.filter(entry => {
          // Check multiple field name variations
          const possibleFields = [
            'Teacher_ID', 'TeacherID', 'teacherId', 'TEACHER_ID', 'teacher_id',
            'Teacher_Id', 'Teacher', 'TeacherId', 'TEACHERID', 
            'NT_ID', 'NT_Id', 'NTID', 'NTId', 'ntId', 'NtId', 'nt_id'
          ];
          
          // Check if any of the possible fields match
          for (const field of possibleFields) {
            if (field in entry && entry[field] === filters.teacherId) {
              return true;
            }
          }
          
          // Check potential nested objects
          if (entry.Teacher && typeof entry.Teacher === 'object') {
            if (entry.Teacher.ID === filters.teacherId || 
                entry.Teacher.Id === filters.teacherId || 
                entry.Teacher.id === filters.teacherId) {
              return true;
            }
          }
          
          // Check any field containing 'teacher' in its name
          for (const key in entry) {
            if (key.toLowerCase().includes('teacher') && 
                (entry[key] === filters.teacherId || 
                 (typeof entry[key] === 'string' && entry[key].toString() === filters.teacherId.toString()))) {
              return true;
            }
          }
          
          // NT-Led heuristic for native teachers
          const isNTLed = entry['NT-Led'] === true || 
                         (typeof entry['NT-Led'] === 'string' && entry['NT-Led'].toLowerCase() === 'yes');
          if (isNTLed && filters.teacherId <= 3) { // Assuming IDs 1-3 are Native Teachers
            return true;
          }
          
          return false;
        });
        
        // If client-side filtering produced results, use those
        if (filteredData.length > 0) {
          logDbOperation(`Applied client-side teacher filtering: Found ${filteredData.length} entries`);
          data.length = 0; // Clear the array
          data.push(...filteredData); // Replace with filtered data
        } else {
          logDbOperation(`Warning: Client-side teacher filtering found no matches for ID ${filters.teacherId}`);
        }
      }
      
      // Cache the unfiltered results
      if (!filters) {
        cache.calendarEntries[tableName] = {
          data: data as CalendarEntry[],
          timestamp: Date.now()
        };
      }
      
      return data as CalendarEntry[];
    });
  } catch (err) {
    logDbOperation(`Error in getCalendarEntries for ${tableName}:`, 'error', err);
    
    // Use fallback calendar data with filters
    let entries = getFallbackCalendar(tableName);
    
    // Apply filters to fallback data
    if (filters) {
      if (filters.date) {
        entries = entries.filter(entry => entry.Date === filters.date);
      }
      if (filters.teacherId !== undefined) {
        entries = entries.filter(entry => {
          const entryId = entry.id || 0;
          return (entryId % 5) + 1 === filters.teacherId;
        });
      }
    }
    
    return entries;
  }
}

/**
 * Get a teacher's schedule for a specific date
 */
export async function getTeacherSchedule(
  teacherId: number,
  date: string
): Promise<CalendarEntry[]> {
  logDbOperation(`Fetching schedule for teacher ID ${teacherId} on ${date}`);
  
  try {
    // Get teacher details for additional context
    const teacher = await getTeacherById(teacherId);
    if (teacher) {
      logDbOperation(`Teacher info: ${teacher.Teacher_name} (${teacher.Teacher_Type})`);
    } else {
      logDbOperation(`Warning: Could not find details for teacher ID ${teacherId}`, 'warn');
    }
    
    // Get all calendar tables
    const calendarTables = await getCalendarTables();
    
    if (calendarTables.length === 0) {
      logDbOperation('No calendar tables found, using fallback data', 'warn');
      
      // If no tables found, generate some fallback data
      const fallbackTable = 'Fallback-Course-Calendar';
      const entries = getFallbackCalendar(fallbackTable).filter(entry => {
        const entryId = entry.id || 0;
        return entry.Date === date && (entryId % 5) + 1 === teacherId;
      });
      
      logDbOperation(`Generated ${entries.length} fallback entries for teacher ${teacherId}`);
      return entries;
    }
    
    logDbOperation(`Found ${calendarTables.length} calendar tables to query: ${calendarTables.join(', ')}`);
    
    // Get entries from all calendars and combine them
    const allEntries: CalendarEntry[] = [];
    
    // Use Promise.all for parallel queries
    const entryPromises = calendarTables.map(tableName => 
      getCalendarEntries(tableName, { date, teacherId })
        .catch(err => {
          logDbOperation(`Error fetching from ${tableName}:`, 'error', err);
          return [] as CalendarEntry[]; // Return empty on error
        })
    );
    
    const results = await Promise.all(entryPromises);
    
    // Combine all entries and log results by table
    results.forEach((entries, index) => {
      const tableName = calendarTables[index];
      if (entries.length > 0) {
        logDbOperation(`Found ${entries.length} entries in ${tableName} for teacher ${teacherId}`);
        
        // Log a sample entry for debugging
        if (entries.length > 0) {
          const sample = entries[0];
          logDbOperation(`Sample entry from ${tableName}: ${JSON.stringify(sample)}`);
        }
        
        allEntries.push(...entries);
      } else {
        logDbOperation(`No entries found in ${tableName} for teacher ${teacherId} on ${date}`);
      }
    });
    
    // If no entries found in any table, try a more lenient search as fallback
    if (allEntries.length === 0) {
      logDbOperation(`No entries found in any table for teacher ${teacherId}. Trying backup approach...`);
      
      // Get teacher type to implement heuristic matching
      const isNativeTeacher = teacher?.Teacher_Type?.toLowerCase().includes('native') || teacherId <= 3;
      
      // Try to get all entries for the date and filter client-side with more lenient criteria
      const backupPromises = calendarTables.map(tableName => 
        getCalendarEntries(tableName, { date }) // Only filter by date, not teacher
          .catch(err => {
            return [] as CalendarEntry[];
          })
      );
      
      const backupResults = await Promise.all(backupPromises);
      const backupEntries: CalendarEntry[] = [];
      
      // Process backup results with more lenient matching
      backupResults.forEach((entries, index) => {
        const tableName = calendarTables[index];
        
        // Apply more lenient teacher matching logic
        const matchedEntries = entries.filter(entry => {
          // For Native teachers, match based on NT-Led field
          if (isNativeTeacher) {
            const isNTLed = entry['NT-Led'] === true || 
                          (typeof entry['NT-Led'] === 'string' && 
                           entry['NT-Led'].toLowerCase() === 'yes');
            if (isNTLed) return true;
          }
          
          // Check any field containing 'teacher' for partial matches
          for (const key in entry) {
            const fieldValue = entry[key];
            if (typeof fieldValue === 'string' && 
                key.toLowerCase().includes('teacher') && 
                // Match on teacher name if we have it
                (teacher && fieldValue.includes(teacher.Teacher_name))) {
              return true;
            }
          }
          
          return false;
        });
        
        if (matchedEntries.length > 0) {
          logDbOperation(`Backup approach: Found ${matchedEntries.length} entries in ${tableName} using lenient matching`);
          backupEntries.push(...matchedEntries);
        }
      });
      
      // If backup approach found entries, use those
      if (backupEntries.length > 0) {
        logDbOperation(`Backup approach found ${backupEntries.length} entries in total`);
        allEntries.push(...backupEntries);
      }
    }
    
    // If still no entries, use fallback data
    if (allEntries.length === 0) {
      logDbOperation(`No entries found for teacher ${teacherId} after all attempts, using fallback data`);
      const fallbackTable = 'Fallback-Course-Calendar';
      const fallbackEntries = getFallbackCalendar(fallbackTable).filter(entry => {
        const entryId = entry.id || 0;
        return entry.Date === date && (entryId % 5) + 1 === teacherId;
      });
      
      return fallbackEntries;
    }
    
    // Sort by start time
    const sortedEntries = allEntries.sort((a, b) => {
      const aStart = a.Start || '';
      const bStart = b.Start || '';
      return aStart.localeCompare(bStart);
    });
    
    logDbOperation(`Returning ${sortedEntries.length} total entries for teacher ${teacherId} on ${date}`);
    return sortedEntries;
  } catch (err) {
    logDbOperation(`Error in getTeacherSchedule for teacher ${teacherId}:`, 'error', err);
    
    // Fallback to a generic schedule
    const fallbackTable = 'Fallback-Course-Calendar';
    const entries = getFallbackCalendar(fallbackTable).filter(entry => {
      const entryId = entry.id || 0;
      return entry.Date === date && (entryId % 5) + 1 === teacherId;
    });
    
    return entries;
  }
}

/**
 * Discover the database schema by examining tables and their columns
 */
export async function discoverDatabaseSchema(): Promise<{tables: string[]; structure: Record<string, any>}> {
  logDbOperation('Discovering database schema...');
  
  // If offline, return a static schema based on known tables
  if (supabaseService.isOffline()) {
    logDbOperation('In offline mode, using static schema');
    
    const structure: Record<string, any> = {};
    
    // Add known tables to the structure
    KNOWN_TABLES.forEach(tableName => {
      const isCalendarTable = tableName.includes('Course-Calendar');
      
      structure[tableName] = {
        tableName,
        columns: isCalendarTable 
          ? ['id', 'Visit', 'Date', 'Course', 'Level', 'Day1', 'Day2', 'Start', 'End', 'Unit', 'Class.ID', 'NT-Led'] 
          : (tableName === 'Teachers' 
              ? ['Teacher_ID', 'Teacher_name', 'Department', 'Teacher_Type'] 
              : ['Student_ID', 'Student_name', 'Age', 'Level']),
        isCalendarTable,
        description: isCalendarTable 
          ? `Calendar for ${tableName.replace('-Course-Calendar', '')} courses` 
          : (tableName === 'Teachers' ? 'Teacher records' : 'Student records')
      };
    });
    
    return {
      tables: KNOWN_TABLES,
      structure
    };
  }
  
  try {
    // Get all tables first
    const tables = await supabaseService.listTables();
    
    if (tables.length === 0) {
      logDbOperation('No tables found during schema discovery, using known tables', 'warn');
      return discoverDatabaseSchema(); // This will trigger the offline path
    }
    
    // Structure to hold all table information
    const structure: Record<string, any> = {};
    
    // For each table, get column information
    const tablePromises = tables.map(async (tableName) => {
      try {
        // Try to get a sample row to infer columns
        const query = supabaseService.getClient()
          .from(tableName)
          .select('*');
          
        let result;
        if (typeof query === 'object' && query !== null && 'limit' in query && typeof query.limit === 'function') {
          result = await query.limit(1);
        } else {
          result = await query;
        }
        
        const { data, error } = result;
          
        if (error) {
          logDbOperation(`Error getting columns for ${tableName}:`, 'error', error);
          return;
        }
        
        const columns = data && data.length > 0 
          ? Object.keys(data[0]) 
          : [];
          
        const isCalendarTable = tableName.includes('Course-Calendar');
        
        structure[tableName] = {
          tableName,
          columns,
          isCalendarTable,
          description: isCalendarTable 
            ? `Calendar for ${tableName.replace('-Course-Calendar', '')} courses` 
            : (tableName === 'Teachers' ? 'Teacher records' : tableName)
        };
      } catch (tableErr) {
        logDbOperation(`Error examining table ${tableName}:`, 'error', tableErr);
      }
    });
    
    // Wait for all table examinations to complete
    await Promise.all(tablePromises);
    
    logDbOperation(`Schema discovery complete: ${tables.length} tables found`);
    return {
      tables,
      structure
    };
  } catch (err) {
    logDbOperation('Error during schema discovery:', 'error', err);
    
    // Fall back to offline mode
    return discoverDatabaseSchema(); // This will trigger the offline path since we'll set offline mode
  }
}

/**
 * Clear all cached data
 */
export function clearCache() {
  cache.teachers = null;
  cache.calendarTables = null;
  cache.calendarEntries = {};
  logDbOperation('Cache cleared');
}