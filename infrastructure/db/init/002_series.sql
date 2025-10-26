INSERT INTO series (id, source, frequency, unit, metadata) VALUES
('bcra.usd_oficial_ars', 'bcra', 'daily', 'ARS', '{"bcra_moneda": "USD", "description": "Cotización USD Oficial del BCRA", "last_populated": "2025-10-26T07:59:36.704Z"}'::jsonb),
('1', 'bcra', 'daily', 'ARS', '{"description": "Reservas Internacionales del BCRA (en millones de dólares)", "bcra_categoria": "Principales Variables", "last_populated": "2025-10-26T07:59:34.163Z", "bcra_idVariable": 1, "bcra_description": "Reservas Internacionales del BCRA (en millones de dólares - cifras provisorias sujetas a cambio de valuación)"}'::jsonb),
('15', 'bcra', 'daily', 'ARS', '{"description": "Base monetaria - Total (en millones de pesos)", "bcra_categoria": "Principales Variables", "last_populated": "2025-10-26T07:59:34.568Z", "bcra_idVariable": 15, "bcra_description": "Base monetaria - Total (en millones de pesos)"}'::jsonb),
('bcra.leliq_total_ars', 'bcra', 'daily', 'ARS', '{"description": "Stock de Leliq (millones de ARS)", "bcra_categoria": "Series.xlsm", "last_populated": "2025-10-26T07:59:34.974Z", "bcra_idVariable": 53, "bcra_description": "Efecto monetario de las LELIQ y NOTALIQ (en millones de $)"}'::jsonb),
('bcra.pases_pasivos_total_ars', 'bcra', 'daily', 'ARS', '{"description": "Stock de Pases pasivos (millones de ARS)", "bcra_categoria": "Principales Variables", "last_populated": "2025-10-26T07:59:35.376Z", "bcra_idVariable": 42, "bcra_description": "Pases pasivos para el BCRA - Saldos (en millones de pesos)"}'::jsonb),
('bcra.pases_activos_total_ars', 'bcra', 'daily', 'ARS', '{"description": "Stock de Pases activos (millones de ARS)", "bcra_categoria": "Series.xlsm", "last_populated": "2025-10-26T07:59:35.774Z", "bcra_idVariable": 154, "bcra_description": "Saldo de pases activos para el BCRA (en millones de $)"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series IS 'Catalog of available time series from official sources';
COMMENT ON COLUMN series.id IS 'Unique identifier for the series';
COMMENT ON COLUMN series.source IS 'Official data source (bcra, indec, etc.)';
COMMENT ON COLUMN series.frequency IS 'Data frequency (daily, monthly, etc.)';
COMMENT ON COLUMN series.unit IS 'Unit of measurement (USD, ARS, etc.)';
COMMENT ON COLUMN series.metadata IS 'Additional series metadata as JSON';
