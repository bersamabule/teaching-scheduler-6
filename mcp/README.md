# MCP Server Integration

This directory contains Model Context Protocol (MCP) servers used by the Teaching Scheduler application. These servers provide enhanced capabilities for development, monitoring, and deployment.

## Available MCP Servers

| Server | Port | Purpose |
|--------|------|---------|
| CLI MCP Server | 3001 | Secure command execution |
| Docker MCP Server | 3002 | Container management |
| Kubernetes MCP Server | 3003 | Kubernetes orchestration |
| Console Monitor MCP Server | 3004 | Console logging and analysis |
| Deployment Manager MCP Server | 3005 | Deployment lifecycle management |

## Setup and Usage

### Prerequisites

- Node.js 18+ installed
- NPM or Yarn package manager
- For Docker MCP Server: Docker installed and running
- For Kubernetes MCP Server: `kubectl` installed and configured

### Starting All MCP Servers

To start all MCP servers at once, run:

```bash
npm run mcp:start
# or, from the project root
node mcp/start-mcp-servers.js
```

### Development with MCP Servers

To run the Next.js development server alongside MCP servers:

```bash
npm run dev:with-mcp
```

This command starts all MCP servers and the Next.js development server concurrently.

## Server Details

### CLI MCP Server

Enables secure command-line operations within the application.

**Key Features:**
- Restricted command execution
- Sandboxed environment for safety
- Command history and logging

**Example Usage:**
```javascript
// From client code
const result = await fetch('/api/cli', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ command: 'echo "Hello from CLI MCP"' })
}).then(res => res.json());
```

### Docker MCP Server

Manages Docker container operations for the application.

**Key Features:**
- Container creation and management
- Image building
- Container health monitoring

**Config File:** [docker-commands.json](docker-commands.json)

### Kubernetes MCP Server

Enables Kubernetes orchestration for production deployments.

**Key Features:**
- Deployment management
- Service configuration
- Pod scaling and monitoring

**Config File:** [kubernetes-config.json](kubernetes-config.json)

### Console Monitor MCP Server

Captures and analyzes browser console logs for debugging.

**Key Features:**
- Real-time log capturing
- Error aggregation and analysis
- Intelligent log filtering
- In-app console viewer

**Integration:**
- The console monitor is automatically integrated into the application
- Access the console viewer by pressing Ctrl+Alt+D or using the Debug Console button

### Deployment Manager MCP Server

Manages the deployment lifecycle including verification and rollbacks.

**Key Features:**
- Automated deployment verification
- Rollback capabilities
- Deployment history tracking
- Notification system

**Config File:** [deployment-config.json](deployment-config.json)

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   
   If a port is already in use, the MCP server will fail to start. Check if any other services are using the same ports.

2. **Permission Issues**
   
   Docker and Kubernetes MCP servers may require elevated permissions. Make sure you have the necessary permissions to run these services.

3. **Connection Refused**
   
   If the application can't connect to an MCP server, verify that the server is running and check the console for error messages.

### Logs

Each MCP server writes logs to the console. You can check these logs for detailed error information.

## Advanced Configuration

Each MCP server can be configured via its respective configuration file or by setting environment variables. See individual server files for details on available options.

## API Integration

The MCP servers are accessed through API routes in the Next.js application. These routes are defined in the `src/app/api` directory.

## Further Reading

- [MCP Server Documentation](https://anthropic.com/mcp-server)
- [Teaching Scheduler Architecture](../docs/architecture.md)
- [Deployment Strategy](../docs/deployment.md) 