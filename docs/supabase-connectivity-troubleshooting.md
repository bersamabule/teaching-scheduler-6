# Supabase Connectivity Troubleshooting Guide

This document tracks all attempts to resolve Supabase connectivity issues in the Teaching Scheduler 6 application. This serves as a reference to avoid repeating unsuccessful troubleshooting steps and to build on what we've learned.

## Current Issues

As of March 23, 2025, the application experiences the following Supabase connectivity errors:

1. **RPC Function Error**: 
   ```
   [DB] Connection attempt 1/3 failed: {"code":"PGRST004","details":"Searched for the function public.version without parameters or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.","hint":null,"message":"Could not find the function public.version without parameters in the schema cache"}
   ```

2. **401 Unauthorized Errors**: 
   ```
   Failed to load resource: the server responded with a status of 401 ()
   ```

3. **Connection refused errors**:
   ```
   Failed to load resource: net::ERR_CONNECTION_REFUSED
   ```

## Environment Configuration Issues

### Environment Variable Names

We've identified inconsistencies between the variable names in different files:

1. **In client.ts**: Using `NEXT_PUBLIC_SUPABASE_KEY`
2. **In .env.local**: Using `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Multiple Configuration Files

The project has several environment configuration files that might conflict:
- `.env`
- `.env.local`
- `.env.production`
- `.env.staging`

### Next.js Configuration Issues

The next.config.js file contains:
1. Deprecated `swcMinify` option that causes warnings
2. Incorrect Supabase domain in `images.domains`
3. Inconsistent environment variable references

## Attempted Solutions

### March 23, 2025 - First Troubleshooting Session

1. **Environment Variable Name Alignment**
   - Changed `NEXT_PUBLIC_SUPABASE_KEY` to `NEXT_PUBLIC_SUPABASE_ANON_KEY` in client.ts
   - Status: ✅ Implemented but didn't resolve the issue

2. **Updated Environment File Values**
   - Ensured .env and .env.local have matching Supabase credentials
   - Status: ✅ Implemented but didn't resolve the issue

3. **Next.js Configuration Cleanup**
   - Removed deprecated swcMinify option
   - Updated Supabase domain from `tdcxyktnqtdeyvcpogyg` to `tarhblookmrkyfjqhqrv`
   - Correctly passed environment variables
   - Status: ✅ Implemented, resolved warnings but not connectivity

4. **Health API Endpoint Conflict Resolution**
   - Removed duplicate health API endpoint in pages/api directory
   - Status: ✅ Implemented, resolved route conflict

5. **Parent Package.json Update**
   - Added scripts to handle running the app from parent directory
   - Status: ✅ Implemented, improved developer experience

6. **RPC Function Fix**
   - Replaced the non-existent `version` RPC function call with a simple table query
   - Changed from `this.client.rpc('version', {})` to:
   ```typescript
   this.client
     .from('Teachers')  // Replace with a table name from your database
     .select('count')
     .limit(1);
   ```
   - Status: ✅ Implemented, should address the "Could not find function public.version" error

## Remaining Issues To Investigate

1. **API Key Verification**
   - Need to verify if the Supabase API key is valid and has appropriate permissions
   - Try generating a new API key from the Supabase dashboard

2. **Database Structure Verification**
   - Confirm that the 'Teachers' table exists in the database
   - If not, find a table that does exist and update the ping method accordingly

3. **Network/Firewall Issues**
   - Check if there are any network restrictions preventing connection to Supabase
   - Try connecting from a different network or using a VPN

4. **Service Role vs Anon Key**
   - Investigate if we should be using a service role key instead of anon key for background operations
   - Check if key permissions align with operations being performed

5. **Debugging Additional Information**
   - Add more verbose logging to capture the exact request/response cycle
   - Implement network request interception to see the full requests

## Implemented Fixes

1. **March 24, 2025 - Environment Variable Alignment**
   - Fixed inconsistency with environment variable names
   - Changed from `NEXT_PUBLIC_SUPABASE_KEY` to `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `client.ts`
   - Added additional logging to show when fallback credentials are being used
   - Status: ✅ Implemented, should resolve credential/authorization issues

2. **March 24, 2025 - Database Ping Method Fix**
   - Replaced the non-existent `version` RPC function call with a simple table query
   - Changed from `this.client.rpc('version', {})` to:
   ```typescript
   this.client
     .from('Teachers')
     .select('count', { count: 'exact', head: true });
   ```
   - Status: ✅ Implemented, should resolve the "Could not find function public.version" error
   
3. **March 24, 2025 - Added Console Monitoring**
   - Implemented a robust console monitoring system with MCP server integration
   - Created a UI for viewing and filtering logs directly in the application
   - Added tools for analyzing Supabase-related errors
   - Status: ✅ Implemented, will improve troubleshooting capabilities

## Next Steps

1. Verify that our implemented fixes resolve the connectivity issues
2. Generate a new API key if the current one is invalid or has insufficient permissions
3. Implement a more robust error handling system for Supabase queries
4. Update environment variables in deployment configurations
5. Consider adding a caching system for resilience against API outages

## References

1. [Supabase Client Library Documentation](https://supabase.com/docs/reference/javascript/initializing)
2. [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
3. [PostgreSQL RPC Functions](https://postgrest.org/en/stable/api.html#stored-procedures)

## Revision History

- **March 24, 2025**: Updated document with implemented fixes for environment variable consistency and database ping method
- **March 23, 2025**: Initial troubleshooting document created, tracking all attempted fixes to date 

## Common Issues

### Connection Failures

If the connection to Supabase fails, the application will automatically:
1. Attempt to reconnect up to 3 times with exponential backoff
2. Fall back to using mock data if all connection attempts fail
3. Continue to periodically check connectivity in the background

### Environment Variable Consistency

- The application looks for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the environment
- For backward compatibility, it will also check for `NEXT_PUBLIC_SUPABASE_KEY`
- Ensure these environment variables are correctly set in both development and production

### Case Sensitivity in Data Structures

The application now handles different case variations in field names from the Supabase database:

- For teachers data, it checks multiple case variations:
  - `Teacher_ID` / `TEACHER_ID` / `teacher_id`
  - `Teacher_name` / `TEACHER_NAME` / `teacher_name`
  - `Teacher_Type` / `TEACHER_TYPE` / `teacher_type`
  - `Department` / `DEPARTMENT` / `department`

- When using the `TeacherSelect` component, teacher types are normalized to ensure proper categorization:
  - "native"/"NATIVE"/"Native" → "Native"
  - "local"/"LOCAL"/"Local" → "Local"

## Debugging Techniques

1. Check the console logs for connection status and errors
2. Use the built-in debug panel in the TeacherSelect component
3. Examine the Network tab in browser DevTools for API calls to Supabase
4. Verify that the data being returned from Supabase has the expected structure

## Recent Updates (2023-11-07)

- Enhanced case-insensitive field name handling in data retrieval
- Improved debugging in TeacherSelect component
- Fixed issues with teacher dropdown display and Z-index
- Added comprehensive teacher type normalization for consistent filtering
- Implemented better error logging for database connection issues 