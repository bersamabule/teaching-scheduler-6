import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Get teachers data
    let query = supabase
      .from('Teachers')
      .select('*');
      
    // Check if the query object has the limit method before calling it
    if (typeof query === 'object' && query !== null && 'limit' in query && typeof query.limit === 'function') {
      query = query.limit(3);
    }
    
    const { data: teachers, error } = await query;

    if (error) {
      return NextResponse.json(
        { 
          error: error.message, 
          status: 'error'
        },
        { status: 500 }
      );
    }

    // Get column info if available
    let infoQuery = supabase
      .from('Teachers')
      .select('*');
      
    // Check if the query object has the limit method before calling it
    if (typeof infoQuery === 'object' && infoQuery !== null && 'limit' in infoQuery && typeof infoQuery.limit === 'function') {
      infoQuery = infoQuery.limit(0);
    }
    
    const { data: tableInfo, error: tableError } = await infoQuery;

    // Extract column names from first record
    const columnNames = teachers && teachers.length > 0 
      ? Object.keys(teachers[0])
      : [];

    return NextResponse.json({
      success: true,
      teachers: teachers,
      columnNames: columnNames,
      tableInfo: tableInfo || null,
      tableError: tableError ? tableError.message : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 