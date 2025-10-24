-- Add financial FX series via DolarApi
-- Daily financial exchange rates (non-official)

-- MEP (Mercado Electrónico de Pagos) series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'dolarapi.mep_ars',
  'dolarapi',
  'daily',
  'ARS/USD',
  '{
    "provider_primary": "dolarapi",
    "description": "Dólar MEP (venta) - Mercado Electrónico de Pagos",
    "endpoint": "/dolares/bolsa",
    "discoverable": true,
    "last_discovered": null,
    "source_url": "https://dolarapi.com/v1/dolares/bolsa",
    "non_official": true
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- CCL (Contado con Liquidación) series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'dolarapi.ccl_ars',
  'dolarapi',
  'daily',
  'ARS/USD',
  '{
    "provider_primary": "dolarapi",
    "description": "Dólar CCL (venta) - Contado con Liquidación",
    "endpoint": "/dolares/contadoconliqui",
    "discoverable": true,
    "last_discovered": null,
    "source_url": "https://dolarapi.com/v1/dolares/contadoconliqui",
    "non_official": true
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Blue Dollar series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'dolarapi.blue_ars',
  'dolarapi',
  'daily',
  'ARS/USD',
  '{
    "provider_primary": "dolarapi",
    "description": "Dólar Blue (venta) - Mercado informal",
    "endpoint": "/dolares/blue",
    "discoverable": true,
    "last_discovered": null,
    "source_url": "https://dolarapi.com/v1/dolares/blue",
    "non_official": true
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series IS 'Catalog of available time series from official sources';
COMMENT ON COLUMN series.metadata IS 'Additional series metadata as JSON including provider and discovery info';
