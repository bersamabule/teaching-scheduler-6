# Contributing to Teaching Scheduler 6

Thank you for considering contributing to the Teaching Scheduler application. This document outlines the process for contributing to the project.

## Development Process

### Getting Started

1. Set up the local development environment by following the instructions in the README.md file.
2. For Docker-based development (recommended), use `docker-compose -f docker/docker-compose.yml up`.
3. Familiarize yourself with the project structure and documentation in the `docs` directory.

### Branching Strategy

- `main`: Production-ready code
- `develop`: Development branch for integrating features
- `feature/feature-name`: Feature branches
- `bugfix/issue-name`: Bug fix branches
- `release/version`: Release preparation branches

### Pull Request Process

1. Create a branch from `develop` for your feature or bugfix.
2. Make your changes and ensure all tests pass.
3. Update documentation as needed.
4. Submit a pull request to the `develop` branch.
5. Ensure the CI pipeline passes.
6. Wait for code review and address any feedback.

## Coding Standards

### JavaScript/TypeScript

- Follow the project's ESLint configuration.
- Use TypeScript for type safety whenever possible.
- Write unit tests for new features.
- Document complex functions and components.

### CSS/Styling

- Use Tailwind CSS for styling components.
- Follow the established design system.
- Ensure responsive design for all screen sizes.

### Commit Messages

Follow the Conventional Commits specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code changes that neither fix bugs nor add features
- `test:` Adding or updating tests
- `chore:` Changes to the build process or auxiliary tools

## Testing

- Run tests before submitting a pull request:
  ```bash
  npm run test
  ```
- Add or update tests for any new features or bug fixes.
- Ensure tests run successfully in the Docker environment:
  ```bash
  docker-compose -f docker/docker-compose.yml run app npm run test
  ```

## Docker Development

When developing with Docker:

1. Use the Docker development environment for consistent results.
2. Update the Dockerfile when adding new dependencies.
3. Test Docker builds locally before pushing changes.

## MCP Server Integration

When working with MCP servers:

1. Follow the configuration patterns in `mcp/config.json`.
2. Test MCP server interactions locally before committing.
3. Document any new MCP server capabilities.

## Questions and Support

If you have questions or need support, please:

1. Check existing documentation in the `docs` directory.
2. Look for similar issues in the issue tracker.
3. Open a new issue with a detailed description of your question or problem.

Thank you for contributing to the Teaching Scheduler 6 application! 