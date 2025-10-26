-- Migration: Seed series_mappings table with BCRA Monetarias mappings

INSERT INTO series_mappings (internal_series_id, external_series_id, provider_name, keywords, description) VALUES
('1', '1', 'BCRA_MONETARIAS', '["reservas internacionales", "reservas", "international reserves"]'::jsonb, 'Reservas Internacionales del BCRA (en millones de dólares)'),
('15', '15', 'BCRA_MONETARIAS', '["base monetaria", "monetary base", "base monetaria - total"]'::jsonb, 'Base monetaria - Total (en millones de pesos)'),
('bcra.leliq_total_ars', '53', 'BCRA_MONETARIAS', '["leliq", "letras de liquidez", "leliq total"]'::jsonb, 'Stock de Leliq (millones de ARS)'),
('bcra.pases_pasivos_total_ars', '42', 'BCRA_MONETARIAS', '["pases pasivos", "pases pasivos total"]'::jsonb, 'Stock de Pases pasivos (millones de ARS)'),
('bcra.pases_activos_total_ars', '154', 'BCRA_MONETARIAS', '["pases activos", "pases activos total"]'::jsonb, 'Stock de Pases activos (millones de ARS)'),
('bcra.cambiarias.usd', 'USD', 'BCRA_CAMBIARIAS', '["dolar", "usd", "cotizacion"]'::jsonb, 'Cotización Dólar USD (ARS)'),
('bcra.cambiarias.eur', 'EUR', 'BCRA_CAMBIARIAS', '["euro", "eur", "cotizacion"]'::jsonb, 'Cotización Euro (ARS)'),
('bcra.cambiarias.gbp', 'GBP', 'BCRA_CAMBIARIAS', '["libra", "gbp", "cotizacion"]'::jsonb, 'Cotización Libra Esterlina (ARS)'),
('bcra.cambiarias.brl', 'BRL', 'BCRA_CAMBIARIAS', '["real", "brl", "cotizacion"]'::jsonb, 'Cotización Real Brasileño (ARS)'),
('bcra.cambiarias.clp', 'CLP', 'BCRA_CAMBIARIAS', '["peso chileno", "clp", "cotizacion"]'::jsonb, 'Cotización Peso Chileno (ARS)'),
('bcra.cambiarias.pyg', 'PYG', 'BCRA_CAMBIARIAS', '["guarani", "pyg", "cotizacion"]'::jsonb, 'Cotización Guaraní Paraguayo (ARS)'),
('bcra.cambiarias.uyu', 'UYU', 'BCRA_CAMBIARIAS', '["peso uruguayo", "uyu", "cotizacion"]'::jsonb, 'Cotización Peso Uruguayo (ARS)'),
('bcra.cambiarias.cny', 'CNY', 'BCRA_CAMBIARIAS', '["yuan", "cny", "cotizacion"]'::jsonb, 'Cotización Yuan Chino (ARS)'),
('bcra.cambiarias.jpy', 'JPY', 'BCRA_CAMBIARIAS', '["yen", "jpy", "cotizacion"]'::jsonb, 'Cotización Yen Japonés (ARS)'),
('bcra.cambiarias.chf', 'CHF', 'BCRA_CAMBIARIAS', '["franco suizo", "chf", "cotizacion"]'::jsonb, 'Cotización Franco Suizo (ARS)'),
('bcra.cambiarias.aud', 'AUD', 'BCRA_CAMBIARIAS', '["dolar australiano", "aud", "cotizacion"]'::jsonb, 'Cotización Dólar Australiano (ARS)'),
('bcra.cambiarias.cad', 'CAD', 'BCRA_CAMBIARIAS', '["dolar canadiense", "cad", "cotizacion"]'::jsonb, 'Cotización Dólar Canadiense (ARS)'),
('bcra.cambiarias.mxn', 'MXP', 'BCRA_CAMBIARIAS', '["peso mexicano", "mxp", "cotizacion"]'::jsonb, 'Cotización Peso Mexicano (ARS)'),
('bcra.cambiarias.cop', 'COP', 'BCRA_CAMBIARIAS', '["peso colombiano", "cop", "cotizacion"]'::jsonb, 'Cotización Peso Colombiano (ARS)'),
('bcra.cambiarias.xau', 'XAU', 'BCRA_CAMBIARIAS', '["oro", "xau", "cotizacion"]'::jsonb, 'Cotización Oro (USD/oz troy)')
ON CONFLICT (external_series_id, provider_name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series_mappings IS 'Maps external API series IDs to internal series IDs for different providers';
COMMENT ON COLUMN series_mappings.internal_series_id IS 'Internal series ID in our database';
COMMENT ON COLUMN series_mappings.external_series_id IS 'External API series ID (e.g., BCRA variable ID)';
COMMENT ON COLUMN series_mappings.provider_name IS 'Provider name (BCRA_MONETARIAS, BCRA_CAMBIARIAS, etc.)';
