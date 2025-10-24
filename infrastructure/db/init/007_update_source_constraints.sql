-- Update source constraints to include new sources
-- Add dolarapi and indec to allowed sources

-- Drop existing constraint
ALTER TABLE series DROP CONSTRAINT IF EXISTS check_source;

-- Add new constraint with expanded sources
ALTER TABLE series ADD CONSTRAINT check_source CHECK (source IN ('bcra', 'indec', 'mintrab', 'afip', 'dolarapi'));

-- Add comments for documentation
COMMENT ON COLUMN series.source IS 'Official data source (bcra, indec, mintrab, afip, dolarapi)';
