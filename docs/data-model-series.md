# Modelo de Datos: Series de Tiempo

## Visión General

El sistema **Ingestor** almacena y gestiona datos económicos de series temporales de Argentina provenientes de fuentes oficiales como BCRA (Banco Central), INDEC y otras instituciones públicas.

El modelo de datos se organiza en **cuatro tablas principales**:
- `series`: Catálogo de series disponibles
- `series_points`: Observaciones históricas de cada serie
- `series_mappings`: Mapeo entre IDs internos y externos de proveedores

---

## Tabla `series`

**Descripción**: Catálogo maestro de todas las series temporales disponibles en el sistema. Cada fila representa un indicador económico único con sus metadatos.

### Campos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | `TEXT PRIMARY KEY` | Identificador único de la serie | `'1'`, `'bcra.cambiarias.usd'` |
| `source` | `TEXT NOT NULL` | Fuente oficial de los datos | `'bcra'`, `'indec'` |
| `frequency` | `TEXT NOT NULL` | Frecuencia de publicación | `'daily'`, `'monthly'` |
| `unit` | `TEXT` | Unidad de medida | `'ARS'`, `'USD'`, `'ARS/USD'` |
| `metadata` | `JSONB` | Metadatos adicionales en JSON | `{"bcra_idVariable": 1, "description": "..."}` |
| `created_at` | `TIMESTAMP` | Fecha de creación del registro | `2025-10-26T19:24:48.949Z` |
| `updated_at` | `TIMESTAMP` | Fecha de última actualización | `2025-10-26T19:24:48.949Z` |

### Descripción Detallada de Campos

#### `id` - Identificador de la Serie

**Tipo**: `TEXT PRIMARY KEY`  
**Requisito**: Obligatorio, único

Es el identificador **interno** de la serie en nuestro sistema. Puede ser:
- Un ID numérico simple: `'1'`, `'15'` (para BCRA Monetarias)
- Un ID descriptivo: `'bcra.cambiarias.usd'`, `'bcra.leliq_total_ars'`

**Reglas**:
- Debe ser único en todo el sistema
- No debe cambiar una vez creado
- Debe ser descriptivo cuando sea posible

**Ejemplos**:
```sql
-- ID numérico de BCRA Monetarias
id = '1'  -- Reservas Internacionales

-- ID descriptivo para Cambiarias
id = 'bcra.cambiarias.usd'  -- Dólar USD

-- ID descriptivo para Leliq
id = 'bcra.leliq_total_ars'  -- Stock de Leliq en ARS
```

#### `source` - Fuente de los Datos

**Tipo**: `TEXT NOT NULL`  
**Requisito**: Obligatorio

Organismo o servicio que provee los datos originales.

**Valores permitidos**:
- `'bcra'`: Banco Central de la República Argentina
- `'indec'`: Instituto Nacional de Estadística y Censos
- `'mintrab'`: Ministerio de Trabajo
- `'afip'`: Administración Federal de Ingresos Públicos

**Ejemplo**:
```sql
source = 'bcra'  -- Datos del Banco Central
```

#### `frequency` - Frecuencia de Publicación

**Tipo**: `TEXT NOT NULL`  
**Requisito**: Obligatorio

Indica con qué periodicidad se actualizan los datos.

**Valores permitidos**:
- `'daily'`: Datos diarios (tipo de cambio, reservas)
- `'monthly'`: Datos mensuales (IPC, empleo)
- `'weekly'`: Datos semanales
- `'quarterly'`: Datos trimestrales (PIB)
- `'yearly'`: Datos anuales

**Ejemplo**:
```sql
frequency = 'daily'  -- Datos publicados diariamente
```

#### `unit` - Unidad de Medida

**Tipo**: `TEXT`  
**Requisito**: Opcional

Unidad en la que se expresan los valores de la serie.

**Valores comunes**:
- `'USD'`: Dólares estadounidenses
- `'ARS'`: Pesos argentinos
- `'ARS/USD'`: Tipo de cambio (pesos por dólar)
- `'percent'`: Porcentaje
- `'index'`: Número índice (base 100)

