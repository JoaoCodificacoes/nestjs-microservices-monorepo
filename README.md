# NestJS Microservices Monorepo

This repository demonstrates a microservices architecture using the NestJS framework in a monorepo structure. It
includes an API Gateway that handles HTTP requests and an Authentication microservice for user management, communicating
via TCP.

The project is containerized using Docker and Docker Compose for easy setup and development.

## Architecture Overview

The system is composed of two main applications and several shared libraries:

- **`gateway`**: The public-facing API Gateway. It exposes RESTful endpoints, handles request validation, rate limiting,
  and forwards business logic to the appropriate microservice. It is also responsible for serving the Swagger API
  documentation.
- **`authentication`**: A microservice that manages user registration and authentication. It handles password hashing,
  JWT generation, and database interactions with MongoDB. It uses Redis for caching user data to improve performance.

### Shared Libraries (`libs`)

- **`common`**: Contains shared code such as DTOs, RTOs, and the Passport JWT strategy to ensure consistency across
  services.
- **`config`**: Provides centralized configuration management using `@nestjs/config` with Joi for environment variable
  validation.
- **`core`**: Contains foundational modules for database connections (Mongoose), logging (Pino), caching (Redis), and
  JWT configuration.

## Key Features

### Core Requirements

- ✅ NestJS Monorepo with apps/ structure
- ✅ API Gateway (HTTP REST)
- ✅ Authentication Microservice
- ✅ TCP Communication via NestJS Microservices
- ✅ MVC Pattern (Controller → Service → Repository)
- ✅ DTOs with class-validator
- ✅ MongoDB with Mongoose

### Bonus Features Implemented

- ✅ **JWT Authentication** - Secure token-based auth with Passport.js
- ✅ **Centralized Logging** - Pino logger across all services
- ✅ **Redis Caching** - Performance optimization for user data
- ✅ **Comprehensive Testing** - Unit and E2E tests for both services
- ✅ **Health Checks** - Service readiness monitoring
- ✅ **Rate Limiting** - Request throttling in API Gateway
- ✅ **API Documentation** - Interactive Swagger/OpenAPI docs
- ✅ **Full Dockerization** - Production-ready containerization
- ✅ **Code Quality** - ESLint & Prettier configuration

## Tech Stack

- **Framework**: NestJS
- **Architecture**: Microservices & Monorepo
- **Communication**: TCP
- **Database**: MongoDB (with Mongoose)
- **Caching**: Redis
- **Authentication**: JWT, Passport.js, bcrypt
- **API Documentation**: Swagger (OpenAPI)
- **Containerization**: Docker, Docker Compose
- **Linting/Formatting**: ESLint, Prettier
- **Testing**: Jest, Supertest

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm
- Docker and Docker Compose

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JoaoCodificacoes/nestjs-microservices-monorepo.git
   cd nestjs-microservices-monorepo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application (Docker)

The recommended way to run the application is using Docker Compose. This will start all the necessary services,
including the NestJS applications, MongoDB, and Redis.

```bash
docker-compose up --build
```

- **API Gateway** will be available at `http://localhost:3000`
- **Swagger API Documentation** will be available at `http://localhost:3000/api`
- **Health Check** endpoint is available at `http://localhost:3000/health`

The services defined in `docker-compose.yml` are:

- `gateway`: The API Gateway service.
- `authentication`: The Authentication microservice.
- `mongo`: The MongoDB database instance.
- `redis`: The Redis cache instance.

## API Endpoints

Once the services are running, you can interact with the API via the Gateway. Refer to the Swagger UI at
`http://localhost:3000/api` for a detailed and interactive API documentation.

### Main Endpoints

- `POST /auth/register`: Register a new user.
- `POST /auth/login`: Authenticate a user and receive a JWT access token.
- `GET /auth/users`: Retrieve a list of all registered users. (Requires a valid JWT Bearer token).
- `GET /health`: Check the health status of the gateway and its connected microservices.

## Running Tests

This monorepo is configured with both unit and end-to-end (E2E) tests for each application.

- **Run all unit tests:**
  ```bash
  npm run test
  ```

- **Run E2E tests for the Gateway:**
  ```bash
  npm run test:e2e:gateway
  ```

- **Run E2E tests for the Authentication microservice:**
  *Note: This requires a running MongoDB instance. The test suite is configured to use a separate test database.*
  ```bash
  npm run test:e2e:auth
  ```

## Project Structure

```
.
├── apps
│   ├── authentication/   # Authentication microservice
│   └── gateway/          # API Gateway service
├── libs
│   ├── common/           # Shared DTOs, RTOs, auth logic
│   ├── config/           # Shared configuration module
│   └── core/             # Shared core modules (DB, Redis, Logger)
├── docker-compose.yml    # Docker services definition
├── nest-cli.json         # NestJS monorepo configuration
└── package.json          # Project dependencies and scripts