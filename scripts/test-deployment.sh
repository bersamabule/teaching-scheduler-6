#!/bin/bash
set -e

# Test deployment script for Teaching Scheduler
# This script tests the deployment process without requiring Docker MCP server

# Configuration
PROJECT_ROOT=$(dirname "$(dirname "$0")")
DOCKER_DIR="$PROJECT_ROOT/docker"
ENV_FILE="$PROJECT_ROOT/.env"
TAG="test"
COMPOSE_FILE="$DOCKER_DIR/docker-compose-demo.yml"

# Print deployment details
echo "Testing deployment of Teaching Scheduler"
echo "Project root: $PROJECT_ROOT"
echo "Using compose file: $COMPOSE_FILE"

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

# Start the test deployment
echo "Starting test deployment..."
cd "$PROJECT_ROOT"
TAG=$TAG SUPABASE_URL=$SUPABASE_URL SUPABASE_KEY=$SUPABASE_KEY \
    docker-compose -f "$COMPOSE_FILE" up -d

# Check if the container is running
echo "Checking if container is running..."
sleep 5
docker-compose -f "$COMPOSE_FILE" ps

# Print application URL
echo "If deployment was successful, Teaching Scheduler should be available at: http://localhost:3000"
echo "Health check endpoint: http://localhost:3000/api/health"
echo "Metrics endpoint: http://localhost:3000/api/metrics"

# Instructions for clean up
echo ""
echo "To clean up the test deployment, run:"
echo "docker-compose -f $COMPOSE_FILE down" 