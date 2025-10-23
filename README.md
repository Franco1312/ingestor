# Ingestor Service

A production-grade, scalable ingestion service that fetches PUBLIC OFFICIAL time-series data from Argentina's official APIs, normalizes it, and stores it with idempotency in a TimescaleDB database.

## 🚀 Features

- **Time Series Ingestion**: Fetches data from Datos Argentina's official time series API
- **Idempotent Storage**: Uses PostgreSQL + TimescaleDB with upsert operations
- **Automated Scheduling**: Daily updates via cron scheduler (Argentina timezone)
- **CLI Interface**: Command-line tools for manual updates and backfilling
- **Robust Error Handling**: Retries with exponential backoff and jitter
- **Structured Logging**: JSON logs with correlation IDs and context
- **Type Safety**: Full TypeScript with strict mode and Zod validation
- **Testing**: Unit tests with Vitest and comprehensive coverage

## 📋 Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **Docker & Docker Compose** for local infrastructure
- **pnpm** package manager

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd ingestor
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL + TimescaleDB
docker-compose -f infrastructure/docker-compose.yml up -d

# Wait for database to be ready (check with docker-compose logs)
```

### 4. Initialize Database

```bash
# Apply schema and seed data
psql -h localhost -U user -d ingestor -f infrastructure/db/init/001_schema.sql
psql -h localhost -U user -d ingestor -f infrastructure/db/init/010_seed_series.sql
```

### 5. Run the Service

```bash
# Update all whitelisted series
pnpm update

# Backfill specific series
pnpm backfill -- --series 168.1_T_CAMBIOR_D_0_0_26 --from 2024-01-01

# Start the scheduler service
pnpm dev
```

## 📁 Project Structure

```
ingestor/
├── src/
│   ├── domain/              # Domain entities and ports
│   │   ├── entities.ts      # SeriesPoint, SeriesMetadata
│   │   └── ports.ts         # Repository and service interfaces
│   ├── application/         # Use cases
│   │   └── usecases/
│   │       ├── fetchAndStoreSeries.ts
│   │       └── backfillSeries.ts
│   ├── infrastructure/      # External dependencies
│   │   ├── config/env.ts    # Environment validation
│   │   ├── db/              # Database layer
│   │   ├── http/            # API clients
│   │   ├── log/             # Logging setup
│   │   └── sched/           # Cron scheduler
│   └── interfaces/          # Entry points
│       ├── cli/             # Command-line interface
│       └── rest/            # REST endpoints (health checks)
├── infrastructure/          # Docker and database setup
├── test/                    # Unit tests
└── .github/workflows/       # CI/CD pipeline
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `APP_TIMEZONE` | Application timezone | `America/Argentina/Buenos_Aires` |
| `LOG_LEVEL` | Logging level | `info` |
| `HTTP_TIMEOUT_MS` | HTTP request timeout | `15000` |
| `HTTP_RETRIES` | Number of retry attempts | `3` |
| `DATOS_SERIES_BASE` | Datos Argentina API base URL | `https://apis.datos.gob.ar/series/api` |
| `SERIES_WHITELIST` | Comma-separated list of series IDs | Required |
| `PAGE_SIZE` | API pagination size | `1000` |

### Series Configuration

The service fetches data for series listed in `SERIES_WHITELIST`. Example series IDs:

- `168.1_T_CAMBIOR_D_0_0_26` - Official USD exchange rate (daily)
- `92.2_RESERVAS_IRES_0_0_32_40` - Gross international reserves (daily)
- `143.1_MONETARIO_0_0_2_3` - Monetary base (daily)

## 🗄️ Database Schema

### Tables

**`series`** - Series catalog
```sql
CREATE TABLE series (
  id        TEXT PRIMARY KEY,    -- e.g., "bcra.fx_reserves_gross"
  source    TEXT NOT NULL,       -- "bcra" | "indec"
  frequency TEXT NOT NULL,       -- "daily" | "monthly"
  unit      TEXT,                -- "USD" | "ARS" | "ARS/USD"
  metadata  JSONB
);
```

