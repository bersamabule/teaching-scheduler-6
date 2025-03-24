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
    // Use the enhanced service to list tables
    const tables = await supabaseService.listTables();
    
    if (tables.length === 0) {
      logDbOperation('No tables found, using known table list', 'warn');
      return KNOWN_TABLES;
    }
    
    // Update the cache
    cache.calendarTables = {
      data: tables,
      timestamp: Date.now()
    };
    
    logDbOperation(`Discovered ${tables.length} tables`);
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
      const { data, error, count } = await supabaseService.getClient()
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(limit);
      
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
      const { data, error } = await supabaseService.getClient()
        .from('Teachers')
        .select('*')
        .ilike('Teacher_Type', `%${type}%`);
      
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
            // This assumes there's a teacher ID field in the entry
            // Adapt this based on the actual data structure
            return entry.Teacher_ID === filters.teacherId || 
                   entry.TeacherID === filters.teacherId ||
                   entry.teacherId === filters.teacherId;
          });
        }
      }
      
      return entries;
    }
    
    // Query from database with filters
    return await supabaseService.executeQuery(async () => {
      let query = supabaseService.getClient()
        .from(tableName)
        .select('*');
      
      // Apply filters
      if (filters) {
        if (filters.date) {
          query = query.eq('Date', filters.date);
        }
        if (filters.teacherId !== undefined) {
          // Try different teacher ID field names
          // Adapt this query based on the actual field name in the database
          query = query.or(`Teacher_ID.eq.${filters.teacherId},TeacherID.eq.${filters.teacherId},teacherId.eq.${filters.teacherId}`);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        logDbOperation(`Error fetching calendar entries from ${tableName}:`, 'error', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        logDbOperation(`No calendar entries found in ${tableName}, using fallback`, 'warn');
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
      
      return entries;
    }
    
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
    
    // Combine all entries
    results.forEach(entries => {
      allEntries.push(...entries);
    });
    
    // Sort by start time
    return allEntries.sort((a, b) => {
      const aStart = a.Start || '';
      const bStart = b.Start || '';
      return aStart.localeCompare(bStart);
    });
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
        const { data, error } = await supabaseService.getClient()
          .from(tableName)
          .select('*')
          .limit(1);
          
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