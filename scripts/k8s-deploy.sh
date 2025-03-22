#!/bin/bash
set -e

# Kubernetes deployment script for Teaching Scheduler
# This script is designed to be run by the CLI MCP server

# Configuration
PROJECT_ROOT=$(dirname "$(dirname "$0")")
K8S_DIR="$PROJECT_ROOT/k8s"
NAMESPACE=${1:-teaching-scheduler}
ENVIRONMENT=${2:-production}
IMAGE_TAG=${3:-latest}

# Print deployment details
echo "Deploying Teaching Scheduler to Kubernetes"
echo "Namespace: $NAMESPACE"
echo "Environment: $ENVIRONMENT"
echo "Image Tag: $IMAGE_TAG"

# Ensure kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Create namespace if it doesn't exist
kubectl get namespace $NAMESPACE || kubectl create namespace $NAMESPACE

# Update image tag in the deployment file
sed -i "s|ghcr.io/your-org/teaching-scheduler:latest|ghcr.io/your-org/teaching-scheduler:${IMAGE_TAG}|g" $K8S_DIR/deployment.yaml

# Apply Kubernetes resources
echo "Applying Kubernetes resources..."
kubectl apply -f $K8S_DIR/configmap.yaml -n $NAMESPACE
kubectl apply -f $K8S_DIR/secrets.yaml -n $NAMESPACE
kubectl apply -f $K8S_DIR/deployment.yaml -n $NAMESPACE
kubectl apply -f $K8S_DIR/hpa.yaml -n $NAMESPACE

# Wait for deployment rollout
echo "Waiting for deployment rollout..."
kubectl rollout status deployment/teaching-scheduler -n $NAMESPACE --timeout=300s

# Check deployment status
echo "Deployment status:"
kubectl get deployments -n $NAMESPACE
kubectl get pods -n $NAMESPACE

# Get service details
echo "Service details:"
kubectl get services -n $NAMESPACE

# Get ingress details
echo "Ingress details:"
kubectl get ingress -n $NAMESPACE

echo "Deployment complete!"

# Verify the application is accessible
SERVICE_IP=$(kubectl get service teaching-scheduler -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -n "$SERVICE_IP" ]; then
    echo "Teaching Scheduler is available at: http://$SERVICE_IP"
else
    INGRESS_HOST=$(kubectl get ingress teaching-scheduler -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')
    if [ -n "$INGRESS_HOST" ]; then
        echo "Teaching Scheduler is available at: https://$INGRESS_HOST"
    else
        echo "Teaching Scheduler is deployed, but no external IP or hostname is available yet."
    fi
fi 