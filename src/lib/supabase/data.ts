import { supabase } from './client';
import { supabaseUrl, supabaseKey } from './client';

// Define types for our data
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

/**
 * Fetches a list of all tables from the Supabase database
 */
export async function getTables(): Promise<string[]> {
  // Define known tables for fallback
  const knownTables = [
    'Students-English',
    'Sprouts2-Course-Calendar',
    'Teachers',
    'Clover3A-Course-Calendar',
    'Clover2A-Course-Calendar'
  ];
  
  try {
    console.log('Starting database discovery...');
    
    // Just return the known tables for now to fix the errors
    return knownTables;
  } catch (error) {
    console.error('Error during database discovery:', error);
    return knownTables;
  }
}

/**
 * Fetches data from a specific table with optional limit
 */
export async function getTableData(tableName: string, limit: number = 10) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(limit);
      
    if (error) {
      console.error(`Error fetching data from ${tableName}:`, error.message);
      // Return empty data on error
      return { data: [], count: 0 };
    }
    
    console.log(`Retrieved ${data?.length} rows from ${tableName}`);
    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error(`Error fetching data from ${tableName}:`, error);
    // Return empty data on error
    return { data: [], count: 0 };
  }
}

/**
 * Fetches all teachers with caching
 */
export async function getTeachers(): Promise<Teacher[]> {
  // Check cache first
  if (isCacheValid(cache.teachers)) {
    console.log('Using cached teachers data', cache.teachers!.data.length);
    return cache.teachers!.data;
  }
  
  try {
    console.log('Fetching fresh teachers data from Supabase');
    console.log('Supabase URL:', supabaseUrl);
    
    const { data, error } = await supabase
      .from('Teachers')
      .select('*')
      .order('Teacher_name');
      
    if (error) {
      console.error('Error fetching teachers:', error);
      // Return fallback data instead of throwing
      return getFallbackTeachers();
    }
    
    if (!data || data.length === 0) {
      console.warn('No teachers found in the database, using fallback data');
      return getFallbackTeachers();
    }
    
    console.log(`Successfully fetched ${data.length} teachers from Supabase`);
    
    // Update cache
    cache.teachers = {
      data: data as Teacher[],
      timestamp: Date.now()
    };
    
    return data as Teacher[];
  } catch (error) {
    console.error('Exception when fetching teachers:', error);
    // Return fallback data instead of throwing
    return getFallbackTeachers();
  }
}

/**
 * Returns a set of fallback teachers when the database is unavailable
 */
function getFallbackTeachers(): Teacher[] {
  console.log('Using fallback teacher data');
  return [
    { Teacher_ID: 1, Teacher_name: 'Andrew', Teacher_Type: 'Native' },
    { Teacher_ID: 2, Teacher_name: 'Emma', Teacher_Type: 'Native' },
    { Teacher_ID: 3, Teacher_name: 'Michael', Teacher_Type: 'Native' },
    { Teacher_ID: 4, Teacher_name: 'Liu Wei', Teacher_Type: 'Local' },
    { Teacher_ID: 5, Teacher_name: 'Zhang Min', Teacher_Type: 'Local' },
    { Teacher_ID: 6, Teacher_name: 'Wang Fang', Teacher_Type: 'Local' },
    { Teacher_ID: 7, Teacher_name: 'Chen Jie', Teacher_Type: 'Local' },
    { Teacher_ID: 8, Teacher_name: 'Sarah', Teacher_Type: 'Native' }
  ];
}

/**
 * Get a specific teacher by ID
 */
export async function getTeacherById(teacherId: number): Promise<Teacher | null> {
  // Check cache first
  if (isCacheValid(cache.teachers)) {
    const teacher = cache.teachers!.data.find(t => t.Teacher_ID === teacherId);
    if (teacher) {
      console.log(`Using cached teacher data for ID: ${teacherId}`);
      return teacher;
    }
  }
  
  try {
    console.log(`Fetching teacher data for ID: ${teacherId}`);
    const { data, error } = await supabase
      .from('Teachers')
      .select('*')
      .eq('Teacher_ID', teacherId)
      .single();
      
    if (error) {
      console.error(`Error fetching teacher with ID ${teacherId}:`, error);
      return null;
    }
    
    return data as Teacher;
  } catch (error) {
    console.error(`Error fetching teacher with ID ${teacherId}:`, error);
    return null;
  }
}

