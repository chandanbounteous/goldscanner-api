# GoldScanner API

Backend API service for the GoldScanner application - a gold detection and analysis system built with Node.js, TypeScript, Express, and PostgreSQL.

## 🚀 Features

- **RESTful API** with Express.js and TypeScript
- **PostgreSQL Database** with Prisma ORM
- **Redis Caching** for improved performance
- **Docker Support** for easy deployment
- **Swagger Documentation** for API exploration
- **JWT Authentication** for secure access
- **Rate Limiting** and security middleware
- **Comprehensive Logging** with Winston
- **Database Migrations** and seeding
- **Health Checks** for monitoring

## 🛠️ Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **ORM**: Prisma
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose
- **Documentation**: Swagger/OpenAPI 3.0
- **Authentication**: JWT
- **Logging**: Winston
- **Testing**: Jest & Supertest

## 📦 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) 18+ and npm (for local development)

## 🚀 Quick Start

### Development Setup

1. **Clone and navigate to the project:**

   ```bash
   cd goldscanner-api
   ```

2. **Run the setup script:**

   ```bash
   chmod +x setup-dev.sh
   ./setup-dev.sh
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Manual Setup

If you prefer manual setup:

1. **Create environment file:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start database services:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Generate Prisma client:**

   ```bash
   npx prisma generate
   ```

5. **Run database migrations:**

   ```bash
   npx prisma migrate dev
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

## 🐳 Docker Deployment

### Development

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up

# Run with the main compose file
docker-compose up
```

### Production

```bash
# Build and start production services
docker-compose --profile production up -d

# Or build the image manually
docker build -t goldscanner-api .
docker run -p 3000:3000 --env-file .env goldscanner-api
```

## 📚 API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/v1/health

## 📁 Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Data models (if using non-Prisma models)
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point

prisma/
├── schema.prisma    # Database schema
└── migrations/      # Database migrations

docker-compose.yml   # Production Docker configuration
docker-compose.dev.yml # Development Docker configuration
Dockerfile          # Production Docker image
Dockerfile.dev      # Development Docker image
```

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build TypeScript to JavaScript
npm run start           # Start production server

# Database
npm run migrate         # Run database migrations
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Prisma Studio
npm run db:seed         # Seed database with test data

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
npm run typecheck       # Type check without compilation

# Testing
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage

# Docker
npm run docker:build    # Build Docker image
npm run docker:up       # Start Docker services
npm run docker:down     # Stop Docker services
npm run docker:logs     # View API logs
```

## 🔧 Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/goldscanner_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d

# Server
PORT=3000
NODE_ENV=development
```

## 🗄️ Database Schema

The application includes models for:

- **Users**: Authentication and user management
- **ScanSessions**: Gold scanning session data
- **ScanData**: Individual scan measurements
- **Configuration**: System configuration

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT authentication
- Input validation
- SQL injection prevention (Prisma)

## 📊 Monitoring & Logging

- Winston logger with file and console output
- Health check endpoints
- Docker health checks
- Error tracking and reporting

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Deployment with Docker

1. **Set production environment variables**
2. **Build and start services:**
   ```bash
   docker-compose --profile production up -d
   ```

### Linux Server Deployment

1. **Install dependencies on target server**
2. **Clone repository and build:**
   ```bash
   npm ci --only=production
   npm run build
   ```
3. **Set up process manager (PM2):**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name goldscanner-api
   ```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api-docs`
