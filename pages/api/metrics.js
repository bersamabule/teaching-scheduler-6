/**
 * Metrics API endpoint for monitoring the application
 * 
 * This endpoint returns basic metrics about the application.
 * It can be scraped by Prometheus or other monitoring tools.
 */

// Basic metrics collection
const metrics = {
  // System metrics
  process_uptime_seconds: 0,
  process_memory_rss_bytes: 0,
  process_memory_heap_total_bytes: 0,
  process_memory_heap_used_bytes: 0,
  
  // Application metrics
  http_requests_total: 0,
  http_request_duration_seconds: 0,
  http_requests_in_progress: 0,
  database_queries_total: 0,
  database_query_duration_seconds: 0,
  
  // Last updated timestamp
  last_updated: 0
};

// Request counters by endpoint
const endpointCounters = {};

// Middleware to count requests
export function countRequest(req) {
  metrics.http_requests_total++;
  
  const path = req.url.split('?')[0];
  if (!endpointCounters[path]) {
    endpointCounters[path] = 0;
  }
  endpointCounters[path]++;
}

// Function to update metrics
function updateMetrics() {
  // Update system metrics
  metrics.process_uptime_seconds = process.uptime();
  
  const memoryUsage = process.memoryUsage();
  metrics.process_memory_rss_bytes = memoryUsage.rss;
  metrics.process_memory_heap_total_bytes = memoryUsage.heapTotal;
  metrics.process_memory_heap_used_bytes = memoryUsage.heapUsed;
  
  // Update timestamp
  metrics.last_updated = Date.now();
}

// Format metrics for Prometheus
function formatMetrics() {
  let result = '';
  
  // Add system metrics
  result += `# HELP process_uptime_seconds The number of seconds the process has been running\n`;
  result += `# TYPE process_uptime_seconds gauge\n`;
  result += `process_uptime_seconds ${metrics.process_uptime_seconds}\n\n`;
  
  result += `# HELP process_memory_rss_bytes Resident Set Size memory usage\n`;
  result += `# TYPE process_memory_rss_bytes gauge\n`;
  result += `process_memory_rss_bytes ${metrics.process_memory_rss_bytes}\n\n`;
  
  result += `# HELP process_memory_heap_total_bytes Total heap memory allocated\n`;
  result += `# TYPE process_memory_heap_total_bytes gauge\n`;
  result += `process_memory_heap_total_bytes ${metrics.process_memory_heap_total_bytes}\n\n`;
  
  result += `# HELP process_memory_heap_used_bytes Heap memory in use\n`;
  result += `# TYPE process_memory_heap_used_bytes gauge\n`;
  result += `process_memory_heap_used_bytes ${metrics.process_memory_heap_used_bytes}\n\n`;
  
  // Add application metrics
  result += `# HELP http_requests_total Total number of HTTP requests\n`;
  result += `# TYPE http_requests_total counter\n`;
  result += `http_requests_total ${metrics.http_requests_total}\n\n`;
  
  // Add endpoint-specific metrics
  result += `# HELP http_requests_by_endpoint Total requests by endpoint\n`;
  result += `# TYPE http_requests_by_endpoint counter\n`;
  Object.entries(endpointCounters).forEach(([path, count]) => {
    result += `http_requests_by_endpoint{path="${path}"} ${count}\n`;
  });
  
  return result;
}

export default async function handler(req, res) {
  // Count this request (but exclude metrics endpoint from counts)
  if (!req.url.includes('/api/metrics')) {
    countRequest(req);
  }
  
  // Update metrics
  updateMetrics();
  
  // Return metrics in Prometheus format
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(formatMetrics());
} 