**Ejemplo**:
```sql
unit = 'ARS'  -- Valores expresados en pesos argentinos
```

#### `metadata` - Metadatos Adicionales

**Tipo**: `JSONB`  
**Requisito**: Opcional

Campos adicionales de apoyo para interpretación, auditoría y trazabilidad.

**Campos comunes**:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `description` | string | Descripción legible del indicador |
| `bcra_idVariable` | number | ID interno de BCRA Monetarias |
| `bcra_categoria` | string | Categoría en la clasificación de BCRA |
| `bcra_description` | string | Descripción provista por BCRA |
| `bcra_codigo` | string | Código ISO de moneda (para Cambiarias) |
| `bcra_denominacion` | string | Denominación oficial (para Cambiarias) |
| `last_populated` | string | Timestamp de última población |

**Ejemplo**:
```json
{
  "description": "Reservas Internacionales del BCRA (en millones de dólares)",
  "bcra_idVariable": 1,
  "bcra_categoria": "Principales Variables",
  "bcra_description": "Reservas Internacionales del BCRA (en millones de dólares - cifras provisorias sujetas a cambio de valuación)",
  "last_populated": "2025-10-26T07:59:34.163Z"
}
```

#### `created_at` - Fecha de Creación

**Tipo**: `TIMESTAMP`  
**Descripción**: Timestamp de cuando se insertó el registro en la tabla

#### `updated_at` - Fecha de Actualización

**Tipo**: `TIMESTAMP`  
**Descripción**: Timestamp de la última modificación de los metadatos

### ¿Cómo se Pobla?

La tabla `series` se puebla mediante el comando:

```bash
npm run populate-series
```

Este comando:
1. Consulta los mappings en `series_mappings` por provider
2. Valida que las series existan en la API externa
3. Extrae metadatos de la API (descripción, categoría, etc.)
4. Inserta o actualiza registros en `series`

---

## Tabla `series_points`

**Descripción**: Observaciones históricas de cada serie. Cada fila representa un punto de dato (fecha + valor) para una serie específica.

### Campos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `series_id` | `TEXT NOT NULL` | Referencia a `series.id` | `'1'` |
| `ts` | `DATE NOT NULL` | Fecha de la observación | `'2024-01-15'` |
| `value` | `NUMERIC NOT NULL` | Valor numérico del indicador | `1500000000` |
| `created_at` | `TIMESTAMP` | Fecha de inserción del registro | `2025-10-26T19:24:48.949Z` |
| `updated_at` | `TIMESTAMP` | Fecha de última actualización | `2025-10-26T19:24:48.949Z` |

### Índices y Constrains

- **Primary Key**: `(series_id, ts)` - Evita duplicados por serie y fecha
- **Foreign Key**: `series_id` → `series.id`
- **Índice**: Sobre `series_id` para consultas eficientes
- **Índice**: Sobre `ts` para filtros por fecha

### Descripción Detallada de Campos

#### `series_id` - Referencia a la Serie

**Tipo**: `TEXT NOT NULL`  
**Requisito**: Obligatorio  
**Foreign Key**: Referencia a `series.id`

Identificador de la serie a la que pertenece esta observación.

**Ejemplo**:
```sql
series_id = '1'  -- Punto para la serie de Reservas Internacionales
```

#### `ts` - Fecha de la Observación

**Tipo**: `DATE NOT NULL`  
**Requisito**: Obligatorio

Fecha del dato económico. **No confundir con `created_at`**:
- `ts`: Fecha del dato económico (cuándo ocurrió)
- `created_at`: Fecha de cuando lo guardamos en el sistema

**Reglas**:
- Usar siempre la fecha provista por la fuente oficial
- No inventar fechas
- No rellenar huecos con ceros

**Ejemplos**:
```sql
-- Datos diarios
ts = '2024-01-15'

-- Datos mensuales (fin de mes)
ts = '2024-01-31'
```

#### `value` - Valor Numérico

**Tipo**: `NUMERIC NOT NULL`  
**Requisito**: Obligatorio

Valor numérico del indicador en la unidad definida en `series.unit`.

**Reglas**:
- Mantener en la unidad original de la fuente
- No convertir unidades (eso se hace en métricas)
- No reescalar valores
- Verificar escala (millones, miles, unidades)

