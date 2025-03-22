/**
 * Health check API endpoint for Docker health checks
 * 
 * This endpoint returns a 200 OK response if the application is running correctly.
 * It also checks the Supabase connection if the checkDatabase parameter is set.
 */

import { supabase } from '../../src/lib/supabase/client';

export default async function handler(req, res) {
  try {
    // Basic application health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      supabase: 'unchecked'
    };

    // Check Supabase connection if requested
    if (req.query.checkDatabase === 'true') {
      try {
        // Simple query to check if Supabase is responsive
        const { data, error } = await supabase
          .from('Teachers')
          .select('Teacher_ID')
          .limit(1);
        
        if (error) {
          health.supabase = 'error';
          health.supabaseError = error.message;
        } else {
          health.supabase = 'ok';
        }
      } catch (dbError) {
        health.supabase = 'error';
        health.supabaseError = dbError.message;
      }
    }

    // Return health status
    res.status(200).json(health);
  } catch (error) {
    // If any error occurs, return 500
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 