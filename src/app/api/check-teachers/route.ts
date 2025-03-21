import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Get teachers data
    const { data: teachers, error } = await supabase
      .from('Teachers')
      .select('*')
      .limit(3);

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 500 }
      );
    }

    // Get column info if available
    const { data: tableInfo, error: tableError } = await supabase
      .from('Teachers')
      .select('*')
      .limit(0);

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