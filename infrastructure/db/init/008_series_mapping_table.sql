-- Migration: Create series mapping table for external API IDs
-- This solves the foreign key constraint issue by separating internal and external IDs

-- Create series_mappings table to map external API IDs to internal series IDs
CREATE TABLE IF NOT EXISTS series_mappings (
    id SERIAL PRIMARY KEY,
    internal_series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    external_series_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure unique mapping per provider
    UNIQUE(external_series_id, provider_name)
);

-- Add trigger for updated_at
CREATE TRIGGER update_series_mappings_updated_at
    BEFORE UPDATE ON series_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for fast lookups
CREATE INDEX idx_series_mappings_internal ON series_mappings (internal_series_id);
CREATE INDEX idx_series_mappings_external ON series_mappings (external_series_id);
CREATE INDEX idx_series_mappings_provider ON series_mappings (provider_name);

-- Insert existing mappings for BCRA Monetarias series
INSERT INTO series_mappings (internal_series_id, external_series_id, provider_name) VALUES
('1', '1', 'BCRA_MONETARIAS'),
('15', '15', 'BCRA_MONETARIAS'),
('bcra.leliq_total_ars', '53', 'BCRA_MONETARIAS'),
('bcra.pases_pasivos_total_ars', '42', 'BCRA_MONETARIAS'),
('bcra.pases_activos_total_ars', '154', 'BCRA_MONETARIAS')
ON CONFLICT (external_series_id, provider_name) DO NOTHING;

-- Insert mappings for DolarApi series
INSERT INTO series_mappings (internal_series_id, external_series_id, provider_name) VALUES
('dolarapi.mep_ars', 'mep', 'DOLARAPI'),
('dolarapi.ccl_ars', 'ccl', 'DOLARAPI'),
('dolarapi.blue_ars', 'blue', 'DOLARAPI')
ON CONFLICT (external_series_id, provider_name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE series_mappings IS 'Maps external API series IDs to internal series IDs for different providers';
COMMENT ON COLUMN series_mappings.internal_series_id IS 'Internal series ID in our database';
COMMENT ON COLUMN series_mappings.external_series_id IS 'External API series ID (e.g., BCRA variable ID, DolarApi type)';
COMMENT ON COLUMN series_mappings.provider_name IS 'Provider name (BCRA_MONETARIAS, DOLARAPI, etc.)';
