'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTables, getTableData, KNOWN_TABLES, discoverDatabaseSchema, clearCache } from '@/lib/supabase/data';
import { supabaseService, ConnectionStatus } from '@/lib/supabase/service';
import ConnectionStatusIndicator from '@/components/ConnectionStatusIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FallbackIndicator from '@/components/FallbackIndicator';
import SynchronizationIndicator from '@/components/SynchronizationIndicator';
import LoadingIndicator from '@/components/LoadingIndicator';
import LoadingOverlay from '@/components/LoadingOverlay';
import SkeletonLoader from '@/components/SkeletonLoader';

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

// Define column type for the schema view
interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  inferred?: boolean;
}

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
  const [databaseStructure, setDatabaseStructure] = useState<Record<string, any> | null>(null);
  const [showSchemaView, setShowSchemaView] = useState<boolean>(false);
  const [isDiscoveringSchema, setIsDiscoveringSchema] = useState<boolean>(false);
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
          
          // Only show tables that actually exist in the database
          if (supabaseService.isOffline()) {
            log('Using fallback tables list in offline mode');
            setTables(KNOWN_TABLES);
            setError('Using fallback data in offline mode');
          } else {
            // These are the actual tables from the database
            setTables(tablesList);
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
          // Use the existing function to load table data
          if (selectedTable) {
            setLoading(true);
            setError(null);
            getTableData(selectedTable)
              .then(({ data, count }) => {
                setTableData(data);
                setTableCount(count);
                log(`Loaded ${data.length} rows from ${selectedTable} (total: ${count})`);
              })
              .catch((dataError) => {
                log('Error loading table data: ' + (dataError instanceof Error ? dataError.message : String(dataError)));
              })
              .finally(() => {
                setLoading(false);
              });
          }
        }
      }
    };
    
    supabaseService.addObserver(observer);
    
    // Cleanup on unmount
    return () => {
      supabaseService.removeObserver(observer);
    };
  }, [selectedTable]);
  
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
        
        // Force a refresh of table list by clearing cache
        try {
          log('Clearing table cache to get fresh data...');
          // Use the exported clearCache function
          clearCache();
          log('Cache cleared successfully');
        } catch (cacheError) {
          log('Error clearing cache: ' + (cacheError instanceof Error ? cacheError.message : String(cacheError)));
        }
        
        // Reload tables - these are the actual tables from the database
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
        // Make sure tables are set to fallback
        setTables(KNOWN_TABLES);
        setIsOfflineMode(true);
      }
    } catch (err) {
      log('Error during reconnection: ' + (err instanceof Error ? err.message : String(err)));
      setError('Failed to reconnect to database. Using fallback data.');
      setTables(KNOWN_TABLES);
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Add a function to discover the complete database schema
  const handleDiscoverSchema = async () => {
    log('Starting deep database schema discovery...');
    setIsDiscoveringSchema(true);
    setError(null);
    
    try {
      const { tables: discoveredTables, structure } = await discoverDatabaseSchema();
      log(`Discovered ${discoveredTables.length} tables in database`);
      
      setTables(discoveredTables);
      setDatabaseStructure(structure);
      setShowSchemaView(true);
      setError(null);
      setIsOfflineMode(false);
    } catch (err) {
      log('Error during schema discovery: ' + (err instanceof Error ? err.message : String(err)));
      setError('Failed to discover database schema. Using fallback data.');
      setIsOfflineMode(true);
    } finally {
      setIsDiscoveringSchema(false);
    }
  };
  
  // Error handling callbacks
  const handleTableListError = (error: Error, errorInfo: React.ErrorInfo) => {
    log(`Table List Error: ${error.message}`);
    console.error("Table List Error Details:", errorInfo);
  };

  const handleTableDataError = (error: Error, errorInfo: React.ErrorInfo) => {
    log(`Table Data Error: ${error.message}`);
    console.error("Table Data Error Details:", errorInfo);
  };

  const handleSchemaViewError = (error: Error, errorInfo: React.ErrorInfo) => {
    log(`Schema View Error: ${error.message}`);
    console.error("Schema View Error Details:", errorInfo);
  };
  
  // Render table data
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

    return (
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          Showing {tableData.length} of {tableCount} rows
          {error && <span className="text-orange-500 ml-2">{error}</span>}
        </p>
        
        <div className="overflow-x-auto w-full">
          <table className="table-auto border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {Object.keys(tableData[0] || {}).map(column => (
                  <th key={column} className="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-200 min-w-[150px]">
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
                      className="p-2 text-sm border border-gray-200 whitespace-normal truncate min-w-[150px]"
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
    );
  };

  // Render schema view
  const renderSchemaView = () => {
    if (!databaseStructure || !selectedTable || !databaseStructure[selectedTable]) {
      return (
        <div className="p-4 text-center text-gray-500">
          No schema information available for this table.
        </div>
      );
    }

    const tableInfo = databaseStructure[selectedTable];

    return (
      <div className="p-4">
        <div className="mb-4 bg-gray-50 p-2 rounded text-sm">
          <div className="flex items-center">
            <span className="font-medium mr-2">Table Status:</span>
            <span className={`text-xs px-2 py-1 rounded ${tableInfo.exists ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {tableInfo.exists ? 'Exists' : 'Not Verified'}
            </span>
            {tableInfo.source && (
              <span className="text-xs text-gray-500 ml-2">
                Source: {tableInfo.source}
              </span>
            )}
          </div>
        </div>
        
        {tableInfo.columns && tableInfo.columns.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <table className="table-auto border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-1 text-left text-xs font-medium text-gray-500 border border-gray-200 min-w-[150px]">Name</th>
                  <th className="p-1 text-left text-xs font-medium text-gray-500 border border-gray-200 min-w-[150px]">Type</th>
                  <th className="p-1 text-left text-xs font-medium text-gray-500 border border-gray-200 min-w-[100px]">Nullable</th>
                  <th className="p-1 text-left text-xs font-medium text-gray-500 border border-gray-200 min-w-[150px]">Default</th>
                </tr>
              </thead>
              <tbody>
                {(tableInfo.columns as ColumnInfo[]).map((column: ColumnInfo, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-1 border border-gray-200 min-w-[150px]">{column.name}</td>
                    <td className="p-1 border border-gray-200 min-w-[150px]">
                      <span className={column.inferred ? 'text-amber-600 italic' : ''}>
                        {column.type}
                        {column.inferred && ' (inferred)'}
                      </span>
                    </td>
                    <td className="p-1 border border-gray-200 min-w-[100px]">
                      {column.nullable !== undefined ? 
                        (column.nullable ? 'Yes' : 'No') : 
                        '-'}
                    </td>
                    <td className="p-1 border border-gray-200 min-w-[150px] truncate">
                      {column.default !== undefined ? column.default : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No column information available</p>
        )}
        
        {tableInfo.sample && (
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Sample Data:</div>
            <div className="bg-gray-50 p-2 rounded overflow-x-auto">
              <pre className="text-xs">{JSON.stringify(tableInfo.sample, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render the page
  const renderMainContent = () => {
    return (
      <div className="flex flex-col space-y-4">
        {/* Table List Section */}
        <ErrorBoundary onError={handleTableListError}>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Database Tables</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleDiscoverSchema}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Discover Schema
                  </button>
                  <button
                    onClick={() => clearCache()}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {/* Existing table list rendering */}
              <div className="p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {loading && tables.length === 0 ? (
                  <SkeletonLoader type="list" count={8} className="p-2" />
                ) : tables.length === 0 ? (
                  <div className="text-red-500 text-sm p-3 bg-red-50 rounded">
                    No tables found. Check database connection.
                  </div>
                ) : (
                  tables.map((table) => (
                    <button
                      key={table}
                      onClick={() => setSelectedTable(table)}
                      className={`px-3 py-2 text-sm rounded text-left ${
                        selectedTable === table
                          ? 'bg-indigo-100 text-indigo-800 font-medium'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {table}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </ErrorBoundary>

        {/* Selected Table Data or Schema View */}
        {selectedTable && (
          <ErrorBoundary onError={handleTableDataError}>
            <div className="bg-white shadow rounded-lg overflow-hidden">
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
                          setLoading(true);
                          setError(null);
                          getTableData(selectedTable)
                            .then(({ data, count }) => {
                              setTableData(data);
                              setTableCount(count);
                              log(`Loaded ${data.length} rows from ${selectedTable} (total: ${count})`);
                            })
                            .catch((dataError) => {
                              log('Error loading table data: ' + (dataError instanceof Error ? dataError.message : String(dataError)));
                            })
                            .finally(() => {
                              setLoading(false);
                            });
                        }
                      }}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Render data or schema based on view mode */}
              {viewMode === 'data' ? (
                renderTableData()
              ) : (
                <ErrorBoundary onError={handleSchemaViewError}>
                  {renderSchemaView()}
                </ErrorBoundary>
              )}
            </div>
          </ErrorBoundary>
        )}
      </div>
    );
  };
  
  // Register/unregister component when using fallback data
  useEffect(() => {
    if (isOfflineMode) {
      supabaseService.registerFallbackUsage('DatabaseExplorer');
    } else {
      supabaseService.unregisterFallbackUsage('DatabaseExplorer');
    }
    
    return () => {
      supabaseService.unregisterFallbackUsage('DatabaseExplorer');
    };
  }, [isOfflineMode]);
  
  // Render the page
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
        <ErrorBoundary>
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
                      setShowSchemaView(false);
                    }}
                  >
                    {table}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ErrorBoundary>
        
        <ErrorBoundary>
          {renderMainContent()}
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