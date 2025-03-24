import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey, supabase } from './client';

/**
 * Status of the Supabase connection
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Interface for connection state observers
 */
export interface ConnectionObserver {
  onConnectionStatusChanged: (status: ConnectionStatus, error?: Error) => void;
  onSynchronizationStart?: () => void;
  onSynchronizationComplete?: () => void;
}

/**
 * Enhanced Supabase service with connection reliability features
 */
export class SupabaseService {
  private static instance: SupabaseService;
  private client = supabase; // Use the pre-initialized client
  
  private status: ConnectionStatus = 'disconnected';
  private lastError?: Error;
  private maxRetries = 3; // Increased from 2 for better reliability
  private retryDelay = 2000; 
  private observers: ConnectionObserver[] = [];
  private pingInterval?: NodeJS.Timeout;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3; 
  private useOfflineMode = false;
  private retryTimeoutIds: NodeJS.Timeout[] = []; // Track timeout IDs for cleanup
  private isSynchronizing = false;
  private componentsUsingFallback: Set<string> = new Set();
  
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

    // Attempt to detect network connectivity changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkChange.bind(this, true));
      window.addEventListener('offline', this.handleNetworkChange.bind(this, false));
      
      // Check initial network status
      if (navigator.onLine === false) {
        console.log('[DB] Browser reports offline status at startup');
        this.useOfflineMode = true;
        this.updateStatus('disconnected');
      }
    }
  }

  /**
   * Handle network connectivity changes
   */
  private handleNetworkChange(isOnline: boolean): void {
    if (isOnline) {
      console.log('[DB] Browser reports online status, attempting reconnection');
      this.useOfflineMode = false;
      this.connectionAttempts = 0;
      this.ping().catch(error => {
        console.error('[DB] Reconnection attempt failed:', this.formatError(error));
      });
    } else {
      console.log('[DB] Browser reports offline status, entering offline mode');
      this.useOfflineMode = true;
      this.updateStatus('disconnected');
    }
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
      return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
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
      
      // Create an array of table queries to try in sequence
      const tablesToTry = [
        'Clovers1A-Course-Calendar', 
        'Teachers', 
        'Students-English', 
        'Sprouts1-Course-Calendar'
      ];
      
      let connectionSuccessful = false;
      
      // Try each table until one succeeds
      for (const table of tablesToTry) {
        if (connectionSuccessful) break;
        
        console.log(`[DB] Testing connection with ${table} table query...`);
        
        try {
          // Race the query against the timeout
          const queryPromise = this.client
            .from(table)
            .select('count', { count: 'exact', head: true })
            .limit(1);
            
          const result = await Promise.race([queryPromise, timeoutPromise]) as any;
          
          // If no error, connection is successful
          if (!result.error) {
            connectionSuccessful = true;
            console.log(`[DB] Connection successful using ${table} table`);
            break;
          }
        } catch (error) {
          console.log(`[DB] Connection failed using ${table} table, trying next option...`);
          // Continue to the next table
        }
      }
      
      if (connectionSuccessful) {
        // Reset connection attempts on success
        this.connectionAttempts = 0;
        this.useOfflineMode = false;
        this.updateStatus('connected');
        return true;
      } else {
        throw new Error('All connection attempts failed');
      }
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseKey,
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is ok (2xx status)
        if (response.ok) {
          // If we get here, we might be able to connect
          console.log('[DB] Supabase is reachable, attempting reconnection');
          this.useOfflineMode = false;
          this.connectionAttempts = 0;
          
          // Clear current interval and restart normal ping cycle
          if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.startPingInterval();
          }
        } else {
          console.log(`[DB] Supabase returned status ${response.status}, remaining in offline mode`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (e) {
      console.log('[DB] Supabase still unreachable, remaining in offline mode:', 
        e instanceof Error ? e.message : String(e));
    }
  }
  
  /**
   * Execute a Supabase query with retry logic using exponential backoff
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
      
      // Log the error
      console.error(`[DB] Query failed (${this.maxRetries - retries + 1}/${this.maxRetries + 1}): ${this.formatError(err)}`);
      
      // If no retries left, or if it's a 404 error (which won't be fixed by retrying), throw
      const is404 = err.message.includes('404') || err.message.includes('not found');
      if (retries <= 0 || is404) {
        throw err;
      }
      
      // Calculate backoff time with jitter
      const baseDelay = this.retryDelay;
      const exponentialPart = Math.pow(2, this.maxRetries - retries);
      const jitter = Math.random() * 0.3 + 0.85; // Random between 0.85 and 1.15
      const delay = Math.min(baseDelay * exponentialPart * jitter, 30000); // Cap at 30 seconds
      
      console.log(`[DB] Retrying in ${Math.round(delay)}ms (${retries} retries left)`);
      
      // Wait and retry with exponential backoff
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(async () => {
          try {
            // Remove the timeout ID from our tracking array
            this.retryTimeoutIds = this.retryTimeoutIds.filter(id => id !== timeoutId);
            
            // Retry the query with one fewer retry remaining
            const result = await this.executeQuery(queryFn, retries - 1);
            resolve(result);
          } catch (retryError) {
            reject(retryError);
          }
        }, delay);
        
        // Track the timeout ID for cleanup
        this.retryTimeoutIds.push(timeoutId);
      });
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
    // Only update and notify if status actually changed
    const statusChanged = this.status !== status;
    const errorChanged = 
      (this.lastError?.message !== error?.message) || 
      (this.lastError !== undefined && error === undefined) ||
      (this.lastError === undefined && error !== undefined);
    
    if (statusChanged || errorChanged) {
      const oldStatus = this.status;
      this.status = status;
      this.lastError = error;
      
      // Notify all observers of the status change
      this.observers.forEach(observer => {
        try {
          observer.onConnectionStatusChanged(status, error);
        } catch (obsError) {
          console.error('[DB] Error in observer notification:', obsError);
        }
      });
      
      console.log(`[DB] Connection status changed: ${oldStatus} → ${status}${error ? ` (${error.message})` : ''}`);
    }
  }
  
  /**
   * Add an observer to be notified of connection status changes
   */
  public addObserver(observer: ConnectionObserver): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
      // Immediately notify new observer of current status
      observer.onConnectionStatusChanged(this.status, this.lastError);
    }
  }
  
  /**
   * Remove an observer from notification list
   */
  public removeObserver(observer: ConnectionObserver): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }
  
  /**
   * Get the Supabase client instance
   */
  public getClient() {
    return this.client;
  }
  
  /**
   * Manually trigger a reconnection attempt and return the result
   */
  public async reconnect(): Promise<boolean> {
    console.log('[DB] Manual reconnection triggered');
    
    try {
      // Reset connection attempts counter
      this.connectionAttempts = 0;
      
      // Reset offline mode to allow reconnection attempt
      this.useOfflineMode = false;
      
      // Attempt to connect
      const result = await this.ping();
      
      // If connection successful and there are components using fallback data, synchronize
      if (result && this.hasFallbackComponents()) {
        console.log(`[DB] Connection restored. ${this.getFallbackComponentCount()} components are using fallback data. Starting synchronization...`);
        await this.synchronizeData();
      }
      
      return result;
    } catch (error) {
      console.error('[DB] Manual reconnection failed:', this.formatError(error));
      return false;
    }
  }
  
  /**
   * Clean up all resources used by the service
   */
  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Clear all retry timeouts
    this.retryTimeoutIds.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.retryTimeoutIds = [];
    
    // Remove event listeners if we added them
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleNetworkChange.bind(this, true));
      window.removeEventListener('offline', this.handleNetworkChange.bind(this, false));
    }
    
    this.observers = [];
    console.log('[DB] Supabase service resources cleaned up');
  }
  
  /**
   * List all available tables in the Supabase database
   */
  public async listTables(): Promise<string[]> {
    if (this.useOfflineMode) {
      return [];
    }
    
    try {
      const { data, error } = await this.client.rpc('get_tables');
      
      if (error) {
        console.error('[DB] Error listing tables:', error);
        // Try alternative approach using schema information
        const { data: schemaData, error: schemaError } = await this.client
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
          
        if (schemaError) {
          console.error('[DB] Error listing tables from schema:', schemaError);
          return [];
        }
        
        return (schemaData || []).map(row => row.table_name);
      }
      
      return data || [];
    } catch (error) {
      console.error('[DB] Error listing tables:', this.formatError(error));
      return [];
    }
  }

  /**
   * Register a component that is using fallback data
   * @param componentId - A unique identifier for the component
   */
  public registerFallbackUsage(componentId: string): void {
    this.componentsUsingFallback.add(componentId);
    console.log(`[DB] Component ${componentId} registered as using fallback data`);
  }

  /**
   * Unregister a component that was using fallback data
   * @param componentId - A unique identifier for the component
   */
  public unregisterFallbackUsage(componentId: string): void {
    this.componentsUsingFallback.delete(componentId);
    console.log(`[DB] Component ${componentId} no longer using fallback data`);
  }

  /**
   * Check if any components are using fallback data
   */
  public hasFallbackComponents(): boolean {
    return this.componentsUsingFallback.size > 0;
  }

  /**
   * Get the number of components using fallback data
   */
  public getFallbackComponentCount(): number {
    return this.componentsUsingFallback.size;
  }

  /**
   * Get the list of components using fallback data
   */
  public getFallbackComponents(): string[] {
    return Array.from(this.componentsUsingFallback);
  }

  /**
   * Synchronize data after a reconnection
   * This clears cache and notifies components to reload their data
   */
  public async synchronizeData(): Promise<boolean> {
    if (this.status !== 'connected') {
      console.log('[DB] Cannot synchronize data: not connected');
      return false;
    }

    if (this.isSynchronizing) {
      console.log('[DB] Data synchronization already in progress');
      return false;
    }

    try {
      this.isSynchronizing = true;
      console.log('[DB] Starting data synchronization');

      // Notify observers that synchronization has started
      this.observers.forEach(observer => {
        if (observer.onSynchronizationStart) {
          observer.onSynchronizationStart();
        }
      });

      // Clear all cached data to force fresh data retrieval
      await this.clearCache();
      
      // Wait a short period for any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('[DB] Data synchronization completed successfully');
      
      // Notify observers that synchronization is complete
      this.observers.forEach(observer => {
        if (observer.onSynchronizationComplete) {
          observer.onSynchronizationComplete();
        }
      });
      
      return true;
    } catch (error) {
      console.error('[DB] Data synchronization failed:', this.formatError(error));
      return false;
    } finally {
      this.isSynchronizing = false;
    }
  }

  /**
   * Clear all cached data
   */
  private async clearCache(): Promise<void> {
    console.log('[DB] Clearing cache for data synchronization');
    // This will be implemented externally, we're just ensuring it's accessible
    try {
      const { clearCache } = await import('./data');
      clearCache();
    } catch (error) {
      console.error('[DB] Error clearing cache:', this.formatError(error));
    }
  }
}

// Export a singleton instance
export const supabaseService = SupabaseService.getInstance(); 