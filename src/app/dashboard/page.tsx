'use client';

import React, { useState, useEffect } from 'react';
// Charting libraries
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
// Import service only if needed for other methods like getInstance or connection status
import { SupabaseService } from '@/lib/supabase/service'; 
// Import data fetching functions directly
import { 
  Teacher, 
  CalendarEntry, 
  getTeachers, 
  getCalendarTables, 
  getCalendarEntries 
} from '@/lib/supabase/data'; 
import SkeletonLoader from '@/components/SkeletonLoader';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Get service instance if needed for status checks, etc.
// const supabaseService = SupabaseService.getInstance(); 
// We might not need the instance directly in this component if just fetching data

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  // Note: Fetching ALL calendar entries might be inefficient for large datasets.
  // Consider fetching aggregated data or implementing pagination/filtering if performance becomes an issue.
  const [allCalendarEntries, setAllCalendarEntries] = useState<CalendarEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch teachers directly using the imported function
        const fetchedTeachers = await getTeachers();
        setTeachers(fetchedTeachers);

        // Fetch calendar tables directly
        const calendarTables = await getCalendarTables();
        let entries: CalendarEntry[] = [];
        for (const tableName of calendarTables) {
          // Fetch entries directly
          const tableEntries = await getCalendarEntries(tableName); 
          entries = entries.concat(tableEntries);
        }
        setAllCalendarEntries(entries);

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError(`Failed to load dashboard data: ${err.message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics
  const teacherWorkload: { [teacherName: string]: number } = {};
  let ntLedCount = 0;
  let nonNtLedCount = 0;
  let totalScheduledClasses = 0;
  let totalTeachers = 0;

  if (!isLoading && !error) {
    totalTeachers = teachers.length;
    totalScheduledClasses = allCalendarEntries.length;

    // Initialize workload count for all teachers
    teachers.forEach(teacher => {
      teacherWorkload[teacher.Teacher_name] = 0;
    });

    allCalendarEntries.forEach(entry => {
      // Count NT-Led vs Non-NT-Led
      // Normalize NT-Led value (could be boolean or string)
      const isNtLed = entry['NT-Led'] === true || String(entry['NT-Led']).toLowerCase() === 'true';
      if (isNtLed) {
        ntLedCount++;
        // Assign NT-Led classes to all Native teachers (approximation for dashboard)
        // Note: This differs from the schedule view logic which might be more specific.
        // A better approach would be a dedicated field or clearer assignment logic.
        teachers.forEach(teacher => {
          if (teacher.Teacher_Type?.toLowerCase() === 'native') {
            teacherWorkload[teacher.Teacher_name] = (teacherWorkload[teacher.Teacher_name] || 0) + 1;
          }
        });
      } else {
        nonNtLedCount++;
        // Assign to specific teachers listed in Day1/Day2
        [entry.Day1, entry.Day2].forEach(assignedTeacherName => {
          if (assignedTeacherName && teacherWorkload.hasOwnProperty(assignedTeacherName)) {
            teacherWorkload[assignedTeacherName]++;
          }
        });
      }
    });
  }

  // Prepare data for charts
  const teacherNames = Object.keys(teacherWorkload);
  const workloadData = Object.values(teacherWorkload);
  const classTypeData = [nonNtLedCount, ntLedCount]; // Order: Non-NT, NT

  // Chart configurations
  const workloadChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Teacher Workload (Number of Classes)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Classes'
        }
      }
    }
  };

  const workloadChartData = {
    labels: teacherNames,
    datasets: [
      {
        label: 'Classes Assigned',
        data: workloadData,
        backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const classTypeChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Class Type Distribution',
      },
    },
  };

  const classTypeChartData = {
    labels: ['Non-NT Led', 'NT-Led'],
    datasets: [
      {
        label: '# of Classes',
        data: classTypeData,
        backgroundColor: [
          'rgba(255, 159, 64, 0.6)', // Orange
          'rgba(75, 192, 192, 0.6)', // Teal
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Statistical Dashboard</h1>

      {isLoading && (
        <div>
          <SkeletonLoader type="text" width="200px" height="30px" className="mb-4" />
          <SkeletonLoader type="text" width="100%" height="20px" className="mb-2" />
          <SkeletonLoader type="text" width="90%" height="20px" className="mb-2" />
          <SkeletonLoader type="text" width="95%" height="20px" />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!isLoading && !error && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Stat Card 1: Total Teachers */}
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-medium text-gray-500">Total Teachers</h3>
              <p className="text-3xl font-semibold text-gray-900">{totalTeachers}</p>
            </div>

            {/* Stat Card 2: Total Scheduled Classes */}
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-lg font-medium text-gray-500">Total Scheduled Classes</h3>
              <p className="text-3xl font-semibold text-gray-900">{totalScheduledClasses}</p>
            </div>
            
            {/* Add more stat cards here */}
          </div>

          <h2 className="text-xl font-semibold mb-4">Visualizations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Teacher Workload Chart */}
            <div className="bg-white p-4 rounded shadow">
              {workloadData.length > 0 ? (
                <Bar options={workloadChartOptions} data={workloadChartData} />
              ) : (
                <p className="text-gray-500">No workload data available.</p>
              )}
            </div>

            {/* Class Type Distribution Chart */}
            <div className="bg-white p-4 rounded shadow flex justify-center items-center" style={{ maxHeight: '400px' }}> 
              {classTypeData.reduce((a, b) => a + b, 0) > 0 ? (
                <Doughnut options={classTypeChartOptions} data={classTypeChartData} />
              ) : (
                <p className="text-gray-500">No class type data available.</p>
              )}
            </div>
          </div>
          
          {/* Placeholder for future charts/tables */}
          {/* <div className="bg-white p-4 rounded shadow mb-6">
            <p className="text-gray-600">More visualizations...</p>
          </div> */}
        </div>
      )}
    </div>
  );
};

export default DashboardPage; 