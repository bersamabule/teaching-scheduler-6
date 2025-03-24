# Data Synchronization Documentation

## Overview

The Teaching Scheduler 6 application includes a robust data synchronization system that automatically refreshes data when the connection to the Supabase database is restored after an offline period. This feature ensures a seamless user experience by transparently updating the UI with the latest data when connectivity is reestablished.

## Architecture

The data synchronization system consists of several components working together:

1. **SupabaseService** - The central service that manages database connectivity and synchronization
2. **Component Registration** - A mechanism for components to register when they are using fallback data
3. **Observer Pattern** - Notification system to inform components when synchronization occurs
4. **SynchronizationIndicator** - UI component that provides visual feedback during synchronization

## How It Works

### 1. Fallback Data Registration

When a component falls back to using local data, it registers itself with the SupabaseService:

```typescript
// Component using fallback data
if (usingFallbackData) {
  supabaseService.registerFallbackUsage('ComponentID');
}
```

The SupabaseService maintains a set of all components currently using fallback data.

### 2. Connection Monitoring

The SupabaseService continuously monitors the connection status to the Supabase database:

- When connection is lost, components switch to fallback data
- When connection is restored, the reconnect method triggers the synchronization process

### 3. Synchronization Process

When a connection is restored, the following process occurs:

1. The SupabaseService checks if any components are using fallback data
2. If there are components using fallback data, it initiates synchronization
3. It notifies all observers that synchronization has started
4. All cached data is cleared to ensure fresh data retrieval
5. Once completed, it notifies observers that synchronization is finished
6. Components reload their data from the database

### 4. Visual Feedback

The SynchronizationIndicator component provides visual feedback during the synchronization process:

- Shows an animated spinner when synchronization is in progress
- Displays a success message when synchronization completes
- Automatically disappears after a short period

## Component Integration

To integrate a component with the synchronization system:

1. **Register Fallback Usage**:
   ```typescript
   useEffect(() => {
     if (usingFallbackData) {
       supabaseService.registerFallbackUsage('ComponentID');
     } else {
       supabaseService.unregisterFallbackUsage('ComponentID');
     }
     
     return () => {
       supabaseService.unregisterFallbackUsage('ComponentID');
     };
   }, [usingFallbackData]);
   ```

2. **Listen for Synchronization Events**:
   ```typescript
   useEffect(() => {
     const observer = {
       onConnectionStatusChanged: () => {},
       onSynchronizationComplete: () => {
         if (usingFallbackData) {
           reloadData();
         }
       }
     };

     supabaseService.addObserver(observer);
     return () => {
       supabaseService.removeObserver(observer);
     };
   }, [usingFallbackData]);
   ```

3. **Add SynchronizationIndicator** (for pages):
   ```typescript
   <div className="mb-4">
     <SynchronizationIndicator position="top" />
   </div>
   ```

## Integrated Components

The following components are integrated with the synchronization system:

- **TeacherSelect**: Reloads teacher data after synchronization
- **WeeklyCalendar**: Refreshes calendar entries from the database
- **SchedulePage**: Manages overall page refresh and shows synchronization status
- **DatabaseExplorer**: Reloads tables and current table data

## Benefits

1. **Seamless User Experience**: Users don't need to manually refresh after regaining connection
2. **Data Consistency**: Ensures all components have the latest data after reconnection
3. **Visual Feedback**: Provides clear indicators of synchronization progress
4. **Error Prevention**: Reduces the risk of working with stale data

## Future Enhancements

1. **Selective Synchronization**: Only reload affected data instead of clearing all cache
2. **Background Synchronization**: Perform synchronization in the background for less disruption
3. **Conflict Resolution**: Handle cases where local edits were made during offline period
4. **Synchronization Queue**: Implement a queue system for handling multiple synchronization requests 