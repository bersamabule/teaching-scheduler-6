'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TeacherInspector() {
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeachers() {
      try {
        setLoading(true);
        
        // Log the query we're making
        console.log('Fetching Teachers table data');
        
        // Get data from the Teachers table
        const { data, error } = await supabase
          .from('Teachers')
          .select('*')
          .limit(5);

        if (error) {
          console.error('Error fetching Teachers:', error);
          throw error;
        }

        if (data && data.length > 0) {
          // Log the first item to see structure
          console.log('First teacher record:', data[0]);
          console.log('Keys in first record:', Object.keys(data[0]));
        }

        setTeacherData(data);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTeachers();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Teacher Table Inspector</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-md mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      ) : !teacherData || teacherData.length === 0 ? (
        <p>No teachers found</p>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Column Names:</h2>
            <div className="bg-gray-100 p-4 rounded-md overflow-auto">
              <pre>{JSON.stringify(Object.keys(teacherData[0]), null, 2)}</pre>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold mb-2">Teacher Data:</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  {Object.keys(teacherData[0]).map((key) => (
                    <th key={key} className="border border-gray-200 px-4 py-2 bg-gray-50 text-left">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teacherData.map((teacher: any, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    {Object.entries(teacher).map(([key, value]) => (
                      <td key={key} className="border border-gray-200 px-4 py-2">
                        {value === null ? 'null' : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Raw Data:</h2>
            <div className="bg-gray-100 p-4 rounded-md overflow-auto">
              <pre>{JSON.stringify(teacherData, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 