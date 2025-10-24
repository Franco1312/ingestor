# API Endpoints Documentation

## External API Integration

This document describes the external APIs integrated with the Ingestor service.

## BCRA Monetarias v3 API

**Base URL**: `https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias`

### Get Available Variables

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

### Get Variable Data

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

### API Parameters

- **`desde`**: Start date (YYYY-MM-DD)
- **`hasta`**: End date (YYYY-MM-DD)
- **`limit`**: Page size (default: 1000)
- **`offset`**: Page offset for pagination

## BCRA Cambiarias v3 API

**Base URL**: `https://api.bcra.gob.ar/estadisticas/v3.0/Cambiarias`

Exchange rate data from Argentina's Central Bank.

## DolarApi

**Base URL**: `https://api.dolarapi.com/v1/dolares`

Financial FX rates including MEP, CCL, and Blue dollar.

## INDEC via Datos Argentina

**Base URL**: `https://apis.datos.gob.ar/series/api`

Economic indicators from Argentina's National Statistics Institute.

## Error Handling

All APIs implement:
- **Retry Logic**: Exponential backoff with jitter
- **Circuit Breaker**: Automatic failover on repeated failures
- **Timeout Configuration**: Configurable request timeouts
- **Health Checks**: Regular API availability monitoring
