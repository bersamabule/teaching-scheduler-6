'use client';

import { useState, useEffect } from 'react';
import { getTables, getTableData, KNOWN_TABLES } from '@/lib/supabase/data';
import { supabaseService, ConnectionStatus } from '@/lib/supabase/service';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import ErrorBoundary from '@/components/ErrorBoundary';

// Simple fallback data for tables
const FALLBACK_DATA: Record<string, any[]> = {
  'Teachers': [
    { Teacher_ID: 1, Teacher_name: 'Andrew', Teacher_Type: 'Native' },
    { Teacher_ID: 2, Teacher_name: 'Emma', Teacher_Type: 'Native' },
    { Teacher_ID: 3, Teacher_name: 'Michael', Teacher_Type: 'Native' },
    { Teacher_ID: 4, Teacher_name: 'Liu Wei', Teacher_Type: 'Local' },
    { Teacher_ID: 5, Teacher_name: 'Zhang Min', Teacher_Type: 'Local' }
  ]
};

export default function ExplorerPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [tableCount, setTableCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  
  // Add log function for debugging
  const log = (message: string) => {
    console.log(message);
    setDebugMessages(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev]);
  };
  
  // Update connection message based on connection status
  const updateConnectionMessage = () => {
    const status = supabaseService.getStatus();
    const offline = supabaseService.isOffline();
    
    if (offline) {
      setConnectionMessage('Connection failed. Using fallback data (offline mode).');
      setIsOfflineMode(true);
      return;
    }
    
    setIsOfflineMode(false);
    
    if (status === 'connected') {
      setConnectionMessage('Connected to Supabase database');
    } else if (status === 'connecting') {
      setConnectionMessage('Connecting to Supabase database...');
    } else if (status === 'error') {
      const lastError = supabaseService.getLastError();
      setConnectionMessage(`Connection error: ${lastError?.message || 'Unknown error'}`);
      log(`Connection error: ${lastError?.message || 'Unknown error'}`);
    } else {
      setConnectionMessage('Not connected to Supabase database');
    }
  };
  
  // Load database schema on initial page load
  useEffect(() => {
    async function loadDatabaseSchema() {
      setLoading(true);
      setError(null);
      try {
        log('Starting database analysis...');
        
        // Update connection message
        updateConnectionMessage();
        
        // Get table list
        try {
          const tablesList = await getTables();
          log(`Found ${tablesList.length} tables`);
          setTables(tablesList);
          if (supabaseService.isOffline()) {
            setError('Using fallback data in offline mode');
          }
        } catch (tableError) {
          log('Error fetching tables: ' + (tableError instanceof Error ? tableError.message : String(tableError)));
          setTables(KNOWN_TABLES);
          setError('Failed to connect to database. Using fallback data.');
        }
      } catch (err) {
        log('Error during database discovery: ' + (err instanceof Error ? err.message : String(err)));
        setError('Failed to load database schema. Using fallback data.');
        setTables(KNOWN_TABLES);
      } finally {
        setLoading(false);
      }
    }
    
    loadDatabaseSchema();
    
    // Set up connection status observer
    const observer = {
      onConnectionStatusChanged: (status: ConnectionStatus, error?: Error) => {
        log(`Connection status changed to: ${status}${error ? ` (${error.message})` : ''}`);
        updateConnectionMessage();
      }
    };
    
    supabaseService.addObserver(observer);
    
    // Cleanup on unmount
    return () => {
      supabaseService.removeObserver(observer);
    };
  }, []);
  
  // Load table data when a table is selected
  useEffect(() => {
    if (!selectedTable) {
      setTableData(null);
      setTableCount(0);
      return;
    }
    
    async function loadTableData(tableName: string) {
      setLoading(true);
      setError(null);
      try {
        log(`Loading data from table: ${tableName}`);
        
        // Try to get data from the database or fallback
        try {
          const { data, count } = await getTableData(tableName, 50);
          setTableData(data);
          setTableCount(count);
          log(`Loaded ${data.length} rows from ${tableName} (total: ${count})`);
          
          // Set message if in offline mode
          if (supabaseService.isOffline()) {
            setError('Using fallback data in offline mode');
          }
        } catch (dataError) {
          log('Error loading table data: ' + (dataError instanceof Error ? dataError.message : String(dataError)));
          
          // Use fallback data if available
          if (tableName in FALLBACK_DATA) {
            const fallbackData = FALLBACK_DATA[tableName];
            setTableData(fallbackData);
            setTableCount(fallbackData.length);
            setError('Using fallback data for demonstration.');
            log('Using fallback data');
          } else {
            setTableData([]);
            setTableCount(0);
            setError('No data available for this table.');
          }
        }
      } catch (err) {
        log('Error: ' + (err instanceof Error ? err.message : String(err)));
        setTableData([]);
        setTableCount(0);
        setError('Failed to load table data.');
      } finally {
        setLoading(false);
      }
    }
    
    loadTableData(selectedTable);
  }, [selectedTable]);
  
  // Add a retry function
  const handleRetryConnection = async () => {
    log('Manually retrying connection...');
    setLoading(true);
    
    try {
      const connected = await supabaseService.reconnect();
      if (connected) {
        log('Connection successful. Reloading database schema...');
        // Reload tables
        const tablesList = await getTables();
        setTables(tablesList);
        setConnectionMessage('Connected to Supabase database');
        setError(null);
        setIsOfflineMode(false);
      } else {
        log('Connection attempt failed');
        setConnectionMessage('Connection failed. Using fallback data.');
        setError('Failed to connect to database. Using fallback data.');
        // Make sure tables are set to fallback
        setTables(KNOWN_TABLES);
      }
    } catch (err) {
      log('Error during reconnection: ' + (err instanceof Error ? err.message : String(err)));
      setError('Failed to reconnect to database. Using fallback data.');
      setTables(KNOWN_TABLES);
    } finally {
      setLoading(false);
    }
  };
  
  // Render the page
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Database Explorer</h1>
        
        <div className="flex items-center">
          <ConnectionStatusIndicator showDetails className="mr-4" />
          
          <button
            onClick={handleRetryConnection}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Connection'}
          </button>
        </div>
      </div>
      
      {isOfflineMode && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-700 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold">Offline Mode Active</p>
              <p className="text-sm">
                The application is currently using fallback data because the database connection is unavailable.
                This ensures you can still view and work with sample data until the connection is restored.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {connectionMessage && !isOfflineMode && (
        <div className={`mb-4 p-2 text-sm rounded ${
          connectionMessage.includes('Connected to') 
            ? 'bg-green-50 text-green-700' 
            : connectionMessage.includes('Connecting') 
              ? 'bg-yellow-50 text-yellow-700' 
              : 'bg-red-50 text-red-700'
        }`}>
          {connectionMessage}
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">About This Tool</h2>
        <p className="text-gray-700 mb-2">
          The Database Explorer automatically discovers and analyzes all tables in your Supabase database. 
          This makes it easy to see when new tables are added, like additional Course Calendars or Teacher records.
        </p>
        <p className="text-gray-700">
          Dynamic discovery ensures the Teaching Scheduler always has up-to-date information as your business evolves and grows.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ErrorBoundary>
          <div className="md:col-span-1 bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Tables</h3>
            
            {loading && tables.length === 0 ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              </div>
            ) : tables.length === 0 ? (
              <div className="text-red-500 text-sm p-3 bg-red-50 rounded">
                No tables found. Check database connection.
              </div>
            ) : (
              <ul className="space-y-1 max-h-96 overflow-y-auto">
                {tables.map(table => (
                  <li 
                    key={table} 
                    className={`
                      p-2 text-sm rounded cursor-pointer
                      ${selectedTable === table ? 'bg-indigo-100 text-indigo-700 font-medium' : 'hover:bg-gray-100'}
                    `}
                    onClick={() => setSelectedTable(table)}
                  >
                    {table}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ErrorBoundary>
        
        <ErrorBoundary>
          <div className="md:col-span-3 bg-white p-4 rounded shadow">
            {!selectedTable ? (
              <div className="text-center text-gray-500 p-8">
                Select a table to view its details
              </div>
            ) : loading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              </div>
            ) : !tableData || tableData.length === 0 ? (
              <div className="text-gray-500 p-4 bg-gray-50 rounded">
                No data found in table {selectedTable}
                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedTable}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Showing {tableData.length} of {tableCount} rows
                  {error && <span className="text-orange-500 ml-2">{error}</span>}
                </p>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.keys(tableData[0] || {}).map(column => (
                          <th key={column} className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          {Object.values(row).map((value, valueIndex) => (
                            <td 
                              key={valueIndex} 
                              className="p-2 text-sm border border-gray-200 whitespace-normal truncate max-w-xs"
                            >
                              {value === null 
                                ? <span className="text-gray-400 italic">null</span>
                                : typeof value === 'boolean'
                                  ? value ? 'true' : 'false'
                                  : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </ErrorBoundary>
      </div>
      
      <ErrorBoundary>
        <div className="mt-8 bg-gray-800 text-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-2 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Debug Console
          </h3>
          
          <div className="bg-black bg-opacity-50 p-2 rounded text-sm font-mono h-48 overflow-y-auto">
            {debugMessages.length === 0 ? (
              <div className="text-gray-400">No messages</div>
            ) : (
              debugMessages.map((message, index) => (
                <div key={index} className="mb-1">{message}</div>
              ))
            )}
          </div>
        </div>
      </ErrorBoundary>
    </div>
  );
} 