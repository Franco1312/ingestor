# API Endpoints Documentation

## External API Integration

This document describes the external APIs integrated with the Ingestor service.

## BCRA Monetarias API

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

## BCRA Cambiarias API

**Base URL**: `https://api.bcra.gob.ar/estadisticascambiarias/v1.0`

### Get Available Currencies

```http
GET https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Maestros/Divisas
```

**Response**:
```json
{
  "status": 200,
  "results": [
    {
      "codigo": "USD",
      "denominacion": "DÓLAR"
    },
    {
      "codigo": "EUR",
      "denominacion": "EURO"
    }
  ]
}
```

### Get Exchange Rate Data

```http
GET https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Datos/Divisas/{codigo}/series/{serie}/latest?limit=100
```

**Parameters**:
- **`codigo`**: Currency code (e.g., USD, EUR)
- **`serie`**: Series identifier (e.g., 200)
- **`limit`**: Number of records to retrieve

**Response**:
```json
{
  "status": 200,
  "results": [
    {
      "fecha": "2024-10-26",
      "valor": 950.0
    }
  ]
}
```

## Error Handling

All APIs implement:
- **Timeout Configuration**: 30s for local, 20s for production
- **Health Checks**: Regular API availability monitoring
- **SSL/TLS**: Secure connections with optional CA bundle

## Rate Limits

- **BCRA Monetarias**: No official rate limit specified
- **BCRA Cambiarias**: No official rate limit specified

## Authentication

None required. All APIs are publicly accessible.
