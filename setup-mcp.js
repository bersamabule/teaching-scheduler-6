// MCP Server Setup Script
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create required directories
const mcpServerDir = path.join(__dirname, 'mcp-server');
if (!fs.existsSync(mcpServerDir)) {
  console.log('📁 Creating MCP server directory...');
  fs.mkdirSync(mcpServerDir, { recursive: true });
}

// Copy server files
console.log('📋 Copying MCP server files...');
fs.copyFileSync(
  path.join(__dirname, 'mcp-package.json'),
  path.join(mcpServerDir, 'package.json')
);
fs.copyFileSync(
  path.join(__dirname, 'mcp-server.js'),
  path.join(mcpServerDir, 'mcp-server.js')
);

// Create logs directory
const logsDir = path.join(mcpServerDir, 'mcp-logs');
if (!fs.existsSync(logsDir)) {
  console.log('📁 Creating logs directory...');
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize log file
const logFile = path.join(logsDir, 'console.log');
if (!fs.existsSync(logFile)) {
  console.log('📄 Creating initial log file...');
  fs.writeFileSync(logFile, '# MCP Console Logs\n\n');
}

// Install dependencies
console.log('📦 Installing MCP server dependencies...');
try {
  process.chdir(mcpServerDir);
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('\n🚀 MCP server setup complete!');
console.log('\nTo start the MCP server, run:');
console.log('  cd mcp-server && npm run dev');
console.log('\nThen start your application:');
console.log('  npm run dev');
console.log('\nThe MCP server will be available at:');
console.log('  http://localhost:3099/mcp/logs\n'); 