-- Add trade balance series via Datos Argentina
-- Monthly trade balance data from INDEC

-- Trade Balance (Saldo Comercial) series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'indec.trade_balance_usd_m',
  'indec',
  'monthly',
  'USD',
  '{
    "provider_primary": "datos_series",
    "description": "Saldo comercial de bienes (USD, mensual)",
    "datos_id": null,
    "discoverable": true,
    "last_discovered": null,
    "source_url": "https://apis.datos.gob.ar/series/api"
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Exports series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'indec.exports_usd_m',
  'indec',
  'monthly',
  'USD',
  '{
    "provider_primary": "datos_series",
    "description": "Exportaciones de bienes (USD, mensual)",
    "datos_id": null,
    "discoverable": true,
    "last_discovered": null,
    "source_url": "https://apis.datos.gob.ar/series/api"
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Imports series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'indec.imports_usd_m',
  'indec',
  'monthly',
  'USD',
  '{
    "provider_primary": "datos_series",
    "description": "Importaciones de bienes (USD, mensual)",
    "datos_id": null,
    "discoverable": true,
    "last_discovered": null,
    "source_url": "https://apis.datos.gob.ar/series/api"
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series IS 'Catalog of available time series from official sources';
COMMENT ON COLUMN series.metadata IS 'Additional series metadata as JSON including provider and discovery info';