**Ejemplo**:
```sql
-- Base monetaria en millones de ARS
value = 1500000000  -- Representa 1,500,000 millones ARS = 1.5 billones ARS
```

#### `created_at` - Fecha de Inserción

**Tipo**: `TIMESTAMP`  
**Descripción**: Timestamp de cuando se insertó este punto en la base de datos

#### `updated_at` - Fecha de Actualización

**Tipo**: `TIMESTAMP`  
**Descripción**: Timestamp de la última modificación (si se actualiza un valor existente)

### Idempotencia

La combinación `(series_id, ts)` es única. Si se intenta insertar un punto con la misma serie y fecha:
- **Si no existe**: Se inserta un nuevo registro
- **Si ya existe**: Se actualiza el valor (UPSERT)

Esto garantiza idempotencia - se puede ejecutar el mismo proceso múltiples veces sin crear duplicados.

### ¿Cómo se Pobla?

La tabla `series_points` se puebla mediante los comandos:

```bash
# Backfill de datos históricos (último año)
npm run backfill

# Backfill de datos de Cambiarias (último mes)
npm run backfill-cambiarias
```

Estos comandos:
1. Consultan las series en `series_mappings` por provider
2. Determinan el rango de fechas (default o parametrizado)
3. Consultan la API externa correspondiente
4. Normalizan los datos al formato `{ ts, value }`
5. Hacen UPSERT en `series_points` (idempotente)

---

## Tabla `series_mappings`

**Descripción**: Mapea IDs internos de series con IDs externos de proveedores. Actúa como una **whitelist** que define qué series se pueden poblar desde cada provider.

### Campos

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | `SERIAL PRIMARY KEY` | ID autoincremental interno | `1` |
| `internal_series_id` | `TEXT NOT NULL` | ID de la serie en nuestro sistema | `'bcra.cambiarias.usd'` |
| `external_series_id` | `TEXT NOT NULL` | ID en la API externa | `'USD'` |
| `provider_name` | `TEXT NOT NULL` | Nombre del proveedor | `'BCRA_CAMBIARIAS'` |
| `keywords` | `JSONB` | Palabras clave para búsqueda | `["dolar", "usd", "cotizacion"]` |
| `description` | `TEXT` | Descripción de la serie | `'Cotización Dólar USD (ARS)'` |

### Índices y Constrains

- **Primary Key**: `id` (auto-incremental)
- **Unique Constraint**: `(external_series_id, provider_name)` - Un ID externo por provider
- **Índice**: Sobre `internal_series_id` para lookup rápido
- **Índice**: Sobre `provider_name` para filtrar por provider

### Descripción Detallada de Campos

#### `id` - ID Interno

**Tipo**: `SERIAL PRIMARY KEY`  
**Descripción**: ID auto-incremental interno del registro

#### `internal_series_id` - ID Interno de la Serie

**Tipo**: `TEXT NOT NULL`  
**Requisito**: Obligatorio

ID de la serie en nuestro sistema. **Debe coincidir con `series.id`** para que la serie sea poblable.

**Ejemplo**:
```sql
internal_series_id = 'bcra.cambiarias.usd'  -- Misma que series.id
```

#### `external_series_id` - ID en la API Externa

**Tipo**: `TEXT NOT NULL`  
**Requisito**: Obligatorio

ID que usa la API externa para identificar esta serie.

**Ejemplos por provider**:

| Provider | Formato | Ejemplo |
|----------|---------|---------|
| `BCRA_MONETARIAS` | Número (string) | `'1'`, `'15'`, `'53'` |
| `BCRA_CAMBIARIAS` | Código ISO de moneda | `'USD'`, `'EUR'`, `'GBP'` |

**Ejemplo**:
```sql
external_series_id = 'USD'  -- ID en BCRA Cambiarias API
```

#### `provider_name` - Nombre del Proveedor

**Tipo**: `TEXT NOT NULL`  
**Requisito**: Obligatorio

Nombre del proveedor/externo que aloja esta serie.

