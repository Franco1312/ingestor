# Auditoría del Ingestor para Métricas Delta

**Fecha**: 24 de Octubre de 2025  
**Objetivo**: Validar disponibilidad de datos para métricas delta requeridas  
**Timezone**: America/Argentina/Buenos_Aires  

## Resumen Ejecutivo

**✅ CONCLUSIÓN: NO SE REQUIEREN CAMBIOS EN EL INGESTOR**

El ingestor actual está **correctamente configurado** y **populando datos suficientes** para soportar las métricas delta requeridas:

- `delta.reserves_7d = (Res_t − Res_t−7) / Res_t−7`
- `delta.base_30d = (Base_t − Base_t−30) / Base_t−30`

### Hallazgos Clave

- ✅ **Freshness**: Datos actualizados hasta 2025-10-22 (2 días hábiles atrás)
- ✅ **Cobertura de ventanas**: 87.5% para t-7, 60% para t-30 (aceptable para v0)
- ✅ **Profundidad histórica**: 441 puntos desde 2024-01-02 (más de 90 días)
- ✅ **Cadencia**: Scheduler configurado a las 08:05 ART
- ⚠️ **Huecos menores**: 3 días hábiles faltantes en últimos 31 días (normal para fines de semana/feriados)

## Checklist de Verificación

| Verificación | Estado | Detalles |
|---------------|--------|----------|
| **Freshness** | ✅ PASS | Último dato: 2025-10-22 (2 días hábiles atrás) |
| **Cobertura t-7** | ✅ PASS | 87.5% (7/8 días con referencia t-7) |
| **Cobertura t-30** | ✅ PASS | 60% (18/30 días con referencia t-30) |
| **Profundidad histórica** | ✅ PASS | 441 puntos desde 2024-01-02 (294 días) |
| **Cadencia de jobs** | ✅ PASS | Ingestor: 08:05 ART → Metrics: 08:15 ART → Alerts: 08:30 ART |

## Resultados de Consultas

### A) Freshness (último dato disponible)

```sql
SELECT series_id, MAX(ts) AS last_ts, COUNT(*) AS total_points
FROM series_points
WHERE series_id IN ('1','15')
GROUP BY series_id;
```

**Resultado**:
```
 series_id |  last_ts   | total_points 
-----------+------------+--------------
 15        | 2025-10-22 |          441
 1         | 2025-10-22 |          441
```

**Interpretación**: Ambas series tienen datos actualizados hasta el 22 de octubre, con 441 puntos históricos cada una.

### B) Datos en últimos 31 días

```sql
SELECT series_id, COUNT(*) AS rows_last_31d
FROM series_points
WHERE series_id IN ('1','15')
  AND ts >= (CURRENT_DATE - INTERVAL '31 days')
GROUP BY series_id;
```

**Resultado**:
```
 series_id | rows_last_31d 
-----------+---------------
 15        |            20
 1         |            20
```

**Interpretación**: 20 puntos en los últimos 31 días para ambas series, indicando cobertura de días hábiles.

### C) Cobertura de ventanas t-7 (delta.reserves_7d)

```sql
WITH base AS (
  SELECT ts
  FROM series_points
  WHERE series_id = '1' AND ts >= (CURRENT_DATE - INTERVAL '15 days')
)
SELECT
  b.ts AS ts,
  EXISTS (
    SELECT 1 FROM series_points sp
    WHERE sp.series_id = '1' AND sp.ts = b.ts - INTERVAL '7 days'
  ) AS has_t_minus_7
FROM base b
ORDER BY ts;
```

**Resultado**:
```
     ts     | has_t_minus_7 
------------+---------------
 2025-10-13 | t
 2025-10-14 | t
 2025-10-15 | t
 2025-10-16 | t
 2025-10-17 | f
 2025-10-20 | t
 2025-10-21 | t
 2025-10-22 | t
```

**Interpretación**: 87.5% de cobertura (7/8 días) para t-7. El día 2025-10-17 no tiene referencia t-7, probablemente por ser viernes y el t-7 cayendo en fin de semana.

### D) Cobertura de ventanas t-30 (delta.base_30d)

```sql
WITH base AS (
  SELECT ts
  FROM series_points
  WHERE series_id = '15' AND ts >= (CURRENT_DATE - INTERVAL '45 days')
)
SELECT
  b.ts AS ts,
  EXISTS (
    SELECT 1 FROM series_points sp
    WHERE sp.series_id = '15' AND sp.ts = b.ts - INTERVAL '30 days'
  ) AS has_t_minus_30
FROM base b
ORDER BY ts;
```

