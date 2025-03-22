// CLI MCP Server for Teaching Scheduler
// Provides secure command execution for deployment operations
const { createServer } = require('@anthropic-ai/mcp-server');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Security configuration
const port = process.env.CLI_MCP_PORT || 3004;
const ALLOWED_DIR = process.env.ALLOWED_DIR || path.join(__dirname, 'scripts');
const ALLOWED_COMMANDS = (process.env.ALLOWED_COMMANDS || 'npm,node,bash,echo,curl,docker,docker-compose').split(',');
const MAX_COMMAND_LENGTH = parseInt(process.env.MAX_COMMAND_LENGTH || '2048');
const COMMAND_TIMEOUT = parseInt(process.env.COMMAND_TIMEOUT || '300');

// Ensure scripts directory exists
if (!fs.existsSync(ALLOWED_DIR)) {
  console.log(`Creating scripts directory at ${ALLOWED_DIR}`);
  fs.mkdirSync(ALLOWED_DIR, { recursive: true });
}

// Validate if a command is allowed
function validateCommand(command) {
  if (!command || typeof command !== 'string') {
    return { valid: false, reason: 'Command must be a non-empty string' };
  }

  if (command.length > MAX_COMMAND_LENGTH) {
    return { valid: false, reason: `Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters` };
  }

  // Check if the command starts with an allowed command
  const commandBase = command.trim().split(' ')[0];
  if (!ALLOWED_COMMANDS.includes(commandBase)) {
    return { valid: false, reason: `Command '${commandBase}' is not in the allowed list: ${ALLOWED_COMMANDS.join(', ')}` };
  }

  return { valid: true };
}

// Create the MCP server
const server = createServer({
  roots: {
    commands: {
      description: 'Secure command execution for deployment operations',
      tools: {
        runCommand: {
          description: 'Run a command securely with validation and timeout',
          parameters: {
            command: { type: 'string', description: 'The command to execute' }
          },
          async function({ command }) {
            console.log(`Requested command execution: ${command}`);
            
            // Validate the command
            const validation = validateCommand(command);
            if (!validation.valid) {
              console.error(`Command validation failed: ${validation.reason}`);
              return {
                success: false,
                error: validation.reason
              };
            }

            // Execute the command with timeout
            try {
              return new Promise((resolve) => {
                const process = exec(command, { timeout: COMMAND_TIMEOUT * 1000 }, (error, stdout, stderr) => {
                  if (error) {
                    console.error(`Command execution error: ${error.message}`);
                    resolve({
                      success: false,
                      error: error.message,
                      stdout,
                      stderr
                    });
                    return;
                  }

                  console.log(`Command executed successfully`);
                  resolve({
                    success: true,
                    stdout,
                    stderr
                  });
                });
              });
            } catch (error) {
              console.error(`Command execution exception: ${error.message}`);
              return {
                success: false,
                error: error.message
              };
            }
          }
        },

        writeScript: {
          description: 'Write a deployment script to the allowed directory',
          parameters: {
            filename: { type: 'string', description: 'The name of the script file' },
            content: { type: 'string', description: 'The content of the script file' }
          },
          async function({ filename, content }) {
            console.log(`Requested script creation: ${filename}`);
            
            // Sanitize filename (basic security measure)
            const sanitizedFilename = path.basename(filename).replace(/[^\w.-]/g, '_');
            const targetPath = path.join(ALLOWED_DIR, sanitizedFilename);
            
            try {
              fs.writeFileSync(targetPath, content);
              
              // Make the script executable on non-Windows platforms
              if (process.platform !== 'win32') {
                fs.chmodSync(targetPath, '755');
              }
              
              console.log(`Script created successfully at ${targetPath}`);
              return {
                success: true,
                path: targetPath
              };
            } catch (error) {
              console.error(`Failed to write script: ${error.message}`);
              return {
                success: false,
                error: error.message
              };
            }
          }
        },

        listScripts: {
          description: 'List available deployment scripts',
          parameters: {},
          async function() {
            console.log(`Listing scripts in ${ALLOWED_DIR}`);
            
            try {
              const files = fs.readdirSync(ALLOWED_DIR)
                .filter(file => !fs.statSync(path.join(ALLOWED_DIR, file)).isDirectory());
              
              return {
                success: true,
                scripts: files.map(file => ({
                  name: file,
                  path: path.join(ALLOWED_DIR, file),
                  size: fs.statSync(path.join(ALLOWED_DIR, file)).size
                }))
              };
            } catch (error) {
              console.error(`Failed to list scripts: ${error.message}`);
              return {
                success: false,
                error: error.message
              };
            }
          }
        }
      }
    }
  }
});

// Start the server
server.listen(port, () => {
  console.log(`CLI MCP Server running on port ${port}`);
  console.log(`Allowed commands: ${ALLOWED_COMMANDS.join(', ')}`);
  console.log(`Scripts directory: ${ALLOWED_DIR}`);
  console.log(`Maximum command length: ${MAX_COMMAND_LENGTH} characters`);
  console.log(`Command timeout: ${COMMAND_TIMEOUT} seconds`);
}); 