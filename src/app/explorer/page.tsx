'use client';

import { useState, useEffect } from 'react';
import { getTables, getTableData } from '@/lib/supabase/data';

// Fallback data for when the database connection fails
const FALLBACK_TABLES = [
  'Students-English',
  'Sprouts2-Course-Calendar',
  'Teachers',
  'Clover3A-Course-Calendar',
  'Clover2A-Course-Calendar'
];

// Simple fallback data for tables
const FALLBACK_DATA = {
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
  
  // Add log function for debugging
  const log = (message: string) => {
    console.log(message);
    setDebugMessages(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev]);
  };
  
  // Load database schema on initial page load
  useEffect(() => {
    async function loadDatabaseSchema() {
      setLoading(true);
      setError(null);
      try {
        log('Starting database analysis...');
        
        // Get table list
        try {
          const tablesList = await getTables();
          log(`Found ${tablesList.length} tables`);
          setTables(tablesList);
        } catch (tableError) {
          log('Error fetching tables: ' + (tableError instanceof Error ? tableError.message : String(tableError)));
          setTables(FALLBACK_TABLES);
          setError('Failed to connect to database. Using fallback data.');
        }
      } catch (err) {
        log('Error during database discovery: ' + (err instanceof Error ? err.message : String(err)));
        setError('Failed to load database schema. Using fallback data.');
        setTables(FALLBACK_TABLES);
      } finally {
        setLoading(false);
      }
    }
    
    loadDatabaseSchema();
  }, []);
  
  // Load table data when a table is selected
  useEffect(() => {
    if (!selectedTable) {
      setTableData(null);
      setTableCount(0);
      return;
    }
    
    async function loadTableData() {
      setLoading(true);
      setError(null);
      try {
        log(`Loading data from table: ${selectedTable}`);
        
        // Try to get data from the database
        try {
          const { data, count } = await getTableData(selectedTable, 50);
          setTableData(data);
          setTableCount(count);
          log(`Loaded ${data.length} rows from ${selectedTable} (total: ${count})`);
        } catch (dataError) {
          log('Error loading table data: ' + (dataError instanceof Error ? dataError.message : String(dataError)));
          
          // Use fallback data if available
          const tableName = selectedTable; // Assign to const to avoid null issues
          if (tableName in FALLBACK_DATA) {
            const fallbackData = FALLBACK_DATA[tableName as keyof typeof FALLBACK_DATA];
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
    
    loadTableData();
  }, [selectedTable]);
  
  // Render the page
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Database Explorer</h1>
      
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
      </div>
      
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
    </div>
  );
} 