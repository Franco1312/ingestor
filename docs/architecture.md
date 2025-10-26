# Architecture Guide

## System Architecture

The Ingestor service follows Clean Architecture principles with clear separation of concerns and Clean Code practices.

## Clean Code Implementation

### **Core Principles Applied**

1. **Single Responsibility Principle**: Each class has one reason to change
2. **DRY (Don't Repeat Yourself)**: Eliminate code duplication
3. **KISS (Keep It Simple)**: Prefer simple solutions over complex ones
4. **One Class Per File**: Never put multiple classes in the same file
5. **Modular Methods**: Break large functions into smaller, focused methods
6. **Self-Documenting Code**: No comments needed - code explains itself

## Clean Architecture Implementation

```
src/
├── domain/           # Business logic and entities
│   ├── entities/     # Core business objects
│   ├── ports/        # Interface definitions
│   ├── services/     # Domain services
│   └── utils/        # Domain utilities
├── application/      # Use cases and business rules
│   └── usecases/     # Application logic
├── infrastructure/   # External concerns
│   ├── config/       # Configuration management
│   ├── db/          # Database layer
│   ├── http/        # HTTP clients
│   └── log/         # Logging
└── interfaces/      # External interfaces
    └── cli/         # Command-line interfaces
```

## Key Components

### 1. HTTP Clients

Handle external API communication with proper error handling.

### 2. Repository Pattern

Abstracts database operations with clear interfaces and implementations.

### 3. Use Cases

Encapsulates business logic and coordinates between domain and infrastructure layers.

### 4. Series Mapping System

Maps external API IDs to internal series IDs, providing a whitelist for which series to process.

## Data Flow

### Series Population Flow

1. **CLI command** `populate-series` with provider argument
2. **Fetch available series** from BCRA API (Monetarias or Cambiarias)
3. **Match against series_mappings** table (whitelist)
4. **Create or update series** in database with metadata
5. **Return summary** with created/updated series

### Backfill Flow (BCRA Monetarias)

1. **CLI command** `backfill` with date range
2. **Load all BCRA Monetarias mappings** from database
3. **For each mapping**:
   - Fetch historical data from BCRA API with pagination
   - Normalize data format to `{ ts, value }`
   - Store in database with idempotent upserts
   - Handle duplicates gracefully
4. **Return summary** with statistics

### Backfill Flow (BCRA Cambiarias)

1. **CLI command** `backfill-cambiarias`
2. **Load all BCRA Cambiarias mappings** from database
3. **For each mapping**:
   - Fetch exchange rate data from BCRA API
   - Normalize data format to `{ ts, value }`
   - Store in database with idempotent upserts
   - Handle duplicates gracefully
4. **Return summary** with statistics

## Design Patterns

### Repository Pattern

- **Interface**: `ISeriesRepository`, `ISeriesMappingRepository`
- **Implementation**: Database-specific implementations
- **Benefits**: Testability, flexibility, clean separation

### Use Case Pattern

- **Application Logic**: `PopulateBcraSeriesUseCase`, `BackfillBcraSeriesUseCase`, `BackfillBcraCambiariasUseCase`
- **Coordination**: Between domain and infrastructure
- **Benefits**: Business logic encapsulation, testability

## Error Handling

- **Comprehensive Logging**: Structured logs with JSON format for debugging and monitoring
- **Graceful Degradation**: Continue processing other series on individual failures
- **Validation**: Input validation at CLI level and use case level

## Monitoring & Observability

### Structured Logging

All operations are logged with structured JSON format for easy parsing and analysis.

### Key Metrics

- **Data Points Processed**: Total points fetched and stored
- **API Response Times**: Latency to external APIs
- **Error Rates**: Failed requests and processing errors
- **Database Performance**: Query execution times
