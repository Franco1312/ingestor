-- Migration: Seed series_mappings table with BCRA Monetarias mappings

INSERT INTO series_mappings (internal_series_id, external_series_id, provider_name, keywords, description) VALUES
('1', '1', 'BCRA_MONETARIAS', '["reservas internacionales", "reservas", "international reserves"]'::jsonb, 'Reservas Internacionales del BCRA (en millones de dólares)'),
('15', '15', 'BCRA_MONETARIAS', '["base monetaria", "monetary base", "base monetaria - total"]'::jsonb, 'Base monetaria - Total (en millones de pesos)'),
('bcra.leliq_total_ars', '53', 'BCRA_MONETARIAS', '["leliq", "letras de liquidez", "leliq total"]'::jsonb, 'Stock de Leliq (millones de ARS)'),
('bcra.pases_pasivos_total_ars', '42', 'BCRA_MONETARIAS', '["pases pasivos", "pases pasivos total"]'::jsonb, 'Stock de Pases pasivos (millones de ARS)'),
('bcra.pases_activos_total_ars', '154', 'BCRA_MONETARIAS', '["pases activos", "pases activos total"]'::jsonb, 'Stock de Pases activos (millones de ARS)')
ON CONFLICT (external_series_id, provider_name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series_mappings IS 'Maps external API series IDs to internal series IDs for different providers';
COMMENT ON COLUMN series_mappings.internal_series_id IS 'Internal series ID in our database';
COMMENT ON COLUMN series_mappings.external_series_id IS 'External API series ID (e.g., BCRA variable ID)';
COMMENT ON COLUMN series_mappings.provider_name IS 'Provider name (BCRA_MONETARIAS, BCRA_CAMBIARIAS, etc.)';