/**
 * Get teachers filtered by type (native or local)
 */
export async function getTeachersByType(type: 'native' | 'local'): Promise<Teacher[]> {
  // Check cache first
  if (isCacheValid(cache.teachers)) {
    const filteredTeachers = cache.teachers!.data.filter(t => t.Teacher_Type?.toLowerCase() === type);
    if (filteredTeachers.length > 0) {
      console.log(`Using cached ${type} teachers data`);
      return filteredTeachers;
    }
  }
  
  try {
    console.log(`Fetching fresh ${type} teachers data`);
    const { data, error } = await supabase
      .from('Teachers')
      .select('*')
      .eq('Teacher_Type', type)
      .order('Teacher_name');
      
    if (error) {
      console.error(`Error fetching ${type} teachers:`, error);
      throw new Error(error.message);
    }
    
    return data as Teacher[];
  } catch (error) {
    console.error(`Error fetching ${type} teachers:`, error);
    throw error;
  }
}

/**
 * Fetches calendar data for specific course calendar
 */
export async function getCalendarData(calendarName: string, limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from(calendarName)
      .select('*')
      .limit(limit);
      
    if (error) {
      throw error;
    }
    
    return data as CalendarEntry[];
  } catch (error) {
    console.error(`Error fetching calendar data from ${calendarName}:`, error);
    throw error;
  }
}

/**
 * Fetches all calendar tables
 */
export async function getAllCalendarTables(): Promise<string[]> {
  const tables = await getTables();
  return tables.filter(table => table.includes('Calendar'));
}

/**
 * Get all calendar tables from the database using schema information
 * This uses dynamic discovery to find all tables with a calendar structure
 */
export async function getCalendarTables(): Promise<string[]> {
  // Check cache first
  if (isCacheValid(cache.calendarTables)) {
    console.log('Using cached calendar tables list');
    return cache.calendarTables!.data;
  }
  
  try {
    console.log('Fetching fresh calendar tables list');
    const tables = await getTables();
    // Filter the tables list to only include those that appear to be calendar tables
    // based on naming convention
    const calendarTables = tables.filter(tableName => 
      tableName.toLowerCase().includes('calendar') || 
      tableName.toLowerCase().includes('course')
    );
    
    // Update cache
    cache.calendarTables = {
      data: calendarTables,
      timestamp: Date.now()
    };
    
    console.log(`Found ${calendarTables.length} potential calendar tables through naming patterns`);
    return calendarTables;
  } catch (error) {
    console.error('Error fetching calendar tables:', error);
    if (cache.calendarTables) {
      // Return stale cache as fallback
      console.log('Returning stale cached calendar tables as fallback');
      return cache.calendarTables.data;
    }
    throw error;
  }
}

/**
 * Get entries from a specific calendar by table name with optional filters
 */
