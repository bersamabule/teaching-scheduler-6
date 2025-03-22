/**
 * Deployment Manager for Teaching Scheduler
 * 
 * This script integrates with MCP servers to handle deployment verification and rollback
 * It provides a unified interface for both Docker and Kubernetes deployments
 */

const { createServer } = require('@anthropic-ai/mcp-server');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_FILE = path.join(__dirname, 'deployment-config.json');
const HISTORY_FILE = path.join(__dirname, 'deployment-history.json');
const MAX_HISTORY = 10;
const HEALTHCHECK_RETRIES = 12;
const HEALTHCHECK_INTERVAL = 5000; // 5 seconds

// Make sure history file exists
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify({ 
    environments: {
      staging: [],
      production: []
    },
    current: {
      staging: null,
      production: null
    }
  }, null, 2));
}

// Initialize deployment history
const deploymentHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

/**
 * Add deployment to history
 * @param {string} environment - 'staging' or 'production'
 * @param {object} deployment - Deployment details
 */
function addDeploymentToHistory(environment, deployment) {
  // Add to history
  deploymentHistory.environments[environment].unshift(deployment);
  
  // Trim history if needed
  if (deploymentHistory.environments[environment].length > MAX_HISTORY) {
    deploymentHistory.environments[environment] = 
      deploymentHistory.environments[environment].slice(0, MAX_HISTORY);
  }
  
  // Update current deployment
  deploymentHistory.current[environment] = deployment;
  
  // Save to file
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(deploymentHistory, null, 2));
}

/**
 * Verify deployment health by checking health endpoint
 * @param {string} healthUrl - URL to health endpoint
 * @param {number} retries - Number of retries
 * @param {number} interval - Interval between retries in ms
 * @returns {Promise<boolean>} - True if healthy, false otherwise
 */
async function verifyDeploymentHealth(healthUrl, retries = HEALTHCHECK_RETRIES, interval = HEALTHCHECK_INTERVAL) {
  console.log(`Verifying deployment health at ${healthUrl}`);
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Health check attempt ${i + 1}/${retries}...`);
      const response = await axios.get(healthUrl, { timeout: 5000 });
      
      if (response.status === 200 && response.data.status === 'ok') {
        console.log('Health check passed!');
        return true;
      }
      
      console.log(`Health check failed: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.log(`Health check error: ${error.message}`);
    }
    
    // Wait before next retry
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  console.log('Health check failed after all retries');
  return false;
}

/**
 * Create MCP Server for deployment management
 */
