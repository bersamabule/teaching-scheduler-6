# Error Boundaries Documentation

## Overview

The Teaching Scheduler 6 application implements a comprehensive error boundary system to prevent UI crashes and provide graceful fallback experiences when errors occur. This document explains the error boundary architecture, usage patterns, and best practices.

## Architecture

The error boundary system consists of:

1. A core `ErrorBoundary` component that catches JavaScript errors in its child component tree
2. A higher-order component (HOC) wrapper `withErrorBoundary` for functional components
3. Integration with the MCP console monitor for error reporting
4. Custom error handlers for different component types

## Key Features

- **Isolated Error Containment**: Errors in one component don't crash the entire application
- **Custom Fallback UI**: Configurable fallback UI when errors occur
- **Detailed Error Reporting**: Integration with MCP console monitoring for debugging
- **Retry Capability**: Built-in functionality to retry component rendering
- **Reconnection Support**: Database reconnection option when errors are related to connectivity
- **Developer-Friendly Debugging**: Stack traces available in development mode

## Implementation Details

### Core Components

1. **ErrorBoundary Class Component**: 
   - Implements React's error boundary lifecycle methods
   - Provides fallback UI, retry button, and reconnect option
   - Reports errors to console and MCP

2. **withErrorBoundary HOC**:
   - Higher-order component for wrapping functional components
   - Simplifies applying error boundaries to existing components

### Usage Patterns

Error boundaries are strategically implemented around:

1. **Data-Dependent Components**: Components that rely on database data
2. **User Interaction Components**: Components with complex user interactions
3. **Third-Party Integrations**: Components that interact with external services
4. **Critical UI Sections**: Key application sections that must remain functional

## Current Implementation

Error boundaries have been applied to:

- Schedule page components (WeeklyCalendar, TeacherSelect, DateSelect)
- Database explorer page components (table list, data view, schema view)
- Connection-dependent components throughout the application

## Error Handling Flow

1. Component throws an error during rendering, lifecycle method, or event handler
2. ErrorBoundary catches the error via getDerivedStateFromError/componentDidCatch
3. Error details are logged to console and reported to MCP console monitor
4. Fallback UI is displayed with retry and reconnect options
5. User can attempt to recover via retry or reconnect actions

## Customization

Error boundaries can be customized with:

- Custom fallback UI components
- Specialized error handlers for different component types
- Component-specific retry logic
- Integration with other monitoring services

## Best Practices

1. **Granular Boundaries**: Apply error boundaries at appropriate component levels
2. **Meaningful Fallbacks**: Provide helpful fallback UIs with clear recovery options
3. **Detailed Error Reporting**: Include context in error reports
4. **Recovery Options**: Always provide ways for users to recover from errors
5. **Testing**: Verify error boundary behavior with intentional error scenarios

## Future Enhancements

- Enhanced error classification system
- More detailed error analytics via MCP
- Automatic recovery attempts for certain error types
- User notifications for persistent errors

## Example Usage

```tsx
// Wrapping a component with ErrorBoundary
<ErrorBoundary onError={handleComponentError}>
  <MyComponent />
</ErrorBoundary>

// Using the HOC pattern
const SafeComponent = withErrorBoundary(MyComponent, customFallbackUI, handleComponentError);

// Component-specific error handler
const handleComponentError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Log error details
  console.error("Component Error:", error);
  console.error("Error Info:", errorInfo);
  
  // Report to MCP console monitor
  // Custom error handling logic
};
``` 