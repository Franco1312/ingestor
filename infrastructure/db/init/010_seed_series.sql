-- Seed data for common Argentina time series
-- These are example series IDs - verify actual IDs in the official Datos Argentina explorer

INSERT INTO series (id, source, frequency, unit, metadata) VALUES
  -- BCRA (Central Bank) series
  ('168.1_T_CAMBIOR_D_0_0_26', 'bcra', 'daily', 'ARS/USD', '{"description": "Official USD exchange rate (wholesale)", "source_url": "https://apis.datos.gob.ar/series/api/series?ids=168.1_T_CAMBIOR_D_0_0_26"}'),
  ('92.2_RESERVAS_IRES_0_0_32_40', 'bcra', 'daily', 'USD', '{"description": "Gross international reserves", "source_url": "https://apis.datos.gob.ar/series/api/series?ids=92.2_RESERVAS_IRES_0_0_32_40"}'),
  ('143.1_MONETARIO_0_0_2_3', 'bcra', 'daily', 'ARS', '{"description": "Monetary base", "source_url": "https://apis.datos.gob.ar/series/api/series?ids=143.1_MONETARIO_0_0_2_3"}'),
  
  -- INDEC (Statistics Institute) series - example monthly series
  ('143.1_INFLACION_0_0_1_3', 'indec', 'monthly', 'index', '{"description": "Consumer Price Index", "source_url": "https://apis.datos.gob.ar/series/api/series?ids=143.1_INFLACION_0_0_1_3"}')
ON CONFLICT (id) DO UPDATE SET
  source = EXCLUDED.source,
  frequency = EXCLUDED.frequency,
  unit = EXCLUDED.unit,
  metadata = EXCLUDED.metadata;

-- Add more series as needed by updating this file or using the CLI
