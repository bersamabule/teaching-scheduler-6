# MCP Console Monitor

This is a Model Context Protocol (MCP) server for the Teaching Scheduler application that captures and forwards browser console logs, making them accessible to AI assistants without manual copying and pasting.

## Features

- Automatically captures all browser console logs (log, error, warn, info, debug)
- Forwards logs to a local MCP server
- Stores logs in memory with configurable capacity
- Provides API endpoints for accessing, filtering, and managing logs
- Captures unhandled errors and promise rejections
- Includes MCP tools for querying and analyzing logs
- Integrates seamlessly with Next.js API routes

## Setup

### Step 1: Install Dependencies

First, install the dependencies for the MCP server:

```bash
# From the project root directory
cd mcp
npm install express cors body-parser
```

### Step 2: Start the MCP Server

Start the MCP server in a separate terminal:

```bash
# From the mcp directory
node console-monitor-server.js
```

The server will run on port 3004 by default. You should see output like:

```
Console monitor HTTP server running on port 3004
Console monitor MCP server running on port 3004
Console monitor client code written to [path]/console-monitor-client.js
Console monitor API route written to [path]/src/app/api/console-monitor/route.ts
```

### Step 3: Run the Application

Start your Teaching Scheduler application as normal:

```bash
npm run dev
```

The ConsoleMonitorLoader component will automatically be loaded and begin forwarding logs to the MCP server.

## Implementation Components

The console monitoring system consists of several components:

1. **Console Monitor MCP Server** (`mcp/console-monitor-server.js`):
   - Express server that receives and stores logs
   - MCP server that exposes tools for log analysis
   - Manages a circular buffer of logs with configurable maximum size
   - Provides filtering capabilities by log level, time, and search terms

2. **API Route** (`src/app/api/console-monitor/route.ts`):
   - Next.js API route that forwards logs from the browser to the MCP server
   - Handles HTTP errors and provides appropriate responses

3. **ConsoleMonitorLoader Component** (`src/components/ConsoleMonitorLoader.tsx`):
   - Client-side component that injects the monitoring script
   - Runs only in the browser, not during server-side rendering
   - Initializes monitoring once per session

4. **Browser Integration Script**:
   - Overrides browser console methods
   - Formats and buffers log messages
   - Sends logs to the API endpoint
   - Captures unhandled errors and promise rejections

## API Endpoints

The MCP server provides the following HTTP endpoints:

- `POST /api/console-logs` - Receive console logs from the browser
- `GET /api/console-logs` - Get logs with optional filtering
  - Query parameters:
    - `level` - Filter by log level (error, warn, info, log, debug, all)
    - `limit` - Maximum number of logs to return (default: 100)
    - `search` - Search term to filter logs
    - `sinceMins` - Only return logs from the last N minutes
- `DELETE /api/console-logs` - Clear all console logs
- `POST /api/console-logs/clear` - Alternative endpoint to clear logs

## MCP Tools

The MCP server exposes the following tools:

- `getLogs` - Retrieve console logs with optional filtering
  - Parameters:
    - `level` - Filter by log level (error, warn, info, log, debug, all)
    - `limit` - Maximum number of logs to return (default: 100)
- `clearLogs` - Clear the console log history

## Using with AI Assistants

When working with an AI assistant, you can:

1. Tell the assistant about the Console Monitor MCP server and its purpose
2. Let the assistant analyze logs captured by the system
3. Have the assistant query specific log types or search for patterns
4. Get AI-powered recommendations based on log analysis

This streamlines debugging and issue resolution, as the assistant can directly access and analyze client-side errors and messages.

## Integration with Error Boundaries

The console monitor has been integrated with the application's error boundaries to provide comprehensive error tracking:

1. Error boundaries catch component errors
2. Errors are logged to the console
3. The console monitor captures these logs
4. The full error stack is preserved for analysis

## Troubleshooting

If logs aren't being captured:

1. Make sure the MCP server is running on port 3004
2. Verify that the API route is correctly implemented
3. Check the browser console for any errors related to the ConsoleMonitorLoader
4. Ensure the application includes the ConsoleMonitorLoader component (usually in `_app.tsx` or a layout component)
5. Confirm that the API endpoint in the browser script matches your server configuration (default: '/api/console-monitor')

## Custom Configuration

To customize the Console Monitor MCP server:

1. **Change the maximum log capacity**:
   - Edit `MAX_LOGS` in `console-monitor-server.js` (default: 1000)

2. **Change the server port**:
   - Set the `PORT` environment variable before starting the server
   - Update the API route to point to the new port

3. **Add custom log metadata**:
   - Modify the browser integration script to include additional context with logs 