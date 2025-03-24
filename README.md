# Teaching Scheduler 6

A modern scheduling application for teaching institutions, built with Next.js and Supabase.

## Setup and Development

### Prerequisites

- Node.js 18+
- npm 7+
- Docker and Docker Compose (for containerized development)

### Local Development

#### Option 1: Standard Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your Supabase credentials
5. Start the development server:
   ```bash
   npm run dev
   ```

#### Option 2: Docker Development (Recommended)

1. Clone the repository
2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
3. Update the `.env` file with your Supabase credentials
4. Start the Docker development environment:
   ```bash
   docker-compose -f docker/docker-compose.yml up
   ```

#### Option 3: Simple Docker Demo

For a quick test without the full MCP server setup:

1. Clone the repository
2. Create a `.env` file from the example
3. Run the test deployment script:
   ```bash
   ./scripts/test-deployment.sh
   ```
4. Visit http://localhost:3000 to access the application
5. To clean up:
   ```bash
   docker-compose -f docker/docker-compose-demo.yml down
   ```

### MCP Server Integration

This project uses Model Context Protocol (MCP) servers for enhanced development and deployment capabilities:

1. **Console Monitoring**: Access detailed logs and performance metrics
   ```
   http://localhost:3001
   ```

2. **Docker Management**: Container orchestration via Docker MCP
   ```
   http://localhost:3002
   ```

3. **Kubernetes Management**: Production deployment orchestration
   ```
   http://localhost:3003
   ```

4. **CLI Tools**: Execute deployment scripts securely

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Start production server
- `npm run lint`: Run ESLint
- `npm run test`: Run tests

## Docker Deployment

For production deployment using Docker:

```bash
./scripts/docker-deploy.sh latest production
```

For cleanup:

```bash
./scripts/docker-cleanup.sh production
```

## Kubernetes Deployment

For production deployment to Kubernetes:

```bash
./scripts/k8s-deploy.sh teaching-scheduler production latest
```

## Monitoring

The application includes monitoring endpoints:

- **Health Check**: `/api/health` - Basic health status
- **Metrics**: `/api/metrics` - Prometheus-compatible metrics

## Documentation

Additional documentation is available in the `docs` directory:

- [Architecture](docs/architecture.md)
- [Deployment Strategy](docs/deployment.md)
- [Development Plan](docs/development-plan.md)
- [Data Structure](docs/data-structure.md)
- [Tasks](docs/tasks.md)

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
# Updated 06/14/2023 16:45:22
