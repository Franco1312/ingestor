# 🏦 Ingestor - Argentina Economic Data Service

> **Production-grade time-series ingestion service** for Argentina's official economic data from BCRA (Central Bank) and other government sources.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Development](#development)
- [Deployment](#deployment)

## 🎯 Overview

The **Ingestor** is a robust data ingestion service designed to collect, normalize, and store Argentina's official economic time-series data from multiple sources including BCRA, DolarApi, and INDEC.

### Key Features

- ✅ **Multi-source data ingestion** from BCRA, DolarApi, and INDEC
- ✅ **Intelligent provider routing** based on series type
- ✅ **Series mapping system** for external-to-internal ID resolution
- ✅ **Idempotent upserts** preventing duplicate data
- ✅ **Automatic failover** between data providers
- ✅ **Dockerized deployment** with PostgreSQL + TimescaleDB
- ✅ **CLI tools** for manual operations and debugging
- ✅ **Clean Architecture** with domain-driven design

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 with TimescaleDB

### Setup

```bash
# Clone repository
git clone <repository-url>
cd ingestor

# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d postgres

# Run backfill to populate all series with last year of data
NODE_ENV=local npm run backfill
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run backfill     # Backfill historical data for all series
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run build        # Build for production
```

## 📚 Documentation

### Core Documentation

- **[Data Model Documentation](docs/data-model-series.md)** - Comprehensive guide to the data model, series types, and business context
- **[Code Guidelines](CODE_GUIDELINES.md)** - Development standards, architectural patterns, and coding conventions
- **[API Documentation](docs/api-endpoints.md)** - External API endpoints and integration details
- **[Architecture Guide](docs/architecture.md)** - System architecture and design patterns
- **[Configuration Guide](docs/configuration.md)** - Environment variables and deployment settings

### Quick Start Documentation

1. **Understanding the Data Model**: Start with `docs/data-model-series.md` to understand what series are and how they work
2. **Development Setup**: Follow the [Development](#development) section for local setup
3. **Code Standards**: Review `CODE_GUIDELINES.md` before contributing
4. **Data Population**: Use the CLI commands to populate your database

### Business Context

The documentation is designed for:
- **Data Scientists** - Understanding the data model and available series
- **Developers** - Following code guidelines and architectural patterns
- **Business Users** - Understanding what data is available and how to use it
- **DevOps** - Deployment and monitoring considerations

## 🛠️ Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 with TimescaleDB

### Setup

```bash
# Clone repository
git clone <repository-url>
cd ingestor

# Install dependencies
pnpm install

# Start PostgreSQL
docker-compose up -d postgres

# Run backfill to populate all series with last year of data
NODE_ENV=local npm run backfill
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f ingestor

# Scale services
docker-compose up -d --scale ingestor=3
```

### Production Considerations

1. **TLS Configuration**: Configure proper CA bundles for production
2. **Database Backup**: Implement regular backup strategy
3. **Monitoring**: Set up health checks and alerting
4. **Scaling**: Configure load balancing for multiple instances
5. **Security**: Use proper authentication and authorization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for Argentina's economic data community**