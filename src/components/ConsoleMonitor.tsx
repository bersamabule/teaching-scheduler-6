'use client';

import { useEffect, useState } from 'react';
import styles from '@/styles/ConsoleMonitor.module.css';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  context?: string;
}

// Component to initialize console monitoring and provide UI for viewing logs
export default function ConsoleMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');
  const [isConnected, setIsConnected] = useState(true);
  const [mcpModule, setMcpModule] = useState<any>(null);

  useEffect(() => {
    // Only load in development or testing environments and in the browser
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && typeof window !== 'undefined') {
      import('@/lib/mcp/console-monitor').then((module) => {
        console.log('[MCP] Console monitoring active');
        setMcpModule(module);
        
        // Add keyboard shortcut (Ctrl+Alt+D) to toggle console
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey && e.altKey && e.key === 'd') {
            setIsVisible(prev => !prev);
          }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }).catch(err => {
        console.error('[MCP] Failed to initialize console monitoring:', err);
      });
    }
  }, []);
  
  // Poll connection status and fetch logs periodically
  useEffect(() => {
    if (!isVisible || !mcpModule) return;
    
    const fetchLogs = () => {
      const monitorStatus = mcpModule.mcpConsole.getStatus();
      setIsConnected(monitorStatus.isHealthy);
      
      // Fetch logs from our API endpoint
      fetch('/api/console-logs')
        .then(response => response.json())
        .then(data => {
          if (data && data.logs) {
            setLogs(data.logs);
          }
        })
        .catch(err => {
          console.warn('[ConsoleMonitor] Failed to fetch logs:', err);
        });
    };
    
    // Initial fetch
    fetchLogs();
    
    // Set up polling
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [isVisible, mcpModule]);
  
  // Filter logs by level
  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);
  
  // Don't render anything if not in development or the monitor is not visible
  if (!isVisible) {
    return (
      <div className={styles.toggleButton} onClick={() => setIsVisible(true)}>
        <span>📊</span>
      </div>
    );
  }
  
  return (
    <div className={styles.consoleMonitor}>
      <div className={styles.header}>
        <h3>Console Monitor</h3>
        <div className={styles.controls}>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Logs</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="log">Log</option>
            <option value="debug">Debug</option>
          </select>
          <div className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <button 
            className={styles.clearButton}
            onClick={() => fetch('/api/console-logs/clear', {method: 'POST'})}
          >
            Clear
          </button>
          <button 
            className={styles.closeButton} 
            onClick={() => setIsVisible(false)}
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className={styles.logContainer}>
        {filteredLogs.length === 0 ? (
          <div className={styles.noLogs}>No logs to display</div>
        ) : (
          filteredLogs.map((log, index) => (
            <div 
              key={index} 
              className={`${styles.logEntry} ${styles[log.level]}`}
            >
              <div className={styles.logHeader}>
                <span className={styles.timestamp}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={styles.level}>
                  {log.level.toUpperCase()}
                </span>
                {log.context && (
                  <span className={styles.context}>{log.context}</span>
                )}
              </div>
              <div className={styles.message}>{log.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 