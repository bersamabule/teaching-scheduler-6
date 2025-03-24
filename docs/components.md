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
- Comprehensive color-coding system for different course types:
  - Sprouts classes (purple)
  - Clovers classes (green)
  - Guardians classes (blue)
  - Workshop classes (amber)
  - Advanced-level classes (rose/pink)
- Differentiates NT-Led and Local Teacher classes with color intensity
- Advanced filtering capabilities:
  - Filter by course type (Sprouts, Clovers, Guardians, etc.)
  - Filter by NT-Led status
  - Clear visual indicators for active filters
- Interactive class detail view with modal display
- Synchronizes with offline/online status for data consistency
- Shows class counts and NT-Led counts for each day

### ConnectionStatusIndicator
**Location:** `src/components/ConnectionStatusIndicator.tsx`
**Purpose:** Displays the current status of the Supabase database connection.
**Features:**
- Real-time visual feedback on connection status (Connected, Connecting, Error)
- Color-coded status indicators (green, yellow, red)
- Click-to-retry functionality
- Toast notifications for status changes
- Detailed error display on hover/click
- Automatic retry with exponential backoff
- Integration with session context for global state management

### ConsoleMonitor
**Location:** `src/components/ConsoleMonitor.tsx`
**Purpose:** Captures and displays console logs for debugging purposes.
**Features:**
- Integrates with MCP server
- Displays logs in a clean, organized format
- Filters logs by type (error, warning, info)

### ConsoleMonitorLoader
**Location:** `src/components/ConsoleMonitorLoader.tsx`
**Purpose:** Injects the console monitoring script into the browser.
**Features:**
- Client-side only component
- Overrides browser console methods to capture logs
- Forwards logs to the MCP server via API routes
- Captures unhandled errors and promise rejections
- Works silently in the background with zero UI impact
- Initializes only once per session

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
- Logs errors to console monitor
- Provides retry functionality
- Supports custom fallback components
- Includes automatic retry for transient errors

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
3. Utility components (ErrorBoundary, ConnectionStatusIndicator) provide support functions
4. Background components (ConsoleMonitorLoader) operate silently to enhance functionality

## Component Design Principles

All components follow these design principles:
- Self-contained with minimal dependencies
- Responsive design for different screen sizes
- Fallback behaviors for error states
- Consistent visual language and interaction patterns

## FallbackIndicator

The `FallbackIndicator` component provides a visual alert when the application is using local fallback data due to connectivity issues with the Supabase database.

### Props

- `position`: Position of the indicator - either 'top' (full width banner) or 'inline' (compact badge)
- `showDetails`: Whether to display additional information and actions
- `className`: Additional CSS classes to apply to the component

### Features

- Automatically monitors connection status via Supabase service
- Only displays when offline/fallback mode is active
- Provides a reconnect button when details are shown
- Clear, consistent styling across the application
- Unobtrusive, yet noticeable indication of fallback mode

### Integration Points

The FallbackIndicator is integrated in several key components:
- TeacherSelect component (inline position)
- Schedule page (top position with details)
- Database Explorer page (top position with details)
- WeeklyCalendar component (inline position)

### Example Usage

```tsx
// Top banner with details
<FallbackIndicator position="top" showDetails={true} />

// Inline indicator without details
<FallbackIndicator position="inline" showDetails={false} />
``` 