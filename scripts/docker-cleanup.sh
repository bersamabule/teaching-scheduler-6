#!/bin/bash
set -e

# Docker cleanup script for Teaching Scheduler
# This script is designed to be run by the CLI MCP server

# Configuration
PROJECT_ROOT=$(dirname "$(dirname "$0")")
DOCKER_DIR="$PROJECT_ROOT/docker"
ENVIRONMENT=${1:-production}

# Print cleanup details
echo "Cleaning up Teaching Scheduler Docker containers in $ENVIRONMENT environment"

# Set appropriate docker-compose file
if [ "$ENVIRONMENT" == "production" ]; then
    COMPOSE_FILE="$DOCKER_DIR/docker-compose.prod.yml"
else
    COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
fi

echo "Using compose file: $COMPOSE_FILE"

# Stop containers
echo "Stopping containers..."
cd "$DOCKER_DIR"
docker-compose -f "$COMPOSE_FILE" down

# Remove dangling images (optional)
if [ "$2" == "--prune" ]; then
    echo "Removing dangling images..."
    docker image prune -f
fi

# Remove volumes (if specified)
if [ "$2" == "--prune-volumes" ]; then
    echo "Removing volumes..."
    docker-compose -f "$COMPOSE_FILE" down -v
    docker volume prune -f
fi

echo "Cleanup complete!" 