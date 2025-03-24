# Changelog

## [Unreleased]

### Added
- Enhanced console monitoring system with MCP server integration
- In-app console viewer with filtering and search capabilities
- Debug Console button in the navigation bar (dev/test environments only)
- Keyboard shortcut (Ctrl+Alt+D) to toggle console viewer
- Automatic capture of unhandled errors and promise rejections
- MCP server launcher script for easy startup of all servers
- NPM scripts for starting MCP servers (`mcp:start` and `dev:with-mcp`)
- Comprehensive documentation for MCP server integration

### Changed
- Fixed Supabase connectivity issues by correcting environment variable names
- Replaced non-existent RPC function call with direct table query
- Updated error handling with more detailed logging
- Made connection status indicator more responsive to state changes
- Improved error messages for better troubleshooting

### Removed
- Deprecated swcMinify option from next.config.js

## [0.1.0] - 2025-03-22

### Added
- Initial application structure with Next.js
- Supabase integration for data storage
- Weekly calendar view for schedule display
- Teacher selection interface
- Date navigation controls
- Database explorer for debugging
- Connection status indicator
- Error boundaries around data-dependent components
- Documentation in the docs directory 