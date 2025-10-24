# Modelo de Datos: Series de Tiempo

## Resumen Ejecutivo

El sistema almacena dos tipos principales de información económica:

- **`series`**: Catálogo de indicadores económicos disponibles, que contiene metadatos como fuente, frecuencia, unidad de medida y descripción de cada serie. Es el "directorio" de qué datos podemos consultar.

- **`series_points`**: Observaciones históricas de cada indicador, con valores numéricos asociados a fechas específicas. Representa la evolución temporal de cada métrica económica.

La separación permite mantener un catálogo estable de indicadores mientras se actualizan constantemente los valores históricos.

## Glosario Rápido

| Término | Significado |
|---------|-------------|
| **Serie (Series)** | Indicador económico identificado (ej: tipo de cambio, inflación) |
| **Observación (Observation)** | Valor numérico de una serie en una fecha específica |
| **Fuente (Source)** | Organismo que publica los datos (BCRA, INDEC, etc.) |
| **Frecuencia (Frequency)** | Periodicidad de publicación (diaria, mensual, etc.) |
| **Unidad (Unit)** | Medida del valor (USD, ARS, ARS/USD, índice) |
| **Punto de la Serie (Series Point)** | Una observación específica (fecha + valor) |
| **Catálogo** | Lista de series disponibles y sus metadatos |
| **Proveedor/Endpoint** | API o servicio que proporciona los datos |
| **ID Externo (External ID)** | Identificador de la serie en la fuente original |

## Tabla `series` — Significado de cada campo

### `id` — Identificador de la Serie
Es el **identificador externo** de la serie tal como lo proporciona la fuente oficial. Por ejemplo:
- `168.1_T_CAMBIOR_D_0_0_26` (Datos Argentina)
- `1` (BCRA Monetarias)

Este ID se usa para consultar la API de la fuente y debe mantenerse estable.

### `source` — Fuente de los Datos
Organismo emisor de la información:
- `bcra`: Banco Central de la República Argentina
- `indec`: Instituto Nacional de Estadística y Censos
- `mintrab`: Ministerio de Trabajo
- `afip`: Administración Federal de Ingresos Públicos

La fuente determina la confiabilidad, frecuencia de actualización y metodología de cálculo.

### `frequency` — Frecuencia de Publicación
- `daily`: Datos diarios (tipo de cambio, reservas)
- `monthly`: Datos mensuales (IPC, empleo)
- `weekly`: Datos semanales
- `quarterly`: Datos trimestrales
- `yearly`: Datos anuales

La frecuencia impacta en la granularidad de análisis posibles y la latencia de actualización.

### `unit` — Unidad de Medida
- `USD`: Dólares estadounidenses
- `ARS`: Pesos argentinos
- `ARS/USD`: Tipo de cambio (pesos por dólar)
- `index`: Número índice (sin unidad específica)

**⚠️ Importante**: No mezclar unidades en cálculos directos. Las conversiones se realizan en la capa de métricas.

### `metadata` — Información Adicional (JSON)
Contiene campos de apoyo para interpretación y auditoría:

- **`source_url`**: URL oficial para consultar la serie
- **`description`**: Descripción legible del indicador
- **`bcra_idVariable`**: ID interno de BCRA Monetarias (cuando aplica)
- **`datos_id`**: ID de la API de Series de Tiempo (cuando aplica)
- **`last_discovered`**: Cuándo se descubrió/validó el ID externo
- **`bcra_description`**: Descripción provista por BCRA

### `created_at` / `updated_at` — Trazabilidad del Catálogo
- `created_at`: Cuándo se agregó la serie al catálogo
- `updated_at`: Cuándo se modificaron los metadatos por última vez

**Cuándo agregar una serie al catálogo:**
- Relevancia económica (impacto en decisiones)
- Frecuencia de actualización (datos actualizados)
- Confiabilidad de la fuente (metodología sólida)
- Disponibilidad de API (acceso programático)

**Buenas prácticas:**
- Mantener descripciones claras y actualizadas
- Registrar ambas fuentes si existen (primaria/fallback)
- Documentar cambios en metodología

## Tabla `series_points` — Significado de cada campo

### `series_id` — Referencia al Catálogo
Vincula cada observación con una serie del catálogo. Debe referenciar un `series.id` existente.

### `ts` — Fecha de la Observación
Timestamp de la observación económica (formato fecha). Representa:
- **Datos diarios**: Día hábil de publicación
- **Datos mensuales**: Fin de mes (ej: IPC de enero se publica en febrero)
- **Datos trimestrales**: Fin del trimestre

