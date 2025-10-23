# 🏦 Ingestor - Argentina Economic Data Service

> **Production-grade time-series ingestion service** for Argentina's official economic data from BCRA (Central Bank) and other government sources.

## 📋 Table of Contents

- [Overview](#overview)
- [Business Context](#business-context)
- [Data Sources](#data-sources)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
- [Usage](#usage)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)

## 🎯 Overview

The **Ingestor** is a robust data ingestion service designed to collect, normalize, and store Argentina's official economic time-series data. It focuses primarily on **BCRA (Banco Central de la República Argentina)** monetary data while maintaining a fallback system for other government sources.

### Key Features

- ✅ **Real-time data ingestion** from BCRA Monetarias v3 API
- ✅ **Idempotent upserts** preventing duplicate data
- ✅ **Automatic failover** between data providers
- ✅ **Structured logging** with comprehensive observability
- ✅ **Dockerized deployment** with PostgreSQL + TimescaleDB
- ✅ **Scheduled updates** with configurable cron jobs
- ✅ **CLI tools** for manual operations and debugging

## 🏢 Business Context

### What Problem Does It Solve?

Argentina's economic data is scattered across multiple government agencies and APIs. Financial institutions, research organizations, and businesses need:

1. **Reliable access** to official economic indicators
2. **Historical data** for analysis and modeling
3. **Real-time updates** for decision-making
4. **Data normalization** across different sources
5. **High availability** and fault tolerance

### Target Users

- **Financial institutions** monitoring economic indicators
- **Research organizations** analyzing Argentina's economy
- **Business intelligence** teams requiring economic data
- **Data scientists** building economic models
- **Government agencies** needing consolidated data views

## 📊 Data Sources

### Primary Source: BCRA Monetarias v3

**Base URL**: `https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias`

The service primarily ingests data from BCRA's official monetary statistics API, which provides:

- **International Reserves** (Reservas Internacionales)
- **Monetary Base** (Base Monetaria)
- **Exchange Rates** (Tipos de Cambio)
- **Interest Rates** (Tasas de Interés)
- **Banking Statistics** (Estadísticas Bancarias)

### API Endpoints Used

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `GET /Monetarias` | Get all available variables | `GET /estadisticas/v3.0/Monetarias` |
| `GET /Monetarias/{id}` | Get specific variable data | `GET /estadisticas/v3.0/Monetarias/1` |

### API Parameters

- **`desde`**: Start date (YYYY-MM-DD)
- **`hasta`**: End date (YYYY-MM-DD)
- **`limit`**: Page size (default: 1000)
- **`offset`**: Page offset for pagination

### Fallback Source: Datos Argentina

**Base URL**: `https://apis.datos.gob.ar/series/api`

Used as a fallback when BCRA API is unavailable, providing access to:
- INDEC economic indicators
- Other government statistics
- Historical data from various agencies

## 🏗️ Architecture

### Clean Architecture Implementation

```
src/
├── domain/           # Business logic and entities
│   ├── entities/     # Core business objects
│   ├── ports/        # Interface definitions
│   └── providers.ts  # Provider abstractions
├── application/      # Use cases and business rules
│   └── usecases/     # Application logic
├── infrastructure/   # External concerns
│   ├── config/       # Configuration management
│   ├── db/          # Database layer
│   ├── http/        # HTTP clients
│   ├── providers/   # Provider implementations
│   └── sched/       # Scheduling
└── interfaces/      # External interfaces
    ├── cli/         # Command-line interfaces
    └── rest/        # REST API endpoints
```

### Key Components

1. **Provider Chain**: Orchestrates data fetching with automatic failover
2. **Repository Pattern**: Abstracts database operations
3. **Use Cases**: Encapsulates business logic
4. **HTTP Clients**: Handle external API communication
5. **Scheduler**: Manages automated data updates

## 🗄️ Data Model

### Core Tables

#### `series` - Series Catalog
```sql
CREATE TABLE series (
    id VARCHAR PRIMARY KEY,           -- Series identifier
    source VARCHAR NOT NULL,          -- Data source (bcra, indec, etc.)
    frequency VARCHAR NOT NULL,       -- Data frequency (daily, monthly)
    unit VARCHAR,                     -- Measurement unit
    metadata JSONB                    -- Additional metadata
);
```

#### `series_points` - Time Series Data
```sql
CREATE TABLE series_points (
    series_id VARCHAR NOT NULL,       -- Reference to series.id
    ts DATE NOT NULL,                 -- Timestamp (YYYY-MM-DD)
    value NUMERIC NOT NULL,           -- Data value
    PRIMARY KEY (series_id, ts)
);
```

### TimescaleDB Integration

The `series_points` table is configured as a **TimescaleDB hypertable** for optimal time-series performance:

```sql
SELECT create_hypertable('series_points', 'ts');
```

### Sample Data

#### Series Catalog
```json
{
  "id": "1",
  "source": "bcra",
  "frequency": "daily",
  "unit": "USD",
  "metadata": {
    "bcra_idVariable": 1,
    "description": "Reservas Internacionales del BCRA (en millones de dólares)",
    "source_url": "https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/1"
  }
}
```

#### Time Series Points
```
series_id |     ts     | value 
----------|------------|-------
1         | 2025-10-21 | 40540
1         | 2025-10-20 | 41316
1         | 2025-10-17 | 41170
15        | 2025-10-21 | 40177879
15        | 2025-10-20 | 40972264
```

## 🔌 API Endpoints

### BCRA Monetarias v3 API

#### Get Available Variables
```http
GET https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias
```

**Response**:
```json
{
  "status": 200,
  "results": [
    {
      "idVariable": 1,
      "descripcion": "Reservas Internacionales del BCRA",
      "categoria": "Principales Variables",
      "fecha": "2025-10-21",
      "valor": 40540.0
    }
  ]
}
```

#### Get Variable Data
```http
GET https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/1?desde=2024-01-01&hasta=2024-03-01
```

**Response**:
```json
{
  "status": 200,
  "metadata": {
    "resultset": {
      "count": 42,
      "offset": 0,
      "limit": 1000
    }
  },
  "results": [
    {
      "idVariable": 1,
      "fecha": "2024-03-01",
      "valor": 27334.0
    }
  ]
}
```

## 🚀 Usage

### CLI Commands

#### Discovery (Map Series to BCRA Variables)
```bash
npm run discover
```
- Fetches all available BCRA variables
- Maps catalog series to BCRA `idVariable`
- Updates series metadata with mapping information

#### Backfill (Historical Data)
```bash
npm run backfill -- --series 1 --from 2024-01-01 --to 2024-03-01
```
- Fetches historical data for specified date range
- Implements pagination for large datasets
- Performs idempotent upserts

#### Daily Update
```bash
npm run update
```
- Fetches latest data for all mapped series
- Automatically determines date ranges
- Updates only new data points

### Programmatic Usage

```typescript
import { BcraMonetariasProvider } from './src/infrastructure/providers/bcraMonetariasProvider.js';
import { FetchAndStoreSeriesUseCase } from './src/application/usecases/fetchAndStoreSeries.js';

// Initialize provider
const provider = new BcraMonetariasProvider();

// Fetch data
const result = await provider.fetchRange({
  externalId: '1',
  from: '2024-01-01',
  to: '2024-03-01'
});

console.log(`Fetched ${result.points.length} data points`);
```

## ⚙️ Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5433/ingestor

# External Services
BCRA_V3_BASE=https://api.bcra.gob.ar
DATOS_SERIES_BASE=https://apis.datos.gob.ar/series/api

# Provider Configuration
PRIMARY_PROVIDER=BCRA_MONETARIAS
FALLBACK_PROVIDER=DATOS_SERIES

# HTTP Configuration
HTTP_TIMEOUT_MS=20000
HTTP_RETRIES=3
HTTP_BACKOFF_BASE_MS=250
HTTP_BACKOFF_FACTOR=2
HTTP_BACKOFF_MAX_MS=8000

# Application
APP_TIMEZONE=America/Argentina/Buenos_Aires

# Circuit Breaker
BREAKER_FAILURE_THRESHOLD=5
BREAKER_WINDOW_MS=600000
BREAKER_OPEN_MS=900000

# TLS Configuration (Production)
# BCRA_CA_BUNDLE_PATH=/app/certs/bcra-chain.pem
```

### Series Configuration

The service maintains a catalog of series in the `series` table:

```sql
-- BCRA Series
INSERT INTO series (id, source, frequency, unit, metadata) VALUES
('1', 'bcra', 'daily', 'USD', '{"bcra_idVariable": 1, "description": "Reservas Internacionales"}'),
('15', 'bcra', 'daily', 'ARS', '{"bcra_idVariable": 15, "description": "Base Monetaria"}');
```

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

# Run discovery to map series
NODE_ENV=local npm run discover

# Run backfill for historical data
NODE_ENV=local npm run backfill -- --series 1 --from 2024-01-01 --to 2024-03-01

# Run daily update
NODE_ENV=local npm run update
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run discover     # Map series to BCRA variables
npm run update       # Daily update
npm run backfill     # Historical data backfill
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run test         # Run tests
npm run build        # Build for production
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

### Health Checks

The service provides health check endpoints:

```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T22:00:00Z",
  "database": "connected",
  "providers": {
    "BCRA_MONETARIAS": "healthy"
  }
}
```

## 📈 Data Flow

### Daily Update Flow

1. **Scheduler triggers** at 08:05 AM Argentina time
2. **Check database connectivity**
3. **Initialize provider chain** (BCRA Monetarias primary)
4. **For each mapped series**:
   - Get last stored date
   - Fetch new data from BCRA API
   - Perform idempotent upserts
   - Log results
5. **Send summary** with statistics

### Backfill Flow

1. **CLI command** with date range parameters
2. **Validate parameters** and connectivity
3. **For specified series**:
   - Fetch historical data with pagination
   - Normalize data format
   - Store in database
   - Handle duplicates with upserts
4. **Return statistics** and completion status

### Error Handling

- **Retry Logic**: Exponential backoff with jitter
- **Circuit Breaker**: Automatic failover on repeated failures
- **Graceful Degradation**: Continue processing other series on individual failures
- **Comprehensive Logging**: Structured logs for debugging and monitoring

## 🔍 Monitoring & Observability

### Structured Logging

All operations are logged with structured JSON format:

```json
{
  "level": "info",
  "time": "2025-10-23T22:00:00Z",
  "service": "ingestor",
  "provider": "BCRA_MONETARIAS",
  "seriesId": "1",
  "pointsFetched": 42,
  "pointsStored": 42,
  "durationMs": 1500
}
```

### Key Metrics

- **Data Points Processed**: Total points fetched and stored
- **API Response Times**: Latency to external APIs
- **Error Rates**: Failed requests and retry attempts
- **Database Performance**: Query execution times
- **Provider Health**: Availability of external services

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