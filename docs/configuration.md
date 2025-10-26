# Configuration Guide

## Environment Variables

### Database Configuration

```bash
# Database connection
DATABASE_URL=postgresql://user:pass@localhost:5433/ingestor
```

### BCRA APIs Configuration

```bash
# BCRA Monetarias API (optional, has defaults)
BCRA_CA_BUNDLE_PATH=/path/to/ca-bundle.pem

# BCRA Cambiarias API (optional, has defaults)
BCRA_CA_BUNDLE_PATH=/path/to/ca-bundle.pem
```

### Application Configuration

```bash
# Logging level (optional, defaults to 'info' for local, 'warn' for production)
LOG_LEVEL=info
```

## Configuration Files

The configuration is loaded based on the `NODE_ENV` environment variable:

- **`local`**: Development environment with verbose logging
- **`staging`**: Staging environment with info-level logging
- **`production`**: Production environment with warn-level logging

### Local Environment (`src/infrastructure/config/environments/local.ts`)

```typescript
export const localConfig: EnvironmentConfig = {
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 30000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    bcraCambiarias: {
      baseUrl: 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0',
      timeout: 30000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  app: {
    logLevel: 'info',
  },
};
```

### Staging Environment (`src/infrastructure/config/environments/staging.ts`)

```typescript
export const stagingConfig: EnvironmentConfig = {
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 20000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    bcraCambiarias: {
      baseUrl: 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0',
      timeout: 20000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  app: {
    logLevel: 'info',
  },
};
```

### Production Environment (`src/infrastructure/config/environments/production.ts`)

```typescript
export const productionConfig: EnvironmentConfig = {
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 20000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    bcraCambiarias: {
      baseUrl: 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0',
      timeout: 20000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  app: {
    logLevel: 'warn',
  },
};
```

## Series Configuration

### Database Schema

The service maintains a catalog of series in the `series` table:

```sql
-- BCRA Monetarias Series
INSERT INTO series (id, source, frequency, unit, metadata) VALUES
('1', 'bcra', 'daily', 'USD', '{"bcra_idVariable": 1, "description": "Reservas Internacionales"}'),
('15', 'bcra', 'daily', 'ARS', '{"bcra_idVariable": 15, "description": "Base Monetaria"}');

-- BCRA Cambiarias Series
INSERT INTO series (id, source, frequency, unit, metadata) VALUES
('bcra.cambiarias.usd', 'bcra', 'daily', 'ARS', '{"moneda": "USD", "description": "Cotización Dólar USD"}'),
('bcra.cambiarias.eur', 'bcra', 'daily', 'ARS', '{"moneda": "EUR", "description": "Cotización Euro"}');
```

### Series Mappings

External to internal ID mappings are stored in the `series_mappings` table:

```sql
INSERT INTO series_mappings (internal_series_id, external_series_id, provider_name) VALUES
('1', '1', 'BCRA_MONETARIAS'),
('15', '15', 'BCRA_MONETARIAS'),
('bcra.cambiarias.usd', 'USD', 'BCRA_CAMBIARIAS'),
('bcra.cambiarias.eur', 'EUR', 'BCRA_CAMBIARIAS');
```

## Docker Configuration

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
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

## Security Considerations

### Database Security

1. Use strong passwords and connection strings
2. Implement regular backup strategies
3. Monitor database performance and access
4. Use connection pooling for efficiency

### Production Deployment

1. Configure proper environment variables
2. Use secure database connections
3. Implement monitoring and alerting
4. Regular security updates
