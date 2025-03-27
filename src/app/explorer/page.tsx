'use client';

import React, { useState, useEffect } from 'react';
import { FixedSizeList } from 'react-window';
import { getTables, getTableData, clearCache } from '@/lib/supabase/data';
import { supabaseService, ConnectionStatus } from '@/lib/supabase/service';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FallbackIndicator from '@/components/FallbackIndicator';
import SynchronizationIndicator from '@/components/SynchronizationIndicator';
import LoadingIndicator from '@/components/LoadingIndicator';
import SkeletonLoader from '@/components/SkeletonLoader';

// Define column type for the schema view
interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  inferred?: boolean;
}

// Component to render a single row for react-window using divs
const Row = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: { columns: string[]; rows: any[] } }) => {
  const { columns, rows } = data;
  const row = rows[index];
  const isEven = index % 2 === 0;

  console.log(`Rendering Row ${index}`);

  return (
    // Apply the style from react-window to this outer div
    <div
      style={style} 
      className={`${isEven ? 'bg-white' : 'bg-gray-50'} flex border-b border-gray-200`} // Use flex for horizontal layout, add bottom border
    >
      {columns.map((column, colIndex) => (
        // Render cells as divs
        <div 
          key={colIndex} 
          className="p-4 text-sm border-r border-gray-200 min-w-[350px] max-w-[500px] flex-shrink-0" // Use right border for separation
          style={{ width: '350px' }} // Set a fixed width matching header
        >
          <div className="max-h-[60px] overflow-y-auto break-words whitespace-normal"> {/* Adjusted max-h */}
            {row[column] === null 
              ? <span className="text-gray-400 italic">null</span>
              : typeof row[column] === 'boolean'
                ? row[column] ? 'true' : 'false'
                : typeof row[column] === 'object'
                  ? JSON.stringify(row[column], null, 2)
                  : String(row[column])
            }
          </div>
        </div>
      ))}
    </div>
  );
});