**Valores permitidos**:
- `'BCRA_MONETARIAS'`: API de BCRA Monetarias v3
- `'BCRA_CAMBIARIAS'`: API de BCRA Cambiarias

**Ejemplo**:
```sql
provider_name = 'BCRA_CAMBIARIAS'
```

#### `keywords` - Palabras Clave

**Tipo**: `JSONB`  
**Requisito**: Opcional

Array de palabras clave para facilitar búsquedas y descubrimiento.

**Ejemplo**:
```json
["dolar", "usd", "cotizacion"]
```

#### `description` - Descripción

**Tipo**: `TEXT`  
**Requisito**: Opcional

Descripción legible de la serie.

**Ejemplo**:
```sql
description = 'Cotización Dólar USD (ARS)'
```

### ¿Cómo se Pobla?

La tabla `series_mappings` se puebla mediante archivos SQL de seed:

```bash
# Las mappings están en infrastructure/db/init/001_series_mappings.sql
```

Este archivo contiene los INSERTs con todos los mappings configurados.

### Relación con Otras Tablas

```
series_mappings.internal_series_id → series.id
```

Una serie **debe existir en `series_mappings`** para poder ser poblada. El workflow es:

1. **Seed de mappings** (001_series_mappings.sql)
2. **Populate series** (npm run populate-series) → Lee mappings y crea registros en `series`
3. **Backfill** (npm run backfill) → Lee mappings, consulta APIs, inserta en `series_points`

---

## Ejemplos de Datos Reales

### Ejemplo 1: Serie de Reservas Internacionales (BCRA Monetarias)

**Tabla `series`**:
```sql
id = '1'
source = 'bcra'
frequency = 'daily'
unit = 'ARS'
metadata = {
  "description": "Reservas Internacionales del BCRA (en millones de dólares)",
  "bcra_idVariable": 1,
  "bcra_categoria": "Principales Variables",
  "bcra_description": "Reservas Internacionales del BCRA (en millones de dólares - cifras provisorias sujetas a cambio de valuación)",
  "last_populated": "2025-10-26T07:59:34.163Z"
}
```

**Tabla `series_mappings`**:
```sql
internal_series_id = '1'
external_series_id = '1'
provider_name = 'BCRA_MONETARIAS'
keywords = ["reservas internacionales", "reservas", "international reserves"]
description = 'Reservas Internacionales del BCRA (en millones de dólares)'
```

**Tabla `series_points`**:
```sql
series_id = '1', ts = '2024-01-15', value = 21500
series_id = '1', ts = '2024-01-16', value = 21480
series_id = '1', ts = '2024-01-17', value = 21520
```

### Ejemplo 2: Serie de Dólar USD (BCRA Cambiarias)

**Tabla `series`**:
```sql
id = 'bcra.cambiarias.usd'
source = 'bcra'
frequency = 'daily'
unit = 'ARS'
metadata = {
  "bcra_codigo": "USD",
  "description": "Cotización Dólar USD (ARS)",
  "last_populated": "2025-10-26T19:24:48.228Z",
  "bcra_denominacion": "DOLAR E.E.U.U."
}
```

**Tabla `series_mappings`**:
```sql
internal_series_id = 'bcra.cambiarias.usd'
external_series_id = 'USD'
provider_name = 'BCRA_CAMBIARIAS'
keywords = ["dolar", "usd", "cotizacion"]
description = 'Cotización Dólar USD (ARS)'
```

**Tabla `series_points`**:
```sql
series_id = 'bcra.cambiarias.usd', ts = '2024-01-15', value = 850.50
series_id = 'bcra.cambiarias.usd', ts = '2024-01-16', value = 852.30
series_id = 'bcra.cambiarias.usd', ts = '2024-01-17', value = 848.90
```

### Ejemplo 3: Serie de Base Monetaria (BCRA Monetarias)

**Tabla `series`**:
```sql
id = '15'
source = 'bcra'
frequency = 'daily'
unit = 'ARS'
metadata = {
  "description": "Base monetaria - Total (en millones de pesos)",
  "bcra_idVariable": 15,
  "bcra_categoria": "Principales Variables",
  "bcra_description": "Base monetaria - Total (en millones de pesos)",
  "last_populated": "2025-10-26T07:59:34.568Z"
}
```

