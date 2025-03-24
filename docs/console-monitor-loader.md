# ConsoleMonitorLoader Component

## Overview

The ConsoleMonitorLoader is a client-side utility component in the Teaching Scheduler application that enables comprehensive browser console logging capture. It works silently in the background to intercept console messages and forward them to the Console Monitor MCP Server, facilitating easier debugging and error analysis.

## Component Location

`src/components/ConsoleMonitorLoader.tsx`

## Features

- **Transparent console capture**: Intercepts all browser console methods (log, info, warn, error, debug)
- **Zero UI footprint**: Works entirely in the background with no visible elements
- **Unhandled error capture**: Captures unhandled exceptions and promise rejections
- **Client-side only**: Runs exclusively in the browser, not during server-side rendering
- **Single initialization**: Only injects the monitoring script once per session
- **API integration**: Forwards captured logs to the Console Monitor MCP Server via API routes
- **Metadata preservation**: Attempts to preserve object type information when logging objects

## Implementation

The ConsoleMonitorLoader component uses the following approach to capture console logs:

1. **Script Injection**:
   - Uses a React `useEffect` hook to inject the monitoring script
   - Only executes in the browser environment (`typeof window !== 'undefined'`)
   - Creates a script element and appends it to the document head

2. **Console Method Override**:
   - Saves references to original console methods
   - Replaces console methods with custom versions that:
     - Call the original method to maintain normal console behavior
     - Send the log data to the server via fetch API

3. **Error Event Listeners**:
   - Adds event listeners for 'error' and 'unhandledrejection' events
   - Captures stack traces when available
   - Logs these errors to the server as 'error' level messages

4. **Log Formatting**:
   - Converts objects to strings when possible
   - Preserves object type information in metadata
   - Handles circular references gracefully

## Integration with MCP Server

The component sends logs to the server using the following pattern:

```typescript
fetch('/api/console-monitor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    meta
  })
})
```

This request is handled by:
1. The Next.js API route at `src/app/api/console-monitor/route.ts`
2. Which forwards the request to the Console Monitor MCP Server
3. Where logs are stored and made available via API endpoints and MCP tools

## Usage

The ConsoleMonitorLoader should be included once in your application, typically in a layout component or a component that wraps the entire application:

```tsx
// In src/app/layout.tsx or similar
import ConsoleMonitorLoader from '@/components/ConsoleMonitorLoader';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ConsoleMonitorLoader />
      </body>
    </html>
  );
}
```

## Best Practices

1. **Performance**: The monitor adds minimal overhead, but be aware it does intercept all console calls
2. **Security**: Log content is sent to the local MCP server; don't log sensitive information
3. **Environment**: Consider only enabling in development or staging environments
4. **Error handling**: The monitor's fetch calls are wrapped in try/catch to prevent infinite error loops

## Testing

The component can be tested by:

1. Verifying logs appear in the MCP server
2. Checking that unhandled errors are captured
3. Testing its behavior with different types of console messages
4. Confirming it works across different browsers

## Technical Details

The injected script overrides console methods using this pattern:

```javascript
// Save original method
const originalMethod = console.method;

// Replace with custom version
console.method = function() {
  // Call original method
  originalMethod.apply(console, arguments);
  
  // Send to server
  sendLog('method', arguments);
};
```

## Future Enhancements

Potential improvements for the ConsoleMonitorLoader:

1. Add ability to toggle logging based on environment variables
2. Implement log batching to reduce network requests
3. Add log filtering before sending to the server
4. Include more detailed browser and context information with logs
5. Add client-side log storage for offline operation
6. Implement secure transmission for sensitive log data 