'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function InspectTables() {
  const [teachersData, setTeachersData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeachersStructure() {
      try {
        setLoading(true);
        // First, get a sample row to examine structure
        let query = supabase
          .from('Teachers')
          .select('*');
        
        // Check if the query object has the limit method before calling it
        if (typeof query === 'object' && query !== null && 'limit' in query && typeof query.limit === 'function') {
          query = query.limit(1);
        }
        
        const { data, error } = await query;

        if (error) {
          throw error;
        }

        // Now, get the column definitions
        let columns = null;
        let columnsError = null;

        try {
          if (typeof supabase === 'object' && supabase !== null && 'rpc' in supabase && typeof supabase.rpc === 'function') {
            const result = await supabase
              .rpc('get_column_info', { table_name: 'Teachers' })
              .select('*');
            
            columns = result.data;
            columnsError = result.error;
          } else {
            console.warn('RPC method not available on Supabase client');
          }
        } catch (rpcError: any) {
          console.warn('Could not get column definitions:', rpcError);
          columnsError = rpcError;
        }

        if (columnsError) {
          console.warn('Could not get column definitions:', columnsError);
        }

        setTeachersData({
          sampleRow: data?.[0] || null,
          columns: columns || null,
          rawData: data
        });
      } catch (error: any) {
        console.error('Error fetching Teachers structure:', error);
        setError(error.message || 'Failed to fetch Teachers structure');
      } finally {
        setLoading(false);
      }
    }

    fetchTeachersStructure();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Table Structure Inspector</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Teachers Table</h2>
        
        {loading ? (
          <p>Loading structure...</p>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-medium mb-2">Sample Row:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(teachersData?.sampleRow, null, 2)}
            </pre>
            
            <h3 className="text-lg font-medium mt-4 mb-2">Raw Data Format:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
              {JSON.stringify(teachersData?.rawData, null, 2)}
            </pre>
            
            <h3 className="text-lg font-medium mt-4 mb-2">Column Definitions:</h3>
            {teachersData?.columns ? (
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
                {JSON.stringify(teachersData.columns, null, 2)}
              </pre>
            ) : (
              <p>Column definitions not available</p>
            )}
            
            <h3 className="text-lg font-medium mt-4 mb-2">Object Keys:</h3>
            {teachersData?.sampleRow ? (
              <ul className="list-disc pl-5">
                {Object.keys(teachersData.sampleRow).map(key => (
                  <li key={key} className="mb-1">
                    <span className="font-medium">{key}:</span>{' '}
                    <span className="text-gray-600">{typeof teachersData.sampleRow[key]}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No sample data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 