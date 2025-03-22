# Teaching Scheduler Deployment

This document outlines the deployment system for the Teaching Scheduler application. The deployment pipeline supports both Docker and Kubernetes environments with automated CI/CD integration through GitHub Actions.

## Deployment Architecture

The deployment system consists of several components:

1. **GitHub Actions Workflow** - Automates the build, test, and deployment process
2. **MCP Servers** - Secure deployment interfaces for the CI/CD pipeline
   - CLI MCP Server - For executing deployment scripts
   - Docker MCP Server - For Docker-based deployments
   - Kubernetes MCP Server - For Kubernetes-based deployments
3. **Deployment Scripts** - Shell scripts for Docker and Kubernetes deployments
4. **Health Check API** - Endpoint to verify application health status

## Environment Configuration

The application supports multiple deployment environments:

- **Staging** - For testing and QA
- **Production** - For live application

Environment-specific configuration is stored in `.env.staging` and `.env.production` files.

## Deployment Process

### Manual Deployment

1. Build the Docker image:
   ```
   docker build -t teaching-scheduler:latest .
   ```

2. Run the Docker container with appropriate environment variables:
   ```
   docker run -d --name teaching-scheduler -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=your-supabase-url \
     -e NEXT_PUBLIC_SUPABASE_KEY=your-supabase-key \
     teaching-scheduler:latest
   ```

### Automated Deployment

The automated deployment is triggered by:
- Push to the `main` branch
- Pull request to the `main` branch
- Manual workflow dispatch

#### Deployment Steps:

1. Code is pushed to GitHub
2. GitHub Actions workflow is triggered
3. Code is checked out and built into a Docker image
4. Tests are run against the built image
5. If tests pass, the image is deployed to the appropriate environment
6. Health checks verify the deployment status

## MCP Server Setup

To run the MCP servers for local development:

1. Install dependencies:
   ```
   cd mcp
   npm install
   ```

2. Start the MCP servers:
   ```
   npm run start:all
   ```

Or start individual MCP servers:
- CLI MCP Server: `npm run start:cli`
- Docker MCP Server: `npm run start:docker`
- Kubernetes MCP Server: `npm run start:k8s`

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_SUPABASE_URL`: URL for the Supabase instance
- `NEXT_PUBLIC_SUPABASE_KEY`: API key for the Supabase instance

### Optional Variables

- `DEBUG`: Enable debug logging (true/false)
- `LOG_LEVEL`: Logging level (debug, info, warn, error)
- `TAG`: Docker image tag
- `REPLICAS`: Number of replicas for Kubernetes deployment

## Troubleshooting

### Health Check

The application provides a health check endpoint at `/api/health` that returns the current status of the application, including:

- Application version
- Uptime
- Database connection status
- Environment information

### Common Issues

1. **Database Connection Failures**
   - Verify Supabase URL and key are correct
   - Check network connectivity to Supabase

2. **Container Startup Issues**
   - Check container logs: `docker logs teaching-scheduler`
   - Verify environment variables are set correctly

3. **Kubernetes Deployment Issues**
   - Check pod status: `kubectl get pods -n teaching-scheduler`
   - View pod logs: `kubectl logs <pod-name> -n teaching-scheduler`

## Security Considerations

- Environment variables containing sensitive information should be stored as secrets in GitHub and the Kubernetes cluster
- MCP servers are configured to only allow execution of approved commands
- Docker images run as non-root users
- Health check API only returns non-sensitive information 