**Tabla `series_mappings`**:
```sql
internal_series_id = '15'
external_series_id = '15'
provider_name = 'BCRA_MONETARIAS'
keywords = ["base monetaria", "monetary base", "base monetaria - total"]
description = 'Base monetaria - Total (en millones de pesos)'
```

**Tabla `series_points`**:
```sql
series_id = '15', ts = '2024-01-15', value = 15200000
series_id = '15', ts = '2024-01-16', value = 15225000
series_id = '15', ts = '2024-01-17', value = 15300000
```

---

## Flujo de Población de Datos

### 1. Setup Inicial (Primera Ejecución)

```bash
# 1. Las mappings ya están en infrastructure/db/init/001_series_mappings.sql
#    (se ejecutan automáticamente al inicializar la BD)

# 2. Poblar el catálogo de series
npm run populate-series

# 3. Hacer backfill de datos históricos
npm run backfill         # BCRA Monetarias (último año)
npm run backfill-cambiarias  # BCRA Cambiarias (último mes)
```

### 2. Actualización Regular

```bash
# Ejecutar backfill diariamente (vía cron)
npm run backfill
npm run backfill-cambiarias
```

El backfill es **idempotente** - puede ejecutarse múltiples veces sin crear duplicados ni errores.

### 3. Agregar Nueva Serie

1. **Agregar mapping** en `infrastructure/db/init/001_series_mappings.sql`
2. **Ejecutar populate-series** para crear la entrada en `series`
3. **Ejecutar backfill** para poblar datos históricos

---

## Relaciones entre Tablas

```
series_mappings
    ↓ (internal_series_id)
series (id)
    ↓ (id)
series_points (series_id)
```

**Flujo**:
1. `series_mappings` define qué series son poblables
2. `series` contiene el catálogo de series
3. `series_points` contiene las observaciones históricas

---

## Constrains y Validaciones

### Constrains de `series`

- `id` es PRIMARY KEY (único)
- `source` debe ser uno de: `'bcra'`, `'indec'`, `'mintrab'`, `'afip'`
- `frequency` debe ser uno de: `'daily'`, `'monthly'`, `'weekly'`, `'quarterly'`, `'yearly'`

### Constrains de `series_points`

- `(series_id, ts)` es PRIMARY KEY (evita duplicados)
- `series_id` es FOREIGN KEY a `series.id`
- `value` debe ser numérico

### Constrains de `series_mappings`

- `(external_series_id, provider_name)` es UNIQUE (un ID externo por provider)
- `internal_series_id` debe coincidir con un `series.id` existente

---

## Buenas Prácticas

### Naming Convention

- **IDs numéricos**: Para BCRA Monetarias (`'1'`, `'15'`)
- **IDs descriptivos**: Para otras series (`'bcra.cambiarias.usd'`)
- Formato: `{source}.{tipo}.{identificador}` cuando sea posible

### Metadata

- Incluir `description` legible en español
- Registrar `last_populated` para auditoría
- Mantener IDs externos sincronizados con la API

### Data Quality

- No rellenar huecos artificialmente en `series_points`
- Usar siempre la fecha provista por la fuente
- Mantener `value` en la unidad original
- No convertir unidades (eso se hace en la capa de métricas)

### Trazabilidad

- Mantener `created_at` y `updated_at` actualizados
- Registrar `last_populated` en metadata
- Documentar cambios en metodología o fuente

---

## Resumen Ejecutivo

| Tabla | Propósito | Ejemplo |
|-------|-----------|---------|
| `series` | Catálogo de series disponibles | 20 series registradas |
| `series_points` | Observaciones históricas | 50,000+ puntos de datos |
| `series_mappings` | Mapeo con APIs externas | 20 mappings configurados |

**Población**:
- `series_mappings`: SQL seeds (001_series_mappings.sql)
- `series`: Comando `populate-series` (usa mappings + APIs)
- `series_points`: Comandos `backfill` (usa mappings + APIs)

**Idempotencia**: Todos los procesos son idempotentes - pueden ejecutarse múltiples veces sin efectos adversos.
