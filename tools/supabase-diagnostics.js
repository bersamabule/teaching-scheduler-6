/**
 * Supabase Diagnostics Tool
 * 
 * This tool runs a series of tests to diagnose Supabase connectivity issues
 * and provides detailed information about potential problems.
 * 
 * Run with: node tools/supabase-diagnostics.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Set up logging
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`),
  json: (data) => console.log(JSON.stringify(data, null, 2)),
};

// Test results storage
const results = {
  env: {},
  network: {},
  api: {},
  tables: {},
  rpc: {},
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

// Record test result
function recordResult(category, test, passed, details = null) {
  if (!results[category]) {
    results[category] = {};
  }
  
  results[category][test] = {
    passed,
    details,
    timestamp: new Date().toISOString(),
  };
  
  if (passed === true) {
    results.summary.passed++;
  } else if (passed === false) {
    results.summary.failed++;
  } else {
    results.summary.warnings++;
  }
}

// Load environment variables from .env files
async function loadEnvFiles() {
  log.section('Checking Environment Files');
  
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
  ];
  
  const rootDir = path.resolve(__dirname, '..');
  const envVars = {};
  const fileContents = {};
  
  for (const file of envFiles) {
    const filePath = path.join(rootDir, file);
    try {
      if (fs.existsSync(filePath)) {
        const content = await readFile(filePath, 'utf8');
        fileContents[file] = content;
        
        // Parse env vars
        const vars = {};
        content.split('\n').forEach(line => {
          if (line && !line.startsWith('#')) {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
              const key = match[1].trim();
              const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
              vars[key] = value;
              envVars[key] = envVars[key] || [];
              envVars[key].push({ file, value });
            }
          }
        });
        
        log.success(`Found ${file} with ${Object.keys(vars).length} variables`);
      } else {
        log.warning(`${file} not found`);
      }
    } catch (error) {
      log.error(`Failed to read ${file}: ${error.message}`);
      recordResult('env', `read_${file}`, false, { error: error.message });
    }
  }
  
  // Check for Supabase variables consistency
  const keysToCheck = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_KEY',
  ];
  
  keysToCheck.forEach(key => {
    if (!envVars[key] || envVars[key].length === 0) {
      log.error(`${key} not found in any .env file`);
      recordResult('env', `check_${key}`, false, { error: 'Not found in any file' });
    } else if (envVars[key].length > 1) {
      // Check if values are consistent
      const values = new Set(envVars[key].map(v => v.value));
      if (values.size > 1) {
        log.warning(`${key} has different values in different files`);
        recordResult('env', `check_${key}`, null, { 
          warning: 'Inconsistent values',
          values: envVars[key]
        });
      } else {
        log.success(`${key} is consistent across all files`);
        recordResult('env', `check_${key}`, true);
      }
    } else {
      log.success(`${key} found in ${envVars[key][0].file}`);
      recordResult('env', `check_${key}`, true);
    }
  });
  
  // Check for key naming conflicts
  if (envVars['NEXT_PUBLIC_SUPABASE_KEY'] && envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    log.warning('Both NEXT_PUBLIC_SUPABASE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY exist, may cause confusion');
    recordResult('env', 'key_name_conflict', null, {
      warning: 'Both key variables exist',
      NEXT_PUBLIC_SUPABASE_KEY: envVars['NEXT_PUBLIC_SUPABASE_KEY'],
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    });
  }
  
  // Return the current environment variables
  return {
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 
                 (envVars['NEXT_PUBLIC_SUPABASE_URL'] ? envVars['NEXT_PUBLIC_SUPABASE_URL'][0].value : null),
    SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                 process.env.NEXT_PUBLIC_SUPABASE_KEY ||
                 (envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ? envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'][0].value : null) ||
                 (envVars['NEXT_PUBLIC_SUPABASE_KEY'] ? envVars['NEXT_PUBLIC_SUPABASE_KEY'][0].value : null)
  };
}

// Test network connectivity to Supabase URL
async function testNetworkConnectivity(supabaseUrl) {
  log.section('Testing Network Connectivity');
  
  if (!supabaseUrl) {
    log.error('Supabase URL not provided');
    recordResult('network', 'url_check', false, { error: 'URL not provided' });
    return false;
  }
  
  // Parse URL to get hostname and port
  let url;
  try {
    url = new URL(supabaseUrl);
    log.info(`Testing connection to ${url.hostname}`);
    recordResult('network', 'url_parse', true);
  } catch (error) {
    log.error(`Invalid Supabase URL: ${supabaseUrl}`);
    recordResult('network', 'url_parse', false, { error: error.message });
    return false;
  }
  
  // Test DNS resolution
  try {
    const dnsPromise = new Promise((resolve, reject) => {
      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: '/',
        method: 'HEAD',
      }, (res) => {
        resolve(res.statusCode);
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
    
    const statusCode = await dnsPromise;
    log.success(`Successfully connected to ${url.hostname}, status code: ${statusCode}`);
    recordResult('network', 'dns_resolution', true, { statusCode });
    return true;
  } catch (error) {
    log.error(`Failed to connect to ${url.hostname}: ${error.message}`);
    recordResult('network', 'dns_resolution', false, { error: error.message });
    return false;
  }
}

// Test Supabase API key and create client
async function testSupabaseAuth(supabaseUrl, supabaseKey) {
  log.section('Testing Supabase Authentication');
  
  if (!supabaseUrl || !supabaseKey) {
    log.error('Supabase URL or Key not provided');
    recordResult('api', 'credentials_check', false, { 
      error: 'Missing credentials',
      url: !!supabaseUrl,
      key: !!supabaseKey
    });
    return null;
  }
  
  try {
    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    log.success(`Supabase client created for ${supabaseUrl}`);
    recordResult('api', 'client_creation', true);
    
    // Test authorization by making a simple request
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        log.error(`Auth check failed: ${error.message}`);
        recordResult('api', 'auth_check', false, { error: error.message });
      } else {
        log.success('Auth check passed');
        recordResult('api', 'auth_check', true);
      }
    } catch (error) {
      log.error(`Auth check failed with exception: ${error.message}`);
      recordResult('api', 'auth_check', false, { error: error.message });
    }
    
    return supabase;
  } catch (error) {
    log.error(`Failed to create Supabase client: ${error.message}`);
    recordResult('api', 'client_creation', false, { error: error.message });
    return null;
  }
}

// Test database tables
async function testDatabaseTables(supabase) {
  log.section('Testing Database Tables');
  
  if (!supabase) {
    log.error('Supabase client not available');
    return;
  }
  
  // List of tables to test from the app
  const tablesToTest = [
    'Teachers',
    'Students',
    'ClassSchedule',
    // Add other tables you expect to exist
  ];
  
  // Try to get list of tables first
  try {
    // This is a system-level query to list tables
    const { data, error } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      log.error(`Failed to list tables: ${error.message}`);
      recordResult('tables', 'list_tables', false, { error: error.message });
    } else if (data && data.length > 0) {
      log.success(`Found ${data.length} tables in the database`);
      recordResult('tables', 'list_tables', true, { tableCount: data.length });
      
      // Log the available tables
      log.info('Available tables:');
      data.forEach(table => {
        log.info(`- ${table.schemaname}.${table.tablename}`);
      });
      
      // Update the list of tables to test
      const availableTables = data.map(t => t.tablename);
      tablesToTest.forEach(table => {
        if (!availableTables.includes(table)) {
          log.warning(`Table '${table}' not found in database, will skip testing it`);
        }
      });
      
      // Filter to only test available tables
      const tablesToActuallyTest = tablesToTest.filter(t => availableTables.includes(t));
      
      // Test each available table
      for (const table of tablesToActuallyTest) {
        try {
          log.info(`Testing table: ${table}`);
          const { data, error } = await supabase
            .from(table)
            .select('count(*)')
            .limit(1);
          
          if (error) {
            log.error(`Failed to query table ${table}: ${error.message}`);
            recordResult('tables', `query_${table}`, false, { error: error.message });
          } else {
            log.success(`Successfully queried table ${table}`);
            recordResult('tables', `query_${table}`, true);
          }
        } catch (error) {
          log.error(`Exception when querying table ${table}: ${error.message}`);
          recordResult('tables', `query_${table}`, false, { error: error.message });
        }
      }
    } else {
      log.warning('No tables found in the database');
      recordResult('tables', 'list_tables', null, { warning: 'No tables found' });
    }
  } catch (error) {
    log.error(`Exception when listing tables: ${error.message}`);
    recordResult('tables', 'list_tables', false, { error: error.message });
    
    // Even if listing tables fails, try to query specific tables
    for (const table of tablesToTest) {
      try {
        log.info(`Testing table: ${table}`);
        const { data, error } = await supabase
          .from(table)
          .select('count(*)')
          .limit(1);
        
        if (error) {
          log.error(`Failed to query table ${table}: ${error.message}`);
          recordResult('tables', `query_${table}`, false, { error: error.message });
        } else {
          log.success(`Successfully queried table ${table}`);
          recordResult('tables', `query_${table}`, true);
        }
      } catch (error) {
        log.error(`Exception when querying table ${table}: ${error.message}`);
        recordResult('tables', `query_${table}`, false, { error: error.message });
      }
    }
  }
}

// Test RPC functions
async function testRpcFunctions(supabase) {
  log.section('Testing RPC Functions');
  
  if (!supabase) {
    log.error('Supabase client not available');
    return;
  }
  
  // First, try to query available functions
  try {
    // Query to list available functions
    const { data, error } = await supabase
      .from('pg_proc')
      .select('proname, proargtypes')
      .eq('pronamespace', 'public');
    
    if (error) {
      log.error(`Failed to list functions: ${error.message}`);
      recordResult('rpc', 'list_functions', false, { error: error.message });
    } else if (data && data.length > 0) {
      log.success(`Found ${data.length} functions in the database`);
      recordResult('rpc', 'list_functions', true, { functionCount: data.length });
      
      // Log the available functions
      log.info('Available functions:');
      data.forEach(func => {
        log.info(`- ${func.proname}`);
      });
      
      // Check if version function exists
      const versionFunctionExists = data.some(f => f.proname === 'version');
      if (versionFunctionExists) {
        log.info('Testing version function');
        try {
          const { data, error } = await supabase.rpc('version');
          if (error) {
            log.error(`Failed to call version function: ${error.message}`);
            recordResult('rpc', 'call_version', false, { error: error.message });
          } else {
            log.success('Successfully called version function');
            recordResult('rpc', 'call_version', true, { result: data });
          }
        } catch (error) {
          log.error(`Exception when calling version function: ${error.message}`);
          recordResult('rpc', 'call_version', false, { error: error.message });
        }
      } else {
        log.warning('Version function does not exist');
        recordResult('rpc', 'check_version_exists', false, { warning: 'Function does not exist' });
      }
    } else {
      log.warning('No functions found in the database');
      recordResult('rpc', 'list_functions', null, { warning: 'No functions found' });
    }
  } catch (error) {
    log.error(`Exception when listing functions: ${error.message}`);
    recordResult('rpc', 'list_functions', false, { error: error.message });
  }
  
  // Try calling the version function anyway (this is what our app is trying to do)
  try {
    log.info('Attempting to call version function directly');
    const { data, error } = await supabase.rpc('version');
    if (error) {
      log.error(`Failed to call version function: ${error.message}`);
      recordResult('rpc', 'direct_call_version', false, { error: error.message });
    } else {
      log.success('Successfully called version function directly');
      recordResult('rpc', 'direct_call_version', true, { result: data });
    }
  } catch (error) {
    log.error(`Exception when calling version function directly: ${error.message}`);
    recordResult('rpc', 'direct_call_version', false, { error: error.message });
  }
}

// Generate a report file
function generateReport() {
  log.section('Generating Report');
  
  const reportPath = path.resolve(__dirname, '../supabase-diagnostics-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log.success(`Report saved to ${reportPath}`);
    
    // Print summary
    log.section('Summary');
    log.info(`Tests passed: ${results.summary.passed}`);
    log.info(`Tests failed: ${results.summary.failed}`);
    log.info(`Warnings: ${results.summary.warnings}`);
    
    // Print recommendations based on results
    log.section('Recommendations');
    if (results.summary.failed > 0) {
      log.error(`${results.summary.failed} tests failed. Please check the report for details.`);
      
      // Give specific recommendations based on failures
      if (results.env && Object.values(results.env).some(r => !r.passed)) {
        log.error('Environment configuration issues detected:');
        log.info('- Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly');
        log.info('- Ensure consistency across all .env files');
        log.info('- Make sure your Supabase project is still active');
      }
      
      if (results.network && Object.values(results.network).some(r => !r.passed)) {
        log.error('Network connectivity issues detected:');
        log.info('- Check your internet connection');
        log.info('- Verify that the Supabase URL is correct');
        log.info('- Check if any firewall is blocking connections');
      }
      
      if (results.api && Object.values(results.api).some(r => !r.passed)) {
        log.error('Supabase API issues detected:');
        log.info('- Verify your Supabase API key');
        log.info('- Check if your Supabase project is active and healthy');
        log.info('- Ensure you have permission to access the database');
      }
      
      if (results.tables && Object.values(results.tables).some(r => !r.passed)) {
        log.error('Database table issues detected:');
        log.info('- Check if the expected tables exist in your database');
        log.info('- Verify table permissions for your API key');
        log.info('- Update table names in your code to match what exists in the database');
      }
      
      if (results.rpc && Object.values(results.rpc).some(r => !r.passed)) {
        log.error('RPC function issues detected:');
        log.info('- Update the service.ts file to use table queries instead of RPC functions');
        log.info('- Consider creating the missing RPC functions in your database');
        log.info('- Check permissions for RPC function access');
      }
    } else if (results.summary.warnings > 0) {
      log.warning(`${results.summary.warnings} warnings detected. Check the report for details.`);
    } else {
      log.success('All tests passed successfully!');
    }
  } catch (error) {
    log.error(`Failed to save report: ${error.message}`);
  }
}

// Main function
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}Supabase Diagnostics Tool${colors.reset}`);
  console.log(`${colors.cyan}==========================${colors.reset}\n`);
  
  // Step 1: Load environment variables
  const env = await loadEnvFiles();
  
  // Step 2: Test network connectivity
  const networkOk = await testNetworkConnectivity(env.SUPABASE_URL);
  
  // Step 3: Test Supabase authentication
  const supabase = await testSupabaseAuth(env.SUPABASE_URL, env.SUPABASE_KEY);
  
  // Step 4: Test database tables
  if (supabase) {
    await testDatabaseTables(supabase);
  }
  
  // Step 5: Test RPC functions
  if (supabase) {
    await testRpcFunctions(supabase);
  }
  
  // Generate report
  generateReport();
}

// Run the diagnostics
main().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  console.error(error);
}); 