# Slack WebSocket Server

A real-time messaging server built with NestJS and WebSockets, featuring PostgreSQL database integration.

## 📋 Table of Contents

- [Description](#description)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Setup](#docker-setup)
- [Environment Configuration](#environment-configuration)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Resources](#resources)

## 📝 Description

This is a WebSocket-based messaging server built with [NestJS](https://github.com/nestjs/nest) framework. It provides real-time communication capabilities with PostgreSQL database persistence.

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Docker** and **Docker Compose** (for database setup)

## 🚀 Quick Start

1. **Clone the repository and install dependencies**

```bash
npm install
```

2. **Set up environment variables**

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your preferred settings (optional - defaults work fine)
```

3. **Start the database with Docker**

```bash
# Start PostgreSQL and pgAdmin
docker-compose -f docker.compose.yml up -d

# Verify containers are running
docker ps
```

4. **Run the application**

```bash
# Development mode with hot-reload
npm run start:dev
```

The server will start on `http://localhost:3000` (or your configured port).

## 🐳 Docker Setup

### Database Services

This project uses Docker Compose to manage PostgreSQL and pgAdmin services.

#### Start Services

```bash
# Start all services in detached mode
docker-compose -f docker.compose.yml up -d

# Start with logs visible
docker-compose -f docker.compose.yml up

# Start specific service
docker-compose -f docker.compose.yml up -d postgres
```

#### Stop Services

```bash
# Stop all services (keeps data)
docker-compose -f docker.compose.yml stop

# Stop and remove containers (keeps data in volumes)
docker-compose -f docker.compose.yml down

# Stop and remove everything including volumes (⚠️ deletes all data)
docker-compose -f docker.compose.yml down -v
```

#### View Logs

```bash
# View all logs
docker-compose -f docker.compose.yml logs

# Follow logs in real-time
docker-compose -f docker.compose.yml logs -f

# View specific service logs
docker-compose -f docker.compose.yml logs -f postgres
```

#### Restart Services

```bash
# Restart all services
docker-compose -f docker.compose.yml restart

# Restart specific service
docker-compose -f docker.compose.yml restart postgres
```

### Access pgAdmin

1. Open your browser and navigate to: `http://localhost:5050`
2. Login with credentials from `.env` (default: `admin@slack.local` / `admin`)
3. Add a new server connection:
   - **General Tab:**
     - Name: `Slack Database` (or any name you prefer)
   - **Connection Tab:**
     - Host: `postgres` (container name)
     - Port: `5432`
     - Maintenance database: `slack_db`
     - Username: `slack_user`
     - Password: `slack_password`

### Direct PostgreSQL Access

```bash
# Connect to PostgreSQL container
docker exec -it slack-postgres psql -U slack_user -d slack_db

# Run SQL commands
# Example: \dt to list tables, \q to quit
```

### Container Management

```bash
# Check container status
docker-compose -f docker.compose.yml ps

# Check container health
docker inspect slack-postgres --format='{{.State.Health.Status}}'

# Remove stopped containers
docker-compose -f docker.compose.yml rm

# Rebuild containers (if you modify docker-compose.yml)
docker-compose -f docker.compose.yml up -d --build
```

## ⚙️ Environment Configuration

Create a `.env` file in the project root (use `.env.example` as template):

```env
# PostgreSQL Configuration
POSTGRES_USER=slack_user
POSTGRES_PASSWORD=slack_password
POSTGRES_DB=slack_db
POSTGRES_PORT=5432

# pgAdmin Configuration
PGADMIN_EMAIL=admin@slack.local
PGADMIN_PASSWORD=admin
PGADMIN_PORT=5050

# Database Connection URL (for NestJS)
DATABASE_URL=postgresql://slack_user:slack_password@localhost:5432/slack_db
```

## 💻 Development

### Available Scripts

```bash
# Start in development mode with hot-reload
npm run start:dev

# Start in production mode
npm run start:prod

# Build the project
npm run build

# Format code with Prettier
npm run format

# Lint code
npm run lint

# Start in debug mode
npm run start:debug
```

### Development Workflow

1. **Start the database:**
   ```bash
   docker-compose -f docker.compose.yml up -d
   ```

2. **Run the application in watch mode:**
   ```bash
   npm run start:dev
   ```

3. **Make your changes** - the server will automatically reload

4. **Test your changes** (see Testing section)

5. **Stop the database when done:**
   ```bash
   docker-compose -f docker.compose.yml stop
   ```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Generate test coverage report
npm run test:cov
```

## 📁 Project Structure

```
server/
├── src/                    # Source files
│   ├── main.ts            # Application entry point
│   └── ...                # Other source files
├── test/                  # Test files
├── dist/                  # Compiled output
├── docker.compose.yml     # Docker Compose configuration
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 📚 Resources

### NestJS Resources

- [NestJS Documentation](https://docs.nestjs.com) - Official framework documentation
- [NestJS Discord](https://discord.gg/G7Qnnhy) - Community support
- [NestJS Courses](https://courses.nestjs.com/) - Official video courses
- [NestJS Devtools](https://devtools.nestjs.com) - Application visualization

### Docker Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [pgAdmin Docker Image](https://hub.docker.com/r/dpage/pgadmin4)

## 🤝 Support

For questions and support:
- Visit the [NestJS Discord channel](https://discord.gg/G7Qnnhy)
- Check out [NestJS Enterprise Support](https://enterprise.nestjs.com)

## 📄 License

This project is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

---

**Built with ❤️ using [NestJS](https://nestjs.com/)**
