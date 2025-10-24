-- Add official FX series via BCRA Cambiarias
-- Daily official exchange rate

-- Official USD Exchange Rate series
INSERT INTO series (id, source, frequency, unit, metadata, created_at, updated_at) VALUES
(
  'bcra.usd_official_ars',
  'bcra',
  'daily',
  'ARS/USD',
  '{
    "provider_primary": "bcra_cambiarias",
    "description": "Tipo de cambio oficial mayorista (ARS/USD)",
    "bcra_idVariable": null,
    "datos_id": "168.1_T_CAMBIOR_D_0_0_26",
    "discoverable": true,
    "last_discovered": null,
    "source_url": "https://api.bcra.gob.ar/estadisticas/v3.0/Cambiarias",
    "fallback_provider": "datos_series"
  }',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series IS 'Catalog of available time series from official sources';
COMMENT ON COLUMN series.metadata IS 'Additional series metadata as JSON including provider and discovery info';
