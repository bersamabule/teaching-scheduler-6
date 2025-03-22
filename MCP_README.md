# MCP Console Monitor

This is a Model Context Protocol (MCP) server for the Teaching Scheduler application that captures and forwards browser console logs, making them accessible to AI assistants without manual copying and pasting.

## Features

- Automatically captures all browser console logs (log, error, warn, info, debug)
- Forwards logs to a local MCP server
- Stores logs in a file for easy access
- Provides API endpoints for accessing and managing logs

## Setup

### Step 1: Install Dependencies

First, install the dependencies for the MCP server:

```bash
# Copy the mcp-package.json to package.json
cp mcp-package.json mcp-server/package.json

# Navigate to the MCP server directory
cd mcp-server

# Install dependencies
npm install
```

### Step 2: Start the MCP Server

Start the MCP server in a separate terminal:

```bash
# From the mcp-server directory
npm run dev
```

The server will run on port 3099 by default. You should see output like:

```
MCP Server running on port 3099
Console logs will be saved to: [path]/mcp-logs/console.log
```

### Step 3: Run the Application

Start your Teaching Scheduler application as normal:

```bash
npm run dev
```

The console monitor will automatically be loaded and begin forwarding logs to the MCP server.

## How It Works

1. The `ConsoleMonitor` component is loaded with the application
2. It dynamically imports the console monitor script
3. The script overrides the browser's console methods (log, error, etc.)
4. Logs are buffered and sent to the MCP server
5. The MCP server stores the logs and makes them available via API endpoints

## API Endpoints

The MCP server provides the following endpoints:

- `GET /mcp/health` - Health check endpoint
- `GET /mcp/logs` - Get all console logs as text
- `POST /mcp/console` - Receive console logs (used by the client)
- `DELETE /mcp/logs` - Clear all console logs

## For AI Assistants

When using this with an AI assistant, you can:

1. Tell the assistant about the MCP server and its purpose
2. View the logs at http://localhost:3099/mcp/logs
3. Reference specific error messages or logs without manually copying them

This streamlines debugging and issue resolution, as the assistant can see console errors directly.

## Troubleshooting

If logs aren't being captured:

1. Make sure the MCP server is running
2. Check the browser console for any errors related to the MCP client
3. Verify that the application is loading the ConsoleMonitor component
4. Check that the MCP_SERVER_URL in `console-monitor.js` matches your MCP server address 