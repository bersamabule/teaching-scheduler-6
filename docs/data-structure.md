# Data Structure Documentation

## Data Sources

### Primary: Supabase "iWorld Scheduler"
The application's primary data source is the Supabase "iWorld Scheduler" project. All components are designed to fetch data from this source first, with fallback mechanisms only used when the primary source is unavailable.

### Fallback: Mock Data System
A minimal fallback system provides temporary data only when the primary Supabase source is unavailable. This is not intended as a production solution, but rather as a development tool and emergency fallback.

## Core Data Types

### Teacher
```typescript
export interface Teacher {
  Teacher_ID: number;
  Teacher_name: string;
  Department?: string;
  Teacher_Type?: string;
  [key: string]: any;
}
```

The `Teacher` interface represents teaching staff in the system. Key fields include:
- `Teacher_ID`: Unique identifier for each teacher
- `Teacher_name`: The teacher's full name
- `Department`: Optional department affiliation
- `Teacher_Type`: Categorizes teachers as "Native" or "Local"

### CalendarEntry
```typescript
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
```

The `CalendarEntry` interface represents scheduled classes. Key fields include:
- `id`: Unique identifier for the calendar entry
- `Visit`: Visit number in the course sequence
- `Date`: The date of the class in ISO format (YYYY-MM-DD)
- `Course`: Course identifier (e.g., "Sprouts2", "Clover3A")
- `Level`: Difficulty level (e.g., "Beginner", "Intermediate", "Advanced")
- `Day1`/`Day2`: Teacher assignments for the class days
- `Start`/`End`: Class time range
- `Unit`: Course unit being taught
- `NT-Led`: Boolean indicating if the class is led by a Native Teacher

### TableSchema
```typescript
export interface TableSchema {
  tableName: string;
  columns: string[];
  isCalendarTable: boolean;
  description?: string;
}
```

The `TableSchema` interface describes database tables in the system:
- `tableName`: Name of the table in the database
- `columns`: List of column names in the table
- `isCalendarTable`: Boolean indicating if this table contains calendar data
- `description`: Optional description of the table's purpose

## Data Storage

### Primary: Supabase Tables
The Supabase "iWorld Scheduler" project contains all necessary tables for the application:

1. **Teachers**  
   Contains teacher records with fields matching the `Teacher` interface.

2. **Course Calendar Tables**  
   Multiple tables with names following the pattern `{CourseName}-Course-Calendar`.
   Examples:
   - `Sprouts2-Course-Calendar`
   - `Clover3A-Course-Calendar`
   - `Clover2A-Course-Calendar`
   
   These tables contain calendar entries for specific courses.

3. **Students-English**  
   Contains student information for English courses.

### Cache System
```typescript
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
```

The application implements a caching system to reduce database queries:
- `teachers`: Cached list of all teachers
- `calendarTables`: Cached list of tables containing calendar data
- `calendarEntries`: Cached calendar entries, indexed by query parameters
- Each cache entry includes a timestamp for expiration checking

### Fallback: Mock Data
When Supabase is unavailable, the application falls back to a minimal mock dataset:

```typescript
// Example fallback teacher data - used ONLY when Supabase is unavailable
[
  { Teacher_ID: 1, Teacher_name: 'Andrew', Teacher_Type: 'Native' },
  { Teacher_ID: 2, Teacher_name: 'Emma', Teacher_Type: 'Native' },
  // Limited additional records...
]
```

This fallback data is not intended as a replacement for real data but serves as a development tool and emergency fallback system.

## Data Relationships

The data model has the following relationships:

1. **Teachers to Calendar Entries**:
   - Native teachers can be assigned to any class marked as "NT-Led"
   - Local teachers are explicitly assigned to classes via the `Day1` and `Day2` fields

2. **Courses to Calendar Entries**:
   - Each course has its own calendar table
   - Calendar entries are linked to courses via the `Course` field

3. **Students to Courses**:
   - Student enrollment data links students to specific courses

## Data Flow

1. User selects a teacher in the UI
2. Application attempts to fetch real data from Supabase "iWorld Scheduler"
3. If successful, the data is processed and displayed
4. Only if Supabase connection fails, application uses fallback data
5. For Native teachers: application retrieves all NT-Led classes
6. For Local teachers: application retrieves only classes explicitly assigned
7. Calendar entries are filtered by date range if specified
8. Filtered entries are displayed in the WeeklyCalendar component
9. UI indicates if fallback data is being used instead of real data 