const server = createServer({
  roots: {
    deployment: {
      description: 'Manages deployments and rollbacks',
      tools: {
        deploy: {
          description: 'Deploy a new version to an environment',
          parameters: {
            environment: { type: 'string', enum: ['staging', 'production'], description: 'Deployment environment' },
            version: { type: 'string', description: 'Version identifier (tag or commit)' },
            image: { type: 'string', description: 'Docker image to deploy' },
            config: { type: 'object', description: 'Deployment configuration' }
          },
          async function({ environment, version, image, config }) {
            try {
              console.log(`Deploying ${version} to ${environment}...`);
              
              // Store previous version for rollback
              const previousDeployment = deploymentHistory.current[environment];
              
              // Record new deployment
              const deployment = {
                version,
                image,
                timestamp: new Date().toISOString(),
                status: 'deploying',
                config
              };
              
              addDeploymentToHistory(environment, deployment);
              
              console.log(`Deployment recorded, previous deployment: ${previousDeployment?.version || 'none'}`);
              
              return {
                success: true,
                deployment,
                previousDeployment
              };
            } catch (error) {
              console.error(`Deployment error: ${error.message}`);
              return {
                success: false,
                error: error.message
              };
            }
          }
        },
        
        verifyDeployment: {
          description: 'Verify a deployment is healthy',
          parameters: {
            environment: { type: 'string', enum: ['staging', 'production'], description: 'Deployment environment' },
            healthUrl: { type: 'string', description: 'URL to health endpoint' },
            timeout: { type: 'number', description: 'Timeout in seconds', default: 60 }
          },
          async function({ environment, healthUrl, timeout = 60 }) {
            try {
              console.log(`Verifying deployment in ${environment}...`);
              
              // Get current deployment
              const deployment = deploymentHistory.current[environment];
              if (!deployment) {
                return {
                  success: false,
                  error: `No deployment found for ${environment}`
                };
              }
              
              // Calculate retries and interval based on timeout
              const retries = Math.ceil(timeout / (HEALTHCHECK_INTERVAL / 1000));
              
              // Verify health
              const isHealthy = await verifyDeploymentHealth(healthUrl, retries);
              
              // Update deployment status
              deployment.status = isHealthy ? 'deployed' : 'failed';
              deployment.verifiedAt = new Date().toISOString();
              
              // Save to history
              fs.writeFileSync(HISTORY_FILE, JSON.stringify(deploymentHistory, null, 2));
              
              return {
                success: isHealthy,
                deployment,
                isHealthy
              };
            } catch (error) {
              console.error(`Verification error: ${error.message}`);
              return {
                success: false,
                error: error.message
              };
            }
          }
        },
        
        rollback: {
          description: 'Rollback to a previous deployment',
          parameters: {
            environment: { type: 'string', enum: ['staging', 'production'], description: 'Deployment environment' },
            version: { type: 'string', description: 'Version to rollback to (optional)', required: false }
          },
          async function({ environment, version }) {
            try {
              console.log(`Rolling back ${environment} deployment...`);
              
              // Find the deployment to rollback to
              let rollbackDeployment;
              
              if (version) {
                // Find specific version
                rollbackDeployment = deploymentHistory.environments[environment].find(d => d.version === version);
                if (!rollbackDeployment) {
                  return {
                    success: false,
                    error: `Version ${version} not found in deployment history`
                  };
                }
              } else {
                // Find the most recent successful deployment (excluding current)
                rollbackDeployment = deploymentHistory.environments[environment].find(d => 
                  d.version !== deploymentHistory.current[environment]?.version && 
                  d.status === 'deployed'
                );
                
                if (!rollbackDeployment) {
                  return {
                    success: false,
                    error: 'No previous successful deployment found for rollback'
                  };
                }
              }
              
              console.log(`Rolling back to ${rollbackDeployment.version}...`);
              
              // Mark current deployment as rolled back
              const currentDeployment = deploymentHistory.current[environment];
              if (currentDeployment) {
                currentDeployment.status = 'rolled-back';
                currentDeployment.rolledBackAt = new Date().toISOString();
              }
              
              // Create new deployment record based on the rollback target
              const rollbackRecord = {
                ...rollbackDeployment,
                timestamp: new Date().toISOString(),
                status: 'deploying',
                isRollback: true,
                originalDeployment: rollbackDeployment.timestamp
              };
              
              // Add to history
              addDeploymentToHistory(environment, rollbackRecord);
              
              return {
                success: true,
                rollbackDeployment: rollbackRecord,
                rolledBackDeployment: currentDeployment
              };
            } catch (error) {
              console.error(`Rollback error: ${error.message}`);
              return {
                success: false,
                error: error.message
              };
            }
          }
        },
        
        getDeploymentHistory: {
          description: 'Get deployment history for an environment',
          parameters: {
            environment: { type: 'string', enum: ['staging', 'production'], description: 'Deployment environment' }
          },
          async function({ environment }) {
            try {
              return {
                success: true,
                history: deploymentHistory.environments[environment],
                currentDeployment: deploymentHistory.current[environment]
              };
            } catch (error) {
              console.error(`Get history error: ${error.message}`);
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
const PORT = process.env.DEPLOYMENT_MANAGER_PORT || 3005;
server.listen(PORT, () => {
  console.log(`Deployment Manager MCP Server running on port ${PORT}`);
  console.log(`Deployment history file: ${HISTORY_FILE}`);
  console.log(`Max history entries per environment: ${MAX_HISTORY}`);
  console.log(`Health check retries: ${HEALTHCHECK_RETRIES}`);
  console.log(`Health check interval: ${HEALTHCHECK_INTERVAL}ms`);
}); 