-- Add Leliq and Pases series to catalog
-- These series will be discovered from BCRA Monetarias API

-- Leliq (Letras de Liquidez) series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'bcra.leliq_total_ars',
  'bcra',
  'daily',
  'ARS',
  '{
    "provider_primary": "bcra_monetarias",
    "description": "Stock de Leliq (millones de ARS)",
    "bcra_idVariable": null,
    "discoverable": true,
    "last_discovered": null
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Pases Pasivos series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'bcra.pases_pasivos_total_ars',
  'bcra',
  'daily',
  'ARS',
  '{
    "provider_primary": "bcra_monetarias",
    "description": "Stock de Pases pasivos (millones de ARS)",
    "bcra_idVariable": null,
    "discoverable": true,
    "last_discovered": null
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Pases Activos series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'bcra.pases_activos_total_ars',
  'bcra',
  'daily',
  'ARS',
  '{
    "provider_primary": "bcra_monetarias",
    "description": "Stock de Pases activos (millones de ARS)",
    "bcra_idVariable": null,
    "discoverable": true,
    "last_discovered": null
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series IS 'Catalog of available time series from official sources';
COMMENT ON COLUMN series.metadata IS 'Additional series metadata as JSON including provider and discovery info';
