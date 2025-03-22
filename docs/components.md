# Component Documentation

## UI Components

### TeacherSelect
**Location:** `src/components/TeacherSelect.tsx`
**Purpose:** Provides a dropdown interface for selecting teachers with filtering capabilities.
**Features:**
- Categorizes teachers by type (Native, Local, Other)
- Includes search functionality for filtering teachers
- Provides visual indicators for teacher types
- Includes a clear button to reset selection
- Falls back to mock data when database is unavailable

### DateSelect
**Location:** `src/components/DateSelect.tsx`
**Purpose:** Allows users to select date ranges for viewing schedules.
**Features:**
- Displays current week by default
- Provides navigation to previous/next weeks
- Allows selection of specific dates

### WeeklyCalendar
**Location:** `src/components/WeeklyCalendar.tsx`
**Purpose:** Visualizes the teaching schedule in a weekly format.
**Features:**
- Displays classes in a time-slot grid
- Shows teacher assignments for each class
- Highlights classes based on teacher type
- Provides visual indicators for special class types

### ConsoleMonitor
**Location:** `src/components/ConsoleMonitor.tsx`
**Purpose:** Captures and displays console logs for debugging purposes.
**Features:**
- Integrates with MCP server
- Displays logs in a clean, organized format
- Filters logs by type (error, warning, info)

## Page Components

### Schedule Page
**Location:** `src/app/schedule/page.tsx`
**Purpose:** Main scheduling interface for viewing and managing teaching assignments.
**Features:**
- Integrates TeacherSelect and DateSelect components
- Displays the WeeklyCalendar component
- Manages state for selected teachers and dates
- Handles loading states and errors

### Database Explorer
**Location:** `src/app/explorer/page.tsx`
**Purpose:** Provides an interface for exploring the database structure and contents.
**Features:**
- Displays tables and their relationships
- Shows data in each table
- Allows filtering and searching of data
- Falls back to mock data when database is unavailable

### Teacher Inspector
**Location:** `src/app/teacher-inspector/page.tsx`
**Purpose:** Detailed view for analyzing individual teacher schedules and metrics.
**Features:**
- Shows comprehensive information about selected teacher
- Displays teaching hours, class types, and other metrics
- Provides schedule visualization for the teacher

## Utility Components

### ErrorBoundary
**Location:** `src/components/ErrorBoundary.tsx`
**Purpose:** Prevents UI crashes by catching errors in child components.
**Features:**
- Catches runtime errors in components
- Displays fallback UI when errors occur
- Logs errors for debugging
- Allows users to retry failed components

### LoadingIndicator
**Location:** `src/components/LoadingIndicator.tsx`
**Purpose:** Provides visual feedback during asynchronous operations.
**Features:**
- Shows spinner during data loading
- Provides context-specific loading messages
- Supports different sizes and styles

### ModalDialog
**Location:** `src/components/ModalDialog.tsx`
**Purpose:** Displays modal dialogs for confirmations and notifications.
**Features:**
- Blocks interaction with background content
- Supports different types (confirmation, notification, error)
- Provides customizable actions and content

## Component Relationships

The components are organized in a hierarchical structure:

1. Page components (`page.tsx`) serve as containers and manage overall state
2. Main UI components (TeacherSelect, WeeklyCalendar) implement core functionality
3. Utility components (ErrorBoundary, LoadingIndicator) provide support functions

All components follow these design principles:
- Self-contained with minimal dependencies
- Responsive design for different screen sizes
- Fallback behaviors for error states
- Consistent visual language and interaction patterns 