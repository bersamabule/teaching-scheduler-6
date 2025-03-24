# ConnectionStatusIndicator Component

## Overview

The ConnectionStatusIndicator is a key UI component in the Teaching Scheduler application that provides real-time visual feedback on the status of the Supabase database connection. It enhances the application's reliability by making connection issues immediately visible to users and offering ways to resolve them.

## Component Location

`src/components/ConnectionStatusIndicator.tsx`

## Features

- **Real-time status visualization**: Displays the current connection status with color-coding:
  - Green: Connected
  - Yellow: Connecting
  - Red: Error
  - Gray: Disconnected

- **Interactive details panel**: Allows users to click the indicator to see detailed information about the connection status

- **Error details**: Shows specific error messages when connection problems occur

- **Manual reconnection**: Provides a "Reconnect" button that triggers a manual reconnection attempt

- **Automatic retry**: Works with the supabaseService to implement exponential backoff for reconnection attempts

- **Toast notifications**: When integrated with a toast system, notifies users of connection status changes

- **Compact and detailed modes**: Can be displayed as just an indicator dot or with accompanying text

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showDetails` | boolean | `false` | Whether to show the status text next to the indicator dot |
| `className` | string | `''` | Additional CSS classes to apply to the container |

## Implementation

The ConnectionStatusIndicator relies on the Observer pattern to receive updates about connection status changes. Key implementation details:

1. **State Management**:
   - Tracks connection status (connected, connecting, error, disconnected)
   - Stores error messages
   - Manages expanded/collapsed state of the details panel

2. **Observer Registration**:
   - Registers with the supabaseService as an observer
   - Receives notifications when connection status changes
   - Cleans up the observer on component unmount

3. **Visual Representation**:
   - Maps connection states to appropriate colors and text
   - Provides hover tooltips for quick status identification
   - Shows detailed information when expanded

4. **User Interaction**:
   - Clicking the indicator toggles the expanded details panel
   - Reconnect button triggers a manual reconnection attempt
   - Handles error states gracefully

## Integration with Supabase Service

The component relies on the following methods from the supabaseService:

- `getStatus()`: Gets the current connection status
- `getLastError()`: Retrieves the most recent connection error
- `addObserver()`: Registers as an observer for status changes
- `removeObserver()`: Unregisters as an observer
- `reconnect()`: Triggers a manual reconnection attempt

## Usage Example

```tsx
// Basic usage (compact mode)
<ConnectionStatusIndicator />

// With details text shown
<ConnectionStatusIndicator showDetails={true} />

// With custom styling
<ConnectionStatusIndicator className="absolute top-4 right-4" />

// In a header component
<header className="flex justify-between items-center p-4">
  <Logo />
  <ConnectionStatusIndicator showDetails={true} />
</header>
```

## Best Practices

1. **Placement**: Position the indicator where it's visible but not distracting, such as in a header or sidebar
2. **Context**: Use `showDetails={true}` in admin interfaces or settings pages where users need more information
3. **Integration**: Combine with toast notifications for important connection status changes
4. **Error Handling**: Make sure error boundaries wrap components that depend on the Supabase connection

## Testing

The component can be tested using:

1. **Unit tests**: Verify that the component renders correctly in different states
2. **Integration tests**: Confirm proper observer registration and callback handling
3. **End-to-end tests**: Simulate connection failures and verify visual feedback

## Future Enhancements

Potential improvements for the ConnectionStatusIndicator:

1. Add configurable retry intervals for reconnection attempts
2. Include network diagnostic information in the details panel
3. Implement a connection quality indicator (latency, etc.)
4. Add ability to switch to offline mode manually
5. Provide more detailed connection history 