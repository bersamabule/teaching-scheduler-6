import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey, supabase as supabaseClient } from './client';

/**
 * Status of the Supabase connection
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Interface for connection state observers
 */
export interface ConnectionObserver {
  onConnectionStatusChanged: (status: ConnectionStatus, error?: Error) => void;
}

/**
 * Enhanced Supabase service with connection reliability features
 */
export class SupabaseService {
  private static instance: SupabaseService;
  private client = supabaseClient; // Use the pre-initialized client
  
  private status: ConnectionStatus = 'disconnected';
  private lastError?: Error;
  private maxRetries = 2; // Reduced retries to prevent excessive attempts
  private retryDelay = 2000; 
  private observers: ConnectionObserver[] = [];
  private pingInterval?: NodeJS.Timeout;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3; // Reduced to prevent excessive retries
  private useOfflineMode = false;
  
  /**
   * Get the singleton instance of SupabaseService
   */
  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    console.log(`[DB] Initializing Supabase service with client at ${supabaseUrl}`);
    this.startPingInterval();
  }
  
  /**
   * Start periodic ping to check connection status
   */
  private startPingInterval() {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Set up ping every 60 seconds (increased from 30s to reduce load)
    this.pingInterval = setInterval(() => {
      // Only ping if not in offline mode
      if (!this.useOfflineMode) {
        this.ping().catch(error => {
          console.error('[DB] Ping failed:', this.formatError(error));
        });
      }
    }, 60000); // 60 seconds
    
    // Do an initial ping
    this.ping().catch(error => {
      console.error('[DB] Initial ping failed:', this.formatError(error));
      // If initial ping fails, enter offline mode
      this.useOfflineMode = true;
    });
  }
  
  /**
   * Format error object to string for better logging
   */
  private formatError(error: any): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    } 
    if (typeof error === 'object') {
      try {
        return JSON.stringify(error);
      } catch (e) {
        return 'Unserializable error object';
      }
    }
    return String(error);
  }
  
  /**
   * Ping the Supabase server to check connectivity
   */
  public async ping(): Promise<boolean> {
    try {
      // If offline mode is enabled, don't try to connect
      if (this.useOfflineMode) {
        console.log('[DB] Offline mode enabled, skipping connection attempt');
        return false;
      }
      
      this.updateStatus('connecting');
      this.connectionAttempts++;
      
      // Create a promise with timeout
      const timeoutPromise = new Promise<{data: null, error: Error}>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 5000ms')), 5000);
      });
      
      // Simple query to check connectivity - using a more reliable query
      const queryPromise = this.client.rpc('version', {});
      
      // Race the query against the timeout
      const { data, error } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      if (error) {
        throw error;
      }
      
      // Reset connection attempts on success
      this.connectionAttempts = 0;
      this.useOfflineMode = false;
      this.updateStatus('connected');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.updateStatus('error', err);
      
      // Log more details about the connection attempt
      console.error(`[DB] Connection attempt ${this.connectionAttempts}/${this.maxConnectionAttempts} failed: ${this.formatError(error)}`);
      
      // If we've reached max attempts, enter offline mode
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.log('[DB] Max connection attempts reached, entering offline mode');
        this.useOfflineMode = true;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          // Check again in 3 minutes
          this.pingInterval = setInterval(() => this.checkOfflineStatus(), 180000);
        }
      }
      
      return false;
    }
  }
  
  /**
   * Periodically check if we should exit offline mode
   */
  private async checkOfflineStatus(): Promise<void> {
    console.log('[DB] Checking if Supabase is available...');
    try {
      // Try a simple fetch to see if Supabase is reachable
      const response = await fetch(supabaseUrl, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      // If we get here, we might be able to connect
      console.log('[DB] Supabase might be reachable, attempting reconnection');
      this.useOfflineMode = false;
      this.connectionAttempts = 0;
      
      // Clear current interval and restart normal ping cycle
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.startPingInterval();
      }
    } catch (e) {
      console.log('[DB] Supabase still unreachable, remaining in offline mode');
    }
  }
  
  /**
   * Execute a Supabase query with retry logic
   */
  public async executeQuery<T>(
    queryFn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    // If in offline mode, throw immediately without trying
    if (this.useOfflineMode) {
      throw new Error('Database is in offline mode');
    }
    
    try {
      // If not connected, try to reconnect first
      if (this.status !== 'connected') {
        const isConnected = await this.ping();
        if (!isConnected && retries === 0) {
          throw new Error('Failed to connect to Supabase server after retries');
        }
      }
      
      // Execute the query
      return await queryFn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Log the error for debugging
      console.error(`[DB] Query execution error: ${this.formatError(error)}`);
      
      // Decrement retries and try again if retries remain
      if (retries > 0) {
        console.log(`[DB] Query failed, retrying (${retries} attempts left)...`);
        
        // Wait before retrying with exponential backoff
        const backoffTime = this.retryDelay * Math.pow(2, this.maxRetries - retries);
        console.log(`[DB] Waiting ${backoffTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        return this.executeQuery(queryFn, retries - 1);
      }
      
      // No retries left, throw the error
      throw err;
    }
  }
  
  /**
   * Get the current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }
  
  /**
   * Get the last error that occurred
   */
  public getLastError(): Error | undefined {
    return this.lastError;
  }
  
  /**
   * Check if the service is in offline mode
   */
  public isOffline(): boolean {
    return this.useOfflineMode;
  }
  
  /**
   * Update the connection status and notify observers
   */
  private updateStatus(status: ConnectionStatus, error?: Error): void {
    const statusChanged = this.status !== status;
    this.status = status;
    this.lastError = error;
    
    if (statusChanged) {
      console.log(`[DB] Connection status changed to: ${status}${error ? ` (${this.formatError(error)})` : ''}`);
      
      // Notify observers
      this.observers.forEach(observer => {
        try {
          observer.onConnectionStatusChanged(status, error);
        } catch (err) {
          console.error('[DB] Error in observer:', this.formatError(err));
        }
      });
    }
  }
  
  /**
   * Register a connection observer
   */
  public addObserver(observer: ConnectionObserver): void {
    this.observers.push(observer);
    
    // Immediately notify new observer of current status
    observer.onConnectionStatusChanged(this.status, this.lastError);
  }
  
  /**
   * Unregister a connection observer
   */
  public removeObserver(observer: ConnectionObserver): void {
    this.observers = this.observers.filter(o => o !== observer);
  }
  
  /**
   * Get the Supabase client
   */
  public getClient() {
    return this.client;
  }
  
  /**
   * Force a reconnection attempt
   */
  public async reconnect(): Promise<boolean> {
    // Reset connection attempts counter and offline mode
    this.connectionAttempts = 0;
    this.useOfflineMode = false;
    console.log('[DB] Manually attempting reconnection...');
    return this.ping();
  }
  
  /**
   * Clean up resources
   */
  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }
}

// Export a singleton instance
export const supabaseService = SupabaseService.getInstance(); 