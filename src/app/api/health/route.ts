import { NextResponse } from 'next/server';
import { supabaseService, ConnectionStatus } from '@/lib/supabase/service';
import os from 'os';

/**
 * Health check API endpoint
 * Returns information about the application health status, including:
 * - Application status
 * - Timestamp
 * - Version information
 * - Uptime
 * - Environment
 * - Database connection status
 * - Server resource usage
 */

// Define types for health response
interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  database?: {
    status: ConnectionStatus;
    isOffline: boolean;
    error?: string;
    pingResult?: 'success' | 'failure' | 'error';
    pingError?: string;
    supabaseUrl?: string;
  };
  system?: {
    platform: string;
    arch: string;
    nodeVersion: string;
    hostname: string;
    cpus: number;
    memory: {
      total: number;
      free: number;
      usage: number;
    };
    load: number[];
  };
  process?: {
    pid: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
}

export async function GET(request: Request) {
  try {
    // Get parameters from URL
    const url = new URL(request.url);
    const detailed = url.searchParams.get('detailed') === 'true';
    const checkDatabase = url.searchParams.get('checkDatabase') === 'true';

    // Build basic health information
    const health: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    // Add database connection status
    const connectionStatus = supabaseService.getStatus();
    const lastError = supabaseService.getLastError();
    const isOffline = supabaseService.isOffline();
    
    health.database = {
      status: connectionStatus,
      isOffline,
      error: lastError ? lastError.message : undefined,
    };
    
    // Check database connection (triggers a ping) if requested
    if (checkDatabase) {
      try {
        const connected = await supabaseService.ping();
        health.database.pingResult = connected ? 'success' : 'failure';
      } catch (dbError) {
        health.database.pingResult = 'error';
        health.database.pingError = dbError instanceof Error 
          ? dbError.message 
          : String(dbError);
      }
    }

    // Add detailed information if requested
    if (detailed) {
      // System information
      health.system = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        hostname: os.hostname(),
        cpus: os.cpus().length,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usage: Math.round((1 - os.freemem() / os.totalmem()) * 100)
        },
        load: os.loadavg(),
      };
      
      // Process memory usage
      const memoryUsage = process.memoryUsage();
      health.process = {
        pid: process.pid,
        memoryUsage: {
          rss: memoryUsage.rss, // Resident Set Size
          heapTotal: memoryUsage.heapTotal, // Total heap size
          heapUsed: memoryUsage.heapUsed, // Heap actually used
          external: memoryUsage.external, // Memory used by C++ objects
        },
      };
      
      // Supabase connection details (non-sensitive)
      health.database.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0] + '.[redacted]' 
        : 'not-configured';
    }

    // Return health status
    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    
    // If any error occurs, return 500
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 