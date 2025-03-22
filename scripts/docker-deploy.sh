#!/bin/bash
set -e

# Docker deployment script for Teaching Scheduler
# This script is designed to be run by the CLI MCP server

# Configuration
PROJECT_ROOT=$(dirname "$(dirname "$0")")
DOCKER_DIR="$PROJECT_ROOT/docker"
ENV_FILE="$PROJECT_ROOT/.env"
TAG=${1:-latest}
ENVIRONMENT=${2:-production}

# Print deployment details
echo "Deploying Teaching Scheduler ($TAG) to $ENVIRONMENT environment"
echo "Project root: $PROJECT_ROOT"

# Ensure we have environment variables
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Please create a .env file with SUPABASE_URL and SUPABASE_KEY"
    exit 1
fi

# Load environment variables
source "$ENV_FILE"

# Validate required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file"
    exit 1
fi

# Set appropriate docker-compose file
if [ "$ENVIRONMENT" == "production" ]; then
    COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"
else
    COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
fi

echo "Using compose file: $COMPOSE_FILE"

# Build the Docker image
echo "Building Teaching Scheduler Docker image..."
cd "$PROJECT_ROOT"
docker build -t "teaching-scheduler:$TAG" -f "$DOCKER_DIR/Dockerfile" .

# Deploy using docker-compose
echo "Deploying with docker-compose..."
cd "$DOCKER_DIR"
TAG=$TAG SUPABASE_URL=$SUPABASE_URL SUPABASE_KEY=$SUPABASE_KEY \
    docker-compose -f "$COMPOSE_FILE" up -d

# Check deployment status
echo "Checking deployment status..."
docker-compose -f "$COMPOSE_FILE" ps

echo "Deployment complete!"

# Print application URL
echo "Teaching Scheduler is now available at: http://localhost:3000"
echo "MCP Console Monitor is available at: http://localhost:3001" 