# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Telemetria Pioneira is a complete telemetry system with full authentication, built as a monorepo using pnpm workspaces and Turborepo. The system features a robust authentication module with JWT tokens, role-based permissions, email services, and comprehensive security measures.

## Architecture

### Technology Stack
- **Monorepo**: pnpm workspaces with Turborepo for build orchestration
- **Backend**: Fastify (Node.js framework) with TypeScript
- **Database**: PostgreSQL with custom connection management
- **Authentication**: JWT tokens with refresh mechanism
- **Email**: SMTP integration with template system
- **Documentation**: Swagger/OpenAPI integration
- **Development**: TypeScript, ESM modules, path aliases
- **Package Management**: pnpm for efficient dependency management

### Monorepo Structure
The project follows a monorepo architecture with workspaces:

```
telemetria-pioneira/
├── apps/                   # Applications
│   └── backend/           # Backend API (@telemetria/backend)
│       └── src/
│           ├── modules/   # Feature modules (auth, etc.)
│           ├── shared/    # Shared utilities
│           ├── config/    # Configuration
│           ├── database/  # Database setup and migrations
│           └── templates/ # Email templates
├── packages/              # Shared packages (future)
│   └── (shared libraries, UI components, utilities)
├── pnpm-workspace.yaml   # Workspace configuration
├── turbo.json            # Build pipeline configuration
└── package.json          # Root package with monorepo scripts
```

### Backend Structure
The backend (`apps/backend`) follows a modular architecture:

```
apps/backend/src/
├── modules/                 # Feature modules (auth, etc.)
│   └── auth/               # Authentication module
│       ├── controllers/    # Request handlers
│       ├── services/       # Business logic
│       ├── models/         # Data models
│       ├── routes/         # Route definitions
│       ├── middleware/     # Auth middleware
│       └── validators/     # Request validation
├── shared/                 # Shared utilities
│   ├── utils/             # Helper functions
│   ├── middleware/        # Common middleware
│   └── constants/         # System constants
├── config/                # Configuration
├── database/              # Database setup and migrations
└── templates/             # Email templates
```

### Key Patterns
- **Monorepo Architecture**: Organized with pnpm workspaces for scalable development
- **Build Orchestration**: Turborepo for optimized builds, caching, and parallel execution
- **Singleton Pattern**: Used for controllers, services, and middleware
- **Modular Architecture**: Each feature (auth) is self-contained with its own controllers, services, etc.
- **Workspace Scoping**: Packages scoped with `@telemetria/` namespace
- **Path Aliases**: Uses TypeScript path mapping with `@/` prefix for clean imports
- **Environment-based Configuration**: Centralized config with type safety
- **Security-first Design**: Comprehensive logging, rate limiting, and validation

### Authentication System
The auth module implements a complete authentication system with:
- User registration with email verification
- JWT access/refresh tokens with role-based permissions
- Password reset with secure tokens
- Account lockout after failed attempts
- Comprehensive security logging
- Role-based access control (admin, user, moderator, viewer)

### Database Layer
Uses custom PostgreSQL integration with:
- Connection pooling
- Health checks
- Migration support
- Type-safe queries

## Development Commands

### Environment Setup
```bash
# Install all dependencies (monorepo)
pnpm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
```

### Development
```bash
# Start all apps in development mode (parallel)
pnpm dev

# Start only backend in development mode
pnpm --filter=backend dev

# Start with Docker
pnpm docker:up

# Watch mode for tests
pnpm test:watch
```

### Building & Production
```bash
# Build all packages (with Turborepo caching)
pnpm build

# Build only backend
pnpm --filter=backend build

# Start production server
pnpm start

# Start backend in Docker (production mode)
pnpm --filter=backend start:docker
```

### Database Operations
```bash
# Run database migrations
pnpm migrate

# Run migrations in Docker
pnpm migrate:docker

# Direct backend commands
pnpm --filter=backend migrate
```

### Testing & Quality
```bash
# Run all tests (across all packages)
pnpm test

# Run tests for specific package
pnpm --filter=backend test

# Run linting (across all packages)
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm typecheck

# Format code with Prettier
pnpm format

# Clean all build directories
pnpm clean
```

