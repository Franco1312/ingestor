-- Add created_at and updated_at columns to existing tables
-- This migration adds timestamp tracking to series and series_points tables

-- Add timestamps to series table
ALTER TABLE series 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add timestamps to series_points table
ALTER TABLE series_points 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for series table
CREATE TRIGGER update_series_updated_at 
    BEFORE UPDATE ON series 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for series_points table
CREATE TRIGGER update_series_points_updated_at 
    BEFORE UPDATE ON series_points 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN series.created_at IS 'Timestamp when the series was first created';
COMMENT ON COLUMN series.updated_at IS 'Timestamp when the series was last updated';
COMMENT ON COLUMN series_points.created_at IS 'Timestamp when the data point was first created';
COMMENT ON COLUMN series_points.updated_at IS 'Timestamp when the data point was last updated';