**Reglas importantes:**
- No inventar fechas
- No rellenar huecos con ceros
- Usar siempre la fecha provista por la fuente

### `value` — Valor del Indicador
Valor numérico del indicador en la fecha `ts`. Se mantiene en la **unidad original** de la fuente, sin conversiones.

**Advertencias:**
- Verificar escala (millones, miles, unidades)
- No mezclar unidades en cálculos directos
- Las conversiones se realizan en métricas derivadas

### `created_at` / `updated_at` — Trazabilidad de los Datos
- `created_at`: Cuándo el dato entró al sistema
- `updated_at`: Cuándo se modificó por última vez

**No confundir con `ts`**: `ts` es la fecha del dato económico, `created_at` es cuándo lo guardamos.

### Idempotencia y Unicidad
La clave `(series_id, ts)` es única, evitando duplicados. Si se intenta insertar el mismo dato, se actualiza el valor existente.

### Política de Faltantes
Si un día no hay dato, se deja vacío. La agregación/forward-fill ocurre en la capa de métricas, no en `series_points`.

## Ejemplos Concretos con Nuestros Datos Actuales

### 1. Tipo de Cambio Oficial (Diario)
```
ID: 168.1_T_CAMBIOR_D_0_0_26
Fuente: BCRA (vía Datos Argentina)
Frecuencia: Diaria
Unidad: ARS/USD
```

**¿Qué mide?** Precio del dólar en el mercado mayorista, publicado diariamente por el BCRA.

**Observaciones típicas:**
- 2024-01-15: 850.50 (pesos por dólar)
- 2024-01-16: 852.30
- 2024-01-17: 848.90

**Interpretación:** Variación diaria del tipo de cambio oficial.

### 2. Reservas Internacionales (Diario)
```
ID: 92.2_RESERVAS_IRES_0_0_32_40
Fuente: BCRA
Frecuencia: Diaria
Unidad: USD
```

**¿Qué mide?** Reservas de divisas del BCRA en millones de dólares.

**Observaciones típicas:**
- 2024-01-15: 21,500 (millones USD)
- 2024-01-16: 21,480
- 2024-01-17: 21,520

**Interpretación:** Evolución diaria de las reservas internacionales.

### 3. Base Monetaria (Diario)
```
ID: 143.1_MONETARIO_0_0_2_3
Fuente: BCRA
Frecuencia: Diaria
Unidad: ARS
```

**¿Qué mide?** Base monetaria en pesos argentinos.

**Observaciones típicas:**
- 2024-01-15: 15,200,000 (millones ARS)
- 2024-01-16: 15,250,000
- 2024-01-17: 15,300,000

**Interpretación:** Evolución de la liquidez monetaria.

### 4. IPC (Mensual)
```
ID: 143.1_INFLACION_0_0_1_3
Fuente: INDEC
Frecuencia: Mensual
Unidad: index
```

**¿Qué mide?** Índice de Precios al Consumidor (base 100).

**Observaciones típicas:**
- 2024-01-31: 125.4 (índice)
- 2024-02-29: 128.7
- 2024-03-31: 132.1

**Interpretación:** Inflación mensual acumulada.

### 5. Reservas BCRA (Directo)
```
ID: 1
Fuente: BCRA Monetarias
Frecuencia: Diaria
Unidad: USD
```

**¿Qué mide?** Reservas internacionales obtenidas directamente de la API de BCRA.

**Diferencias de frecuencia:**
- **Diaria**: Permite análisis de tendencias y volatilidad
- **Mensual**: Útil para análisis estacionales y comparaciones

**Diferencias de unidad:**
- **USD**: Valores absolutos en dólares
- **ARS**: Valores en pesos (considerar inflación)
- **ARS/USD**: Tipo de cambio (relación entre monedas)
- **index**: Número índice (comparación con base)

## Cómo usar estos datos en análisis

### Análisis Simples Posibles
- **Variación diaria/semanal/mensual**: Comparar valores consecutivos
- **Promedios móviles**: Suavizar tendencias
- **Ratios**: Reservas/Base Monetaria (convertir a USD usando tipo de cambio)
- **Señales/Alertas**: Caída sostenida, emisión acelerada, respaldo bajo

### Ejemplo de Ratio Reservas/Base Monetaria
1. Obtener reservas en USD
2. Obtener base monetaria en ARS
3. Obtener tipo de cambio ARS/USD
4. Convertir base monetaria a USD: `base_monetaria_ars / tipo_cambio`
5. Calcular ratio: `reservas_usd / base_monetaria_usd`