### Docker Operations
```bash
# Build Docker images
pnpm docker:build

# Start services
pnpm docker:up

# Stop services
pnpm docker:down

# View backend logs
pnpm docker:logs

# Restart backend service
pnpm docker:restart
```

### Workspace Management
```bash
# Add dependency to specific package
pnpm --filter=backend add <package>

# Add dev dependency to root
pnpm add -D -w <package>

# Run command in all packages
pnpm -r <command>

# List all workspace packages
pnpm list --depth=0

# Check workspace structure
pnpm ls --depth=0 --json
```

## Key Configuration

### Monorepo Configuration
- **pnpm-workspace.yaml**: Defines workspace patterns for apps and packages
- **turbo.json**: Build pipeline with caching and parallel execution
- **package.json**: Root configuration with monorepo scripts
- **Package Manager**: pnpm 8.15.0+ for efficient dependency management

### TypeScript Configuration
- Uses ES2022 with ESNext modules
- Strict type checking enabled
- Path aliases configured for clean imports (`@/*` maps to `src/*`)
- Source maps and declarations enabled
- Workspace-aware type checking

### Turborepo Pipeline
Optimized build pipeline with:
- **Dependency-aware builds**: Only rebuilds what changed
- **Remote caching**: Shared build cache across team
- **Parallel execution**: Runs tasks in optimal order
- **Task dependencies**: Proper build orchestration

### Environment Variables
The backend requires extensive environment configuration including:
- Database connection details (in `apps/backend/.env`)
- JWT secrets
- SMTP configuration
- CORS settings
- Rate limiting configuration
- Admin user auto-creation settings

### Docker Compose Services
- **postgres**: PostgreSQL 15 with health checks
- **backend**: Fastify API server with auto-restart (monorepo-aware)
- **pgadmin**: Database administration interface (optional)

### Workspace Benefits
- **Shared Dependencies**: Common packages installed once
- **Cross-package Development**: Easy linking between apps and packages
- **Consistent Tooling**: Shared linting, formatting, and build tools
- **Scalable Architecture**: Easy to add new apps and packages

## Important Files

### Monorepo Configuration
- `pnpm-workspace.yaml` - Workspace configuration
- `turbo.json` - Build pipeline and caching
- `package.json` - Root package with monorepo scripts
- `.prettierrc` - Code formatting configuration
- `.nvmrc` - Node.js version specification

### Backend Application
- `apps/backend/src/server.ts` - Application entry point
- `apps/backend/src/app.ts` - Main application class with initialization
- `apps/backend/src/modules/auth/` - Complete authentication implementation
- `apps/backend/package.json` - Backend-specific dependencies and scripts
- `apps/backend/tsconfig.json` - Backend TypeScript configuration

### Infrastructure
- `docker-compose.yml` - Complete containerized environment (monorepo-aware)
- `apps/backend/Dockerfile` - Backend container configuration
- `listar.js` - Custom directory structure visualization tool

## Security Considerations

This is a security-focused application with:
- Comprehensive authentication and authorization
- Rate limiting on sensitive endpoints
- Security event logging
- Password strength requirements
- Token-based authentication with refresh mechanism
- Account lockout mechanisms
- CORS and security headers configuration

When working with authentication code, always consider security implications and maintain the existing security patterns.

## Monorepo Best Practices

### Adding New Applications
1. Create new app in `apps/` directory
2. Add scoped package name (`@telemetria/app-name`)
3. Update workspace patterns if needed
4. Add build tasks to `turbo.json`

### Creating Shared Packages
1. Create package in `packages/` directory
2. Use scoped naming (`@telemetria/shared-package`)
3. Export from `index.ts` with proper types
4. Import in apps using workspace protocol: `"@telemetria/shared-package": "workspace:*"`

### Development Workflow
- Use `pnpm --filter=<package>` for package-specific commands
- Leverage Turborepo caching for faster builds
- Keep shared dependencies in root when possible
- Use workspace protocol for internal dependencies
