import { NextRequest, NextResponse } from 'next/server';

/**
 * POST handler for clearing all console logs
 */
export async function POST(request: NextRequest) {
  try {
    // Call the DELETE method on the parent API
    const response = await fetch(`${request.nextUrl.origin}/api/console-logs`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to clear logs' },
        { status: 500 }
      );
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error clearing console logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear logs' },
      { status: 500 }
    );
  }
} 