# 🏦 Ingestor - Argentina Economic Data Service

> **Production-grade time-series ingestion service** for Argentina's official economic data from BCRA (Central Bank).

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Development](#development)
- [Deployment](#deployment)

## 🎯 Overview

The **Ingestor** is a robust data ingestion service designed to collect, normalize, and store Argentina's official economic time-series data from BCRA (Central Bank of Argentina).

### Key Features

- ✅ **BCRA Monetarias & Cambiarias APIs** integration
- ✅ **Series mapping system** for external-to-internal ID resolution
- ✅ **Idempotent upserts** preventing duplicate data
- ✅ **Dockerized deployment** with PostgreSQL
- ✅ **CLI tools** for manual operations and debugging
- ✅ **Clean Architecture** with domain-driven design
- ✅ **Structured logging** with JSON format

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16

### Setup

```bash
# Clone repository
git clone <repository-url>
cd ingestor

# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d postgres

# Wait for database to be ready, then run:
npm run populate-series
npm run backfill
npm run backfill-cambiarias
```

### Available Scripts

```bash
npm run populate-series    # Populate series catalog from BCRA APIs
npm run backfill           # Backfill BCRA Monetarias data (last year)
npm run backfill-cambiarias # Backfill BCRA Cambiarias exchange rates (last month)
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
npm run build             # Build for production
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
- PostgreSQL 16

### Setup

```bash
# Clone repository
git clone <repository-url>
cd ingestor

# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d postgres

# Wait for database to be ready, then run:
npm run populate-series
npm run backfill
npm run backfill-cambiarias
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

1. **Database Backup**: Implement regular backup strategy
2. **Monitoring**: Set up health checks and alerting
3. **Security**: Use proper authentication and authorization

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