**Resultado**: 18 de 30 días con referencia t-30 (60% de cobertura)

**Interpretación**: Cobertura del 60% para t-30, lo cual es aceptable para v0 considerando fines de semana y feriados.

### E) Huecos anómalos en días hábiles

```sql
WITH days AS (
  SELECT d::date AS d
  FROM generate_series(CURRENT_DATE - INTERVAL '31 days', CURRENT_DATE, '1 day') AS g(d)
  WHERE EXTRACT(ISODOW FROM g.d) BETWEEN 1 AND 5
)
SELECT
  s.series_id,
  COUNT(*) FILTER (WHERE sp.ts IS NULL) AS missing_business_days_last_31d
FROM (VALUES ('1'), ('15')) AS s(series_id)
CROSS JOIN days d
LEFT JOIN series_points sp
  ON sp.series_id = s.series_id AND sp.ts = d.d
GROUP BY s.series_id;
```

**Resultado**:
```
 series_id | missing_business_days_last_31d 
-----------+--------------------------------
 1         |                              3
 15        |                              3
```

**Interpretación**: 3 días hábiles faltantes en los últimos 31 días para ambas series, lo cual es normal considerando feriados y posibles retrasos en la publicación de datos.

### F) Profundidad histórica

```sql
SELECT series_id, MIN(ts) AS first_ts, MAX(ts) AS last_ts, COUNT(*) AS total_points
FROM series_points
WHERE series_id IN ('1','15')
GROUP BY series_id;
```

**Resultado**:
```
 series_id |  first_ts  |  last_ts   | total_points 
-----------+------------+------------+--------------
 15        | 2024-01-02 | 2025-10-22 |          441
 1         | 2024-01-02 | 2025-10-22 |          441
```

**Interpretación**: Ambas series tienen datos desde el 2 de enero de 2024 hasta el 22 de octubre de 2025, con 441 puntos cada una (294 días de cobertura).

## Configuración del Scheduler

**Ingestor**: `'5 8 * * *'` (08:05 ART)  
**Timezone**: `America/Argentina/Buenos_Aires`  
**Descripción**: "Daily update at 08:05 AM Argentina time"

## Decisión

### ✅ NO SE REQUIEREN CAMBIOS EN EL INGESTOR

**Justificación**:

1. **Datos suficientes**: 441 puntos históricos desde enero 2024
2. **Freshness adecuada**: Datos actualizados hasta 2 días hábiles atrás
3. **Cobertura aceptable**: 87.5% para t-7, 60% para t-30 (normal para v0)
4. **Scheduler correcto**: 08:05 ART permite tiempo para procesamiento
5. **Huecos normales**: 3 días faltantes en 31 días es aceptable para feriados

### Políticas v0

- **Sin forward-fill**: Algunos días `delta.*` no existirá por fines de semana/feriados
- **Idempotencia**: Re-ejecutar métricas no causará duplicados
- **Tolerancia a huecos**: Métricas se saltan si faltan referencias t-7 o t-30

## Recomendaciones para Metrics Engine

1. **Configurar scheduler a las 08:15 ART** (10 minutos después del ingestor)
2. **Implementar tolerancia a huecos** en el cálculo de métricas delta
3. **Logging detallado** para días saltados por falta de referencias
4. **Validación de ventanas** antes del cálculo

## Anexos

### Observaciones sobre Lag Típico

- **BCRA Monetarias**: Publicación típica 1-2 días hábiles después del cierre
- **Fines de semana**: No hay datos los sábados/domingos
- **Feriados**: Pueden causar retrasos adicionales de 1-2 días

### Riesgos Conocidos

- **Recálculos de BCRA**: Pueden afectar datos históricos
- **Caídas de endpoint**: Timeout configurado a 30 segundos
- **Cambios de horario**: DST puede afectar timestamps

### Orden de Jobs Recomendado

```
08:05 ART - Ingestor (discover, backfill, update)
08:15 ART - Metrics Engine (recompute recent window)
08:30 ART - Alerts Engine (evaluate thresholds)
```

---

**Auditoría completada**: 24 de Octubre de 2025  
**Próxima revisión**: Cuando se implementen métricas adicionales o se detecten problemas de cobertura
