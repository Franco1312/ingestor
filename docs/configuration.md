# Configuration Guide

## Environment Variables

### Database Configuration

```bash
# Database connection
DATABASE_URL=postgresql://user:pass@localhost:5433/ingestor
```

### External Services

```bash
# BCRA APIs
BCRA_V3_BASE=https://api.bcra.gob.ar
BCRA_CAMBIARIAS_BASE=https://api.bcra.gob.ar/estadisticas/v3.0/Cambiarias

# DolarApi
DOLARAPI_BASE=https://api.dolarapi.com/v1/dolares

# Datos Argentina
DATOS_SERIES_BASE=https://apis.datos.gob.ar/series/api
```

### Provider Configuration

```bash
# Primary and fallback providers
PRIMARY_PROVIDER=BCRA_MONETARIAS
FALLBACK_PROVIDER=DATOS_SERIES

# Provider chain configuration
PROVIDER_CHAIN_ENABLED=true
```

### HTTP Configuration

```bash
# Request timeouts and retries
HTTP_TIMEOUT_MS=20000
HTTP_RETRIES=3
HTTP_BACKOFF_BASE_MS=250
HTTP_BACKOFF_FACTOR=2
HTTP_BACKOFF_MAX_MS=8000
```

### Application Settings

```bash
# Timezone configuration
APP_TIMEZONE=America/Argentina/Buenos_Aires

# Logging level
LOG_LEVEL=info
```

### Circuit Breaker Configuration

```bash
# Circuit breaker settings
BREAKER_FAILURE_THRESHOLD=5
BREAKER_WINDOW_MS=600000
BREAKER_OPEN_MS=900000
```

### TLS Configuration (Production)

```bash
# CA bundle for production
BCRA_CA_BUNDLE_PATH=/app/certs/bcra-chain.pem
```

## Configuration Files

### Local Environment (`src/infrastructure/config/environments/local.ts`)

```typescript
export const localConfig = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5433/ingestor'
  },
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 20000,
      retries: 3
    },
    dolarApi: {
      baseUrl: 'https://api.dolarapi.com/v1/dolares',
      timeout: 10000,
      retries: 2
    }
  }
};
```

### Production Environment (`src/infrastructure/config/environments/production.ts`)

```typescript
export const productionConfig = {
  database: {
    url: process.env.DATABASE_URL
  },
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 30000,
      retries: 5,
      caBundle: process.env.BCRA_CA_BUNDLE_PATH
    }
  }
};
```

## Series Configuration

### Database Schema

The service maintains a catalog of series in the `series` table:

```sql
-- BCRA Series
INSERT INTO series (id, source, frequency, unit, metadata) VALUES
('1', 'bcra', 'daily', 'USD', '{"bcra_idVariable": 1, "description": "Reservas Internacionales"}'),
('15', 'bcra', 'daily', 'ARS', '{"bcra_idVariable": 15, "description": "Base Monetaria"}');

-- DolarApi Series
INSERT INTO series (id, source, frequency, unit, metadata) VALUES
('dolarapi.mep_ars', 'dolarapi', 'daily', 'ARS/USD', '{"description": "Dólar MEP"}'),
('dolarapi.ccl_ars', 'dolarapi', 'daily', 'ARS/USD', '{"description": "Dólar CCL"}'),
('dolarapi.blue_ars', 'dolarapi', 'daily', 'ARS/USD', '{"description": "Dólar Blue"}');
```

### Series Mappings

External to internal ID mappings are stored in the `series_mappings` table:

```sql
INSERT INTO series_mappings (internal_series_id, external_series_id, provider_name) VALUES
('1', '1', 'BCRA_MONETARIAS'),
('bcra.leliq_total_ars', '53', 'BCRA_MONETARIAS'),
('dolarapi.mep_ars', 'mep', 'DOLARAPI');
```

## Docker Configuration

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: ingestor
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    ports:
      - '5433:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/db/init:/docker-entrypoint-initdb.d

  ingestor:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:pass@postgres:5432/ingestor
    depends_on:
      postgres:
        condition: service_healthy
```

### Environment-specific Configuration

- **Local**: Uses `NODE_ENV=local` for development settings
- **Production**: Uses `NODE_ENV=production` for production settings
- **Staging**: Uses `NODE_ENV=staging` for staging settings

## Security Considerations

### TLS Configuration

For production deployments:
1. Configure proper CA bundles for external APIs
2. Use environment variables for sensitive configuration
3. Implement proper authentication and authorization
4. Regular security updates and monitoring

### Database Security

1. Use strong passwords and connection strings
2. Implement regular backup strategies
3. Monitor database performance and access
4. Use connection pooling for efficiency
