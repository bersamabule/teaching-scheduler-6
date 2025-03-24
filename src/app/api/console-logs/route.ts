import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for logs (for development purposes)
// In production, this would be replaced with a persistent storage solution
type LogEntry = {
  level: string;
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
  context?: string;
};

const MAX_LOGS = 1000;
let logs: LogEntry[] = [];

/**
 * POST handler for receiving console logs from the client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get headers from the request directly
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'unknown';
    
    // Add additional metadata
    body.meta = {
      ...(body.meta || {}),
      userAgent,
      referer,
    };
    
    // Add the log to our storage
    logs.push({
      level: body.level,
      message: body.message,
      timestamp: body.timestamp || new Date().toISOString(),
      meta: body.meta,
      context: body.context,
    });
    
    // Keep logs under the maximum size
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }
    
    // Try to forward to the MCP server if running
    try {
      // Attempt to forward to the MCP server, but don't wait for response
      // and don't let failure block the main response
      fetch('http://localhost:3004/api/console-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }).catch(() => {
        // Silently ignore failures - MCP server might not be running
      });
    } catch (error) {
      // Silently fail if MCP server is not available
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in console logs API route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET handler for retrieving console logs
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const search = searchParams.get('search');
    const sinceMins = searchParams.get('sinceMins')
      ? parseInt(searchParams.get('sinceMins') || '0', 10)
      : null;
    
    // Filter by level if specified
    let filteredLogs = logs;
    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    // Filter by time if specified
    if (sinceMins) {
      const cutoff = new Date(Date.now() - (sinceMins * 60 * 1000));
      filteredLogs = filteredLogs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= cutoff;
      });
    }
    
    // Filter by search term if specified
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => {
        return JSON.stringify(log).toLowerCase().includes(searchLower);
      });
    }
    
    // Apply limit and return most recent logs first
    return NextResponse.json({
      logs: filteredLogs.slice(-limit).reverse(),
      totalCount: filteredLogs.length,
      totalAllLogs: logs.length,
    });
  } catch (error) {
    console.error('Error retrieving console logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve logs' },
      { status: 500 }
    );
  }
}

/**
 * Clear all logs (accessed via DELETE to /api/console-logs)
 */
export async function DELETE(request: NextRequest) {
  logs = [];
  
  // Try to clear logs from MCP server too
  try {
    fetch('http://localhost:3004/api/console-logs', {
      method: 'DELETE',
    }).catch(() => {
      // Silently ignore failures
    });
  } catch (error) {
    // Silently fail if MCP server is not available
  }
  
  return NextResponse.json({ success: true, clearedCount: 0 });
} 