Row.displayName = 'Row';

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
  const [viewMode, setViewMode] = useState<'data' | 'schema'>('data');
  
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
        
        // Clear any existing cache to ensure fresh data
        clearCache();
        log('Cache cleared to ensure fresh data from database');
        
        // Update connection message
        updateConnectionMessage();
        
        // Get table list
        try {
          const tablesList = await getTables();
          log(`Found ${tablesList.length} tables`);
          
          // Display tables
          setTables(tablesList);
          
          if (supabaseService.isOffline()) {
            log('Using fallback tables list in offline mode');
            setError('Using fallback data in offline mode');
          }
        } catch (tableError) {
          log('Error fetching tables: ' + (tableError instanceof Error ? tableError.message : String(tableError)));
          setError('Failed to connect to database. Using fallback data.');
        }
      } catch (err) {
        log('Error during database discovery: ' + (err instanceof Error ? err.message : String(err)));
        setError('Failed to load database schema. Using fallback data.');
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
      },
      onSynchronizationStart: () => {
        log('Data synchronization started');
      },
      onSynchronizationComplete: () => {
        log('Data synchronization completed, reloading data');
        // Reload tables
        loadDatabaseSchema();
        // Reload table data if a table is selected
        if (selectedTable) {
          loadTableData(selectedTable);
        }
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
    
    loadTableData(selectedTable);
  }, [selectedTable]);
  
  // Function to load table data
  async function loadTableData(tableName: string) {
    setLoading(true);
    setError(null);
    try {
      log(`Loading data from table: ${tableName}`);
      
      // Try to get data from the database
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
      setTableData([]);
      setTableCount(0);
      setError('Failed to load table data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }
  
  // Add a retry function
  const handleRetryConnection = async () => {
    log('Manually retrying connection...');
    setLoading(true);
    
    try {
      const connected = await supabaseService.reconnect();
      if (connected) {
        log('Connection successful. Reloading database schema...');
        
        // Force a refresh of table list by clearing cache
        try {
          log('Clearing table cache to get fresh data...');
          clearCache();
          log('Cache cleared successfully');
        } catch (cacheError) {
          log('Error clearing cache: ' + (cacheError instanceof Error ? cacheError.message : String(cacheError)));
        }
        
        // Reload tables
        const tablesList = await getTables();
        log(`Loaded ${tablesList.length} tables from database`);
        setTables(tablesList);
        setConnectionMessage('Connected to Supabase database');
        setError(null);
        setIsOfflineMode(false);
      } else {
        log('Connection attempt failed');
        setConnectionMessage('Connection failed. Using fallback data.');
        setError('Failed to connect to database. Using fallback data.');
        setIsOfflineMode(true);
      }
    } catch (err) {
      log('Error during reconnection: ' + (err instanceof Error ? err.message : String(err)));
      setError('Failed to reconnect to database. Using fallback data.');
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Error handling callbacks
  const handleTableListError = (error: Error) => {
    log(`Table List Error: ${error.message}`);
    console.error("Table List Error:", error);
  };

  const handleTableDataError = (error: Error) => {
    log(`Table Data Error: ${error.message}`);
    console.error("Table Data Error:", error);
  };

  // Render table data using react-window
  const renderTableData = () => {
    if (loading) {
      return (
        <div className="p-4">
          <SkeletonLoader type="table" count={5} />
        </div>
      );
    }

    if (!tableData || tableData.length === 0) {
      return (
        <div className="text-gray-500 p-4 bg-gray-50 rounded">
          No data found in table {selectedTable}
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      );
    }

    const columns = Object.keys(tableData[0] || {});
    const rowHeight = 80; // Estimated height per row (adjust as needed based on max cell height + padding)
    const tableHeight = 600; // Max height for the virtualized list container

    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          Showing {tableData.length} of {tableCount} rows
          {error && <span className="text-orange-500 ml-2">{error}</span>}
        </p>
        
        <div className="overflow-x-auto w-full border border-gray-200"> {/* Added border */}
          {/* Table Header */}
          <div className="flex bg-gray-50 sticky top-0 z-10"> {/* Make header sticky */}
             {columns.map(column => (
               <div 
                 key={column} 
                 className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[350px] whitespace-normal flex-shrink-0"
                 style={{ width: '350px' }} // Consistent width with cells
               >
                 {column}
               </div>
             ))}
           </div>
           
           {/* Virtualized Table Body */}
           <FixedSizeList
            height={tableHeight} // Height of the scrollable area
            itemCount={tableData.length} // Number of rows
            itemSize={rowHeight} // Height of each row
            width="100%" // Take full width
            itemData={{ columns, rows: tableData }} // Pass data to Row component
           >
             {Row}
           </FixedSizeList>
        </div>
      </div>
    );
  };
  
  // Render the main content
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Database Explorer</h1>
        
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator showDetails className="mr-4" />
          
          <button
            onClick={handleRetryConnection}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded disabled:opacity-50"
          >
            {loading ? (
              <LoadingIndicator type="spinner" size="small" className="mx-2" />
            ) : (
              'Refresh Connection'
            )}
          </button>
        </div>
      </div>
      
      {/* Add synchronization indicator */}
      <div className="mb-4">
        <SynchronizationIndicator position="top" />
      </div>
      
      {isOfflineMode && (
        <div className="mb-4">
          <FallbackIndicator position="top" showDetails={true} className="rounded-md" />
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
        <ErrorBoundary onError={handleTableListError}>
          <div className="md:col-span-1 bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Tables</h3>
            
            {loading && tables.length === 0 ? (
              <SkeletonLoader type="list" count={8} className="p-2" />
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
                    onClick={() => {
                      setSelectedTable(table);
                    }}
                  >
                    {table}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ErrorBoundary>
        
        <ErrorBoundary onError={handleTableDataError}>
          <div className="md:col-span-3 bg-white shadow rounded-lg overflow-hidden">
            {selectedTable ? (
              <>
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">
                      Table: <span className="text-indigo-600">{selectedTable}</span>
                    </h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewMode(viewMode === 'data' ? 'schema' : 'data')}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        {viewMode === 'data' ? 'View Schema' : 'View Data'}
                      </button>
                      <button
                        onClick={() => {
                          if (selectedTable) {
                            loadTableData(selectedTable);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
                
                {renderTableData()}
              </>
            ) : (
              <div className="p-4 text-center text-gray-500">
                Select a table from the list to view its data.
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