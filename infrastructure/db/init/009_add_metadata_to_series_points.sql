-- Add metadata column to series_points table
ALTER TABLE series_points ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_series_points_metadata ON series_points USING GIN (metadata);

-- Add comment to document the metadata column
COMMENT ON COLUMN series_points.metadata IS 'Additional metadata for the data point, including source information and processing details';
