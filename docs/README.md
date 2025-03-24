# Teaching Scheduler Documentation

Welcome to the Teaching Scheduler application documentation. This document provides an overview of the application, available documentation, and guidelines for development.

## Overview

Teaching Scheduler is a Next.js application designed to manage teaching schedules for educational institutions. It provides a user-friendly interface for viewing, creating, and managing teaching assignments and class schedules.

### Data Source Priority

1. **Supabase "iWorld Scheduler" project** - Primary data source
2. **Mock data** - Fallback when Supabase is unavailable

The application includes robust error handling and will automatically fall back to mock data if the Supabase connection fails. Recent updates have enhanced case sensitivity handling and improved the reliability of data retrieval from the database.

### MCP Integration

The application uses MCP servers for:
- Development support
- Deployment and CI/CD
- Monitoring and logging
- Integration with other systems

## Available Documentation

- [Architecture](./architecture.md): System architecture and design decisions
- [Components](./components.md): Detailed information about UI components
- [Data Structure](./data-structure.md): Database schema and data flow
- [Data Synchronization](./data-synchronization.md): Offline data handling and synchronization
- [Deployment](./deployment.md): Deployment process and environments
- [Development Plan](./development-plan.md): Roadmap and future enhancements
- [Error Boundaries](./error-boundaries.md): Error handling and UI resilience
- [Supabase Connectivity Troubleshooting](./supabase-connectivity-troubleshooting.md): Guide for resolving connection issues
- [Tasks](./tasks.md): Current development tasks and priorities

## Guidelines for New Developers

1. Read through the documentation to understand the system architecture
2. Set up your local environment following the instructions in the development plan
3. Use the console monitor for debugging (see console-monitor-loader.md)
4. Follow established coding patterns and conventions
5. Test all changes thoroughly before submitting

## Ongoing Development

1. When making changes, update relevant documentation
2. Log all identified issues in the task tracker
3. Add comprehensive error handling for all new features
4. Include debugging information for complex components
5. Ensure backward compatibility with existing data structures

## Code Reviews

1. Code reviews should verify that documentation is updated
2. Check for proper error handling and fallback mechanisms
3. Ensure components handle both connected and disconnected states
4. Verify that case sensitivity issues are handled appropriately

## Data Integration

The application now supports robust data integration with the Supabase backend:
- Field names are handled in a case-insensitive manner
- Teacher data is properly normalized between the database and UI
- Connection retry logic improves reliability
- Detailed debugging information is available in components

## MCP Server Usage

1. Refer to console-monitor-loader.md for monitoring capabilities
2. Use the MCP server to validate deployment before pushing to production
3. Monitor application logs through the MCP server

## Maintaining Documentation

1. Update this document when making significant changes
2. Add component-specific documentation for new major features
3. Keep the tasks list current with completed and planned work
4. Document all known issues and their workarounds 