### Qué NO hacer en `series_points`
- ❌ No convertir unidades (eso va en métricas)
- ❌ No calcular métricas derivadas (eso va en `metrics_points`)
- ❌ No reescalar valores
- ❌ No rellenar huecos artificialmente

## Buenas Prácticas y Convenciones

### Mantenimiento de Datos
- Mantener `value` en la **unidad original** de la fuente
- Registrar **ambos IDs externos** cuando tengamos fuente primaria y fallback
- Documentar en `metadata.description` el significado del indicador
- Especificar si es fin de día/fin de mes

### Calidad de Datos
- Usar siempre la fecha provista por la fuente (no inferir)
- No forzar continuidad artificial (sin "rellenos" en `series_points`)
- Validar que las unidades sean consistentes
- Documentar cambios en metodología

### Trazabilidad
- Mantener `source_url` actualizada
- Registrar `last_discovered` para auditoría
- Documentar fuentes primarias y fallback

## Preguntas Frecuentes (FAQ)

### ¿Por qué veo huecos en fechas diarias?
No hubo publicación oficial, feriado bancario, o ajuste tardío de la fuente.

### ¿Por qué el IPC es mensual y no diario?
La fuente (INDEC) publica el índice mensual. No existe un IPC diario oficial.

### ¿Puedo sumar series con unidades distintas?
No directamente. Primero normalizar en la capa de métricas usando conversiones apropiadas.

### ¿Para qué sirve `created_at` vs `ts`?
- `ts`: Fecha del dato económico (cuándo ocurrió)
- `created_at`: Cuándo lo guardamos en nuestro sistema

### ¿Qué hago si una serie cambia de metodología?
Documentar el cambio en `metadata` y considerar crear una nueva serie si el cambio es significativo.

## Apéndice: Trazabilidad y Fuentes

### Fuentes Oficiales

| Fuente | Rol | Frecuencia | Ejemplos |
|--------|-----|------------|----------|
| **BCRA Monetarias** | Datos monetarios directos | Diaria | Reservas, base monetaria |
| **BCRA Cambiarias** | Tipo de cambio | Diaria | Tipo de cambio oficial |
| **INDEC** | Estadísticas económicas | Mensual/Trimestral | IPC, empleo, PIB |
| **Datos Argentina** | Agregador de APIs | Variable | Series consolidadas |

### Campos de Auditoría en `metadata`
- `source_url`: URL oficial para verificación
- `last_discovered`: Timestamp de descubrimiento
- `bcra_idVariable`: ID interno de BCRA
- `datos_id`: ID de Datos Argentina
- `description`: Descripción legible del indicador

### Verificación de Integridad
- Validar que `source_url` sea accesible
- Verificar que `bcra_idVariable` corresponda al ID real
- Confirmar que `datos_id` sea válido en la API
- Mantener `last_discovered` actualizado

## Nuevas Series Agregadas

### Series de Pasivos Remunerados (BCRA Monetarias)
- **`bcra.leliq_total_ars`**: Stock de Leliq (millones de ARS, diario)
- **`bcra.pases_pasivos_total_ars`**: Stock de Pases pasivos (millones de ARS, diario)
- **`bcra.pases_activos_total_ars`**: Stock de Pases activos (millones de ARS, diario)

### Series de Comercio Exterior (INDEC via Datos Argentina)
- **`indec.trade_balance_usd_m`**: Saldo comercial de bienes (USD, mensual)
- **`indec.exports_usd_m`**: Exportaciones de bienes (USD, mensual)
- **`indec.imports_usd_m`**: Importaciones de bienes (USD, mensual)

### Series de FX Financiero (DolarApi)
- **`dolarapi.mep_ars`**: Dólar MEP (ARS/USD, diario)
- **`dolarapi.ccl_ars`**: Dólar CCL (ARS/USD, diario)
- **`dolarapi.blue_ars`**: Dólar Blue (ARS/USD, diario)

### Series de FX Oficial (BCRA Cambiarias)
- **`bcra.usd_official_ars`**: Tipo de cambio oficial mayorista (ARS/USD, diario)

### Características de las Nuevas Series
- **Fuentes**: BCRA Monetarias, BCRA Cambiarias, INDEC, DolarApi
- **Frecuencias**: Diaria (FX y pasivos), Mensual (comercio)
- **Unidades**: ARS, USD, ARS/USD, index
- **Descubrimiento**: Automático via API discovery
- **Fallbacks**: Configurados para fuentes alternativas cuando aplica