**`series_points`** - Time series data
```sql
CREATE TABLE series_points (
  series_id TEXT REFERENCES series(id),
  ts        DATE NOT NULL,
  value     NUMERIC NOT NULL,
  PRIMARY KEY (series_id, ts)
);
```

## 🚀 Usage

### CLI Commands

```bash
# Update all whitelisted series
pnpm update

# Update specific series
pnpm update -- --series 168.1_T_CAMBIOR_D_0_0_26

# Backfill series for date range
pnpm backfill -- --series 168.1_T_CAMBIOR_D_0_0_26 --from 2024-01-01 --to 2024-01-31

# Force overwrite existing data
pnpm backfill -- --series 168.1_T_CAMBIOR_D_0_0_26 --from 2024-01-01 --force
```

### Scheduler Service

```bash
# Start the scheduler (runs daily at 08:05 AM Argentina time)
pnpm dev
```

### Programmatic Usage

```typescript
import { scheduler } from './src/index.js';

// Start scheduler
scheduler.start();

// Manual update
await scheduler.executeManualUpdate();
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test -- --coverage
```

## 🔍 Monitoring

### Health Checks

- **Health**: `GET /health` - Basic service health
- **Readiness**: `GET /ready` - Database connectivity check

### Logging

The service uses structured JSON logging with context:

```json
{
  "level": "info",
  "time": "2024-01-15T08:05:00.000Z",
  "service": "ingestor",
  "seriesId": "168.1_T_CAMBIOR_D_0_0_26",
  "msg": "Fetch and store operation completed",
  "pointsFetched": 5,
  "pointsStored": 5,
  "duration": 1250
}
```

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
pnpm install

# Start database
docker-compose -f infrastructure/docker-compose.yml up -d

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Build project
pnpm build
```

### Code Quality

- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting
- **TypeScript**: Strict mode with comprehensive type checking
- **Vitest**: Unit testing framework

## 🚨 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker-compose -f infrastructure/docker-compose.yml ps

# Check database logs
docker-compose -f infrastructure/docker-compose.yml logs postgres
```

**API Rate Limiting**
- The service includes automatic retries with exponential backoff
- Check logs for retry attempts and adjust `HTTP_RETRIES` if needed

**Invalid Series ID**
- Verify series IDs in the [Datos Argentina explorer](https://datos.gob.ar/series)
- Update `SERIES_WHITELIST` with valid IDs

**Environment Validation Errors**
- Check `.env` file format and required variables
- See `.env.example` for reference

### Logs

```bash
# View service logs
pnpm dev

# View database logs
docker-compose -f infrastructure/docker-compose.yml logs postgres

# View all container logs
docker-compose -f infrastructure/docker-compose.yml logs
```

## 📊 Performance

- **Idempotent Upserts**: Efficient handling of duplicate data
- **Batch Processing**: Processes data in configurable batches
- **Connection Pooling**: PostgreSQL connection pool for optimal performance
- **Retry Logic**: Exponential backoff with jitter for API resilience

## 🔒 Security & Hardening

- **TLS Verification**: Full TLS certificate verification in production
- **CA Bundle Support**: Optional additional CA certificates for external APIs
- **Circuit Breaker**: Automatic failover between providers (BCRA → Datos Argentina)
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **Error Handling**: Secure error messages without sensitive data exposure

### TLS Configuration

The service supports additional CA certificates for external APIs:

```bash
# Set CA bundle path
export BCRA_CA_BUNDLE_PATH=/app/certs/bcra-chain.pem

# Extract BCRA certificate chain
openssl s_client -showcerts -connect api.bcra.gob.ar:443 -servername api.bcra.gob.ar < /dev/null 2>/dev/null | openssl x509 -outform PEM > bcra-chain.pem
```

### Circuit Breaker

Automatic failover configuration:
- **Primary Provider**: BCRA (configurable)
- **Fallback Provider**: Datos Argentina
- **Failure Threshold**: 5 failures in 10 minutes
- **Cooldown Period**: 15 minutes
- **Environment Variables**: `BREAKER_FAILURE_THRESHOLD`, `BREAKER_WINDOW_MS`, `BREAKER_OPEN_MS`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Create an issue with detailed information

---

**Built with ❤️ for Argentina's data infrastructure**