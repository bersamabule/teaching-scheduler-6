/**
 * Console Monitor Server Launcher for Teaching Scheduler 6
 * 
 * This script starts the console monitor MCP server for development.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const SERVER_NAME = 'Console Monitor MCP Server';
const SCRIPT_NAME = 'console-monitor-server.js';
const PORT = 3004;
const COLOR = '\x1b[35m'; // Magenta
const RESET_COLOR = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const RED = '\x1b[31m';

// Store the process
let serverProcess = null;

// Start the console monitor server
function startServer() {
  console.log(`${BRIGHT}Starting ${SERVER_NAME} for Teaching Scheduler 6${RESET_COLOR}\n`);
  
  const scriptPath = path.join(__dirname, SCRIPT_NAME);
  
  // Check if the script exists
  if (!fs.existsSync(scriptPath)) {
    console.error(`${RED}Error: Script not found: ${scriptPath}${RESET_COLOR}`);
    process.exit(1);
  }
  
  console.log(`${COLOR}Starting ${SERVER_NAME} on port ${PORT}...${RESET_COLOR}`);
  
  try {
    // Set environment variables
    const env = { ...process.env, PORT: PORT.toString() };
    
    // Start JavaScript file with Node
    serverProcess = spawn('node', [scriptPath], { env });
    
    // Handle server output
    serverProcess.stdout.on('data', (data) => {
      console.log(`${COLOR}[${SERVER_NAME}] ${data.toString().trim()}${RESET_COLOR}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error(`${RED}[${SERVER_NAME} ERROR] ${data.toString().trim()}${RESET_COLOR}`);
    });
    
    serverProcess.on('error', (error) => {
      console.error(`${RED}[${SERVER_NAME} ERROR] Failed to start process: ${error.message}${RESET_COLOR}`);
      process.exit(1);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`${COLOR}[${SERVER_NAME}] process exited with code ${code}${RESET_COLOR}`);
      serverProcess = null;
      process.exit(code || 0);
    });
    
    // Setup cleanup on exit
    process.on('SIGINT', cleanupAndExit);
    process.on('SIGTERM', cleanupAndExit);
    process.on('exit', cleanupAndExit);
    
    console.log(`\n${BRIGHT}${SERVER_NAME} started. Press Ctrl+C to stop the server.${RESET_COLOR}`);
  } catch (error) {
    console.error(`${RED}Error starting ${SERVER_NAME}: ${error.message}${RESET_COLOR}`);
    process.exit(1);
  }
}

// Cleanup function to kill the process
function cleanupAndExit() {
  if (serverProcess && !serverProcess.killed) {
    console.log(`\n${BRIGHT}Stopping ${SERVER_NAME}...${RESET_COLOR}`);
    serverProcess.kill();
    console.log(`${BRIGHT}${SERVER_NAME} stopped.${RESET_COLOR}`);
  }
}

// Start the server
startServer(); 