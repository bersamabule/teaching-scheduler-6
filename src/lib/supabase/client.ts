import { createClient } from '@supabase/supabase-js';

// Use the correct Supabase URL and key for the teaching scheduler database
export const supabaseUrl = 'https://tdcxyktnqtdeyvcpogyg.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkY3h5a3RucXRkZXl2Y3BvZ3lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkwNTU2MTAsImV4cCI6MjAyNDYzMTYxMH0.C1YPYQvHxCgxFNK9Td8mYL2tIuoGpyIUP--Zhx-N-y0';

// Create Supabase client with the minimal required configuration
export const supabase = createClient(supabaseUrl, supabaseKey);

// Log connection information for debugging
console.log('Supabase client initialized with URL:', supabaseUrl); 