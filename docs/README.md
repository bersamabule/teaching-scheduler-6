# Teaching Scheduler Documentation

This directory contains comprehensive documentation for the Teaching Scheduler application. These documents are maintained to provide a clear understanding of the project structure, components, data model, and development roadmap.

## Data Source Priority

The Teaching Scheduler application is designed to work primarily with the **Supabase "iWorld Scheduler" project** as its authoritative data source. All components first attempt to fetch live data from Supabase, with mock data used only as a fallback mechanism when the primary source is unavailable.

- **Primary Data Source**: Supabase "iWorld Scheduler" project
- **Fallback Only**: Mock data system (for development/offline scenarios)

## MCP Integration

The application leverages Model Context Protocol (MCP) servers for various functions:

- **Development**: Console monitoring, debugging, and file system access
- **Deployment**: Automated CI/CD pipeline and container orchestration
- **Monitoring**: Runtime performance tracking and error detection
- **Integration**: External API access and third-party service connectivity

MCP servers are prioritized over custom implementations to ensure standardized, secure, and maintainable functionality.

## Available Documentation

- **[Development Plan](development-plan.md)**: Outlines the project goals, development phases, and roadmap for the Teaching Scheduler application.
- **[Status](status.md)**: Tracks the current progress of the project, including completed features, in-progress tasks, and next steps.
- **[Architecture](architecture.md)**: Provides an overview of the system design, including key components and their relationships.
- **[Components](components.md)**: Details the UI and page components that make up the application.
- **[Data Structure](data-structure.md)**: Documents the data types, relationships, and storage mechanisms used in the application.
- **[Tasks](tasks.md)**: Lists current and upcoming tasks organized by priority.
- **[Deployment](deployment.md)**: Outlines the automated deployment strategy using MCP servers for CI/CD.

## How to Use This Documentation

### For New Developers

If you're new to the project:
1. Start with the **Development Plan** to understand the project goals and roadmap
2. Review the **Architecture** document to get an overview of the system design
3. Explore the **Components** and **Data Structure** documents to understand the implementation details
4. Check the **Status** document to see what's currently being worked on
5. Review the **Tasks** list to find tasks you can contribute to
6. Understand the **Deployment** process for testing and releasing your changes

### For Ongoing Development

When continuing development:
1. Check the **Status** document to understand the current state of the project
2. Review the **Tasks** list to identify what needs to be done next
3. Update the documentation as you make changes to the codebase
4. Follow the deployment workflow outlined in the **Deployment** document

### For Code Reviews

When reviewing code changes:
1. Reference the **Architecture** and **Components** documents to ensure changes align with the system design
2. Check that changes follow the patterns documented in the **Data Structure** document
3. Update the **Status** document after merging changes
4. Verify that the changes will work with the automated deployment pipeline

## Data Integration Guidelines

When working with data in the Teaching Scheduler:

1. Always attempt to fetch data from the Supabase "iWorld Scheduler" project first
2. Use mock data only as a fallback when Supabase is unavailable
3. Provide clear error handling for connection issues
4. Design components to work with real data, not mock representations
5. Indicate in the UI when fallback data is being used

## MCP Server Usage Guidelines

When developing or extending the Teaching Scheduler:

1. Leverage existing MCP servers instead of building custom solutions
2. Use the console monitoring MCP server for debugging and performance tracking
3. Follow the deployment MCP server configuration for automated deployments
4. Contribute improvements to MCP server integrations when possible
5. Document any new MCP server capabilities in the architecture document

## Maintaining Documentation

All documentation should be kept up-to-date as the codebase evolves. When making significant changes:

1. Update relevant documentation files
2. Ensure the **Status** document reflects the latest state of the project
3. Update the **Tasks** list to reflect completed and new tasks
4. Review and update the **Architecture** and **Data Structure** documents as needed

## Documentation Format

All documentation is written in Markdown format for easy reading and editing. When contributing to documentation:

1. Use clear, concise language
2. Include code examples where appropriate
3. Use headings and lists to organize information
4. Link to other relevant documentation files when referencing them 