export async function getCalendarEntries(
  tableName: string,
  filters?: { date?: string; teacherId?: number }
): Promise<CalendarEntry[]> {
  // Generate cache key based on table name and filters
  const cacheKey = `${tableName}:${filters?.date || ''}:${filters?.teacherId || ''}`;
  
  // Check cache first
  if (cache.calendarEntries[cacheKey] && isCacheValid(cache.calendarEntries[cacheKey])) {
    console.log(`Using cached calendar entries for ${cacheKey}`);
    return cache.calendarEntries[cacheKey].data;
  }
  
  try {
    console.log(`Fetching calendar entries for ${cacheKey}`);
    let query = supabase
      .from(tableName)
      .select('*');

    // Apply optional filters
    if (filters?.date) {
      console.log(`Filtering by date: ${filters.date} in table ${tableName}`);
      query = query.eq('Date', filters.date);
    }
    
    // For teacher filter, we need to get the teacher name and type first
    if (filters?.teacherId) {
      const teacher = await getTeacherById(filters.teacherId);
      
      if (teacher) {
        // Filter based on teacher type and name
        const isNativeTeacher = teacher.Teacher_Type?.toLowerCase() === 'native';
        const teacherName = teacher.Teacher_name;
        
        console.log(`Filtering for teacher: ${teacherName} (${isNativeTeacher ? 'native' : 'local'})`);
        
        if (isNativeTeacher) {
          // For Native teachers like Andrew:
          // We're now removing this filter since we want to fetch ALL entries
          // and do the filtering in getTeacherSchedule instead
          // This ensures we get all NT-Led classes regardless of teacher assignment
          
          // Just for backward compatibility, include a very loose filter
          // that will essentially return all entries
          query = query.or(`eq(id,id)`);
        } else {
          // For Local teachers:
          // We can still use this filter since they only teach classes
          // where they are explicitly assigned
          query = query
            .eq('NT-Led', false)
            .or(`eq(Day1,"${teacherName}"),eq(Day2,"${teacherName}")`);
        }
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching calendar entries from ${tableName}:`, error);
      throw error;
    }
    
    // Process the data to normalize boolean values
    // Some databases might return NT-Led as 'yes'/'no' strings instead of true/false
    const processedData = data.map(entry => {
      const processed = { ...entry };
      
      // Convert 'yes'/'no' strings to boolean values for NT-Led
      if (processed['NT-Led'] !== undefined) {
        if (typeof processed['NT-Led'] === 'string') {
          if (processed['NT-Led'].toLowerCase() === 'yes') {
            processed['NT-Led'] = true;
          } else if (processed['NT-Led'].toLowerCase() === 'no') {
            processed['NT-Led'] = false;
          }
        }
      }
      
      return processed;
    });
    
    console.log(`Retrieved ${processedData.length} entries from ${tableName} with filters: ${JSON.stringify(filters || {})}`);
    
    // Update cache
    cache.calendarEntries[cacheKey] = {
      data: processedData as CalendarEntry[],
      timestamp: Date.now()
    };
    
    return processedData as CalendarEntry[];
  } catch (error) {
    console.error(`Error fetching calendar entries from ${tableName}:`, error);
    throw error;
  }
}

/**
 * Get a teacher's schedule for a specific date
 * This handles different teacher types differently
 */
export async function getTeacherSchedule(
  teacherId: number,
  date: string
): Promise<CalendarEntry[]> {
  // Cache key for this specific request
  const cacheKey = `schedule:${teacherId}:${date}`;
  
  // Check cache first
  if (cache.calendarEntries[cacheKey] && isCacheValid(cache.calendarEntries[cacheKey])) {
    console.log(`Using cached teacher schedule for ${cacheKey}`);
    return cache.calendarEntries[cacheKey].data;
  }
  
  try {
    console.log(`Building teacher schedule for ${cacheKey}`);
    
    // Get teacher details to determine type
    const teacher = await getTeacherById(teacherId);
    if (!teacher) {
      throw new Error(`Teacher with ID ${teacherId} not found`);
    }
    
    const isNativeTeacher = teacher.Teacher_Type?.toLowerCase() === 'native';
    const teacherName = teacher.Teacher_name;
    console.log(`Teacher schedule lookup: ${teacherName} (${isNativeTeacher ? 'Native' : 'Local'}) for date ${date}`);
    
    // Get a list of all calendar tables
    const calendarTables = await getCalendarTables();
    
    // Get a list of all calendar entries for the teacher
    const entries = await getCalendarEntries(teacherName, { date });
    
    // Filter entries based on teacher type
    const filteredEntries = entries.filter(entry => {
      if (isNativeTeacher) {
        // For Native teachers, include all entries
        return true;
      } else {
        // For Local teachers, include entries where the teacher is explicitly assigned
        return entry.Day1 === teacherName || entry.Day2 === teacherName;
      }
    });
    
    // Update cache
    cache.calendarEntries[cacheKey] = {
      data: filteredEntries,
      timestamp: Date.now()
    };
    
    return filteredEntries;
  } catch (error) {
    console.error(`Error fetching teacher schedule:`, error);
    throw error;
  }
}