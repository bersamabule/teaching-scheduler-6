# Teaching Scheduler 6 - Diagnostic Tools

This directory contains diagnostic tools for troubleshooting and resolving issues with the Teaching Scheduler 6 application.

## Supabase Diagnostics Tool

The `supabase-diagnostics.js` file is a comprehensive diagnostic tool for identifying and resolving Supabase connectivity issues. It helps track down common problems such as:

- Environment configuration inconsistencies
- Network connectivity issues
- API key and authentication problems
- Database table access issues
- Missing RPC functions

### How to Use

Run the diagnostic tool from the project root directory:

```bash
cd teaching-scheduler-6
node tools/supabase-diagnostics.js
```

The tool will perform a series of tests and generate a detailed report in `supabase-diagnostics-report.json` in the project root directory.

### Features

1. **Environment File Analysis**
   - Checks all .env files for Supabase configuration
   - Identifies inconsistencies between different environment files
   - Validates environment variable naming conventions

2. **Network Connectivity Testing**
   - Verifies that the Supabase URL is reachable
   - Checks DNS resolution
   - Tests HTTPS connectivity

3. **API Authentication Testing**
   - Validates API key format and authentication
   - Tests session management
   - Checks authorization levels

4. **Database Table Testing**
   - Lists all available tables in the database
   - Tests access permissions for essential tables
   - Verifies query functionality

5. **RPC Function Testing**
   - Lists available RPC functions
   - Tests the 'version' function that's used for connectivity checks
   - Identifies missing functions referenced in code

### Troubleshooting Guide

The tool provides a detailed report with recommendations for resolving any issues it finds. Common solutions include:

1. **Environment Variable Issues**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correctly set in `.env.local`
   - Check for consistency across all environment files
   - Verify that variable names match what the code expects

2. **Network Issues**
   - Check firewall settings and internet connectivity
   - Verify the Supabase project is still active
   - Test from different networks if possible

3. **API Key Issues**
   - Generate a new API key from the Supabase dashboard
   - Check if using anon key vs service role key is appropriate
   - Verify API key permissions

4. **Database Structure Issues**
   - Check if the expected tables exist in your database
   - Update code to match the actual table names in the database
   - Verify RLS (Row Level Security) permissions

5. **RPC Function Issues**
   - Update the ping method in `service.ts` to use table queries instead of RPC
   - Create missing RPC functions in the Supabase database
   - Check function permissions

## Documentation

For more detailed information about Supabase connectivity troubleshooting, refer to the main documentation file:

- [`../docs/supabase-connectivity-troubleshooting.md`](../docs/supabase-connectivity-troubleshooting.md) 