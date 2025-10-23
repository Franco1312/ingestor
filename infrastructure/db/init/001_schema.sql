-- PostgreSQL 16 + TimescaleDB Schema
-- This script creates the canonical time-series schema for the ingestor service

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Series catalog table
CREATE TABLE IF NOT EXISTS series (
  id        TEXT PRIMARY KEY,             -- e.g. "bcra.fx_reserves_gross"
  source    TEXT NOT NULL,                -- "bcra" | "indec"
  frequency TEXT NOT NULL,                -- "daily" | "monthly"
  unit      TEXT,                         -- "USD" | "ARS" | "ARS/USD" | "index"
  metadata  JSONB
);

-- Time series points table
CREATE TABLE IF NOT EXISTS series_points (
  series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  ts        DATE NOT NULL,
  value     NUMERIC NOT NULL,
  PRIMARY KEY (series_id, ts)
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('series_points', 'ts', if_not_exists => TRUE);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_series_points ON series_points (series_id, ts DESC);

-- Create index for series metadata queries
CREATE INDEX IF NOT EXISTS idx_series_source ON series (source);
CREATE INDEX IF NOT EXISTS idx_series_frequency ON series (frequency);

-- Add constraints
ALTER TABLE series ADD CONSTRAINT check_frequency CHECK (frequency IN ('daily', 'monthly', 'weekly', 'quarterly', 'yearly'));
ALTER TABLE series ADD CONSTRAINT check_source CHECK (source IN ('bcra', 'indec', 'mintrab', 'afip'));

-- Comments for documentation
COMMENT ON TABLE series IS 'Catalog of available time series from official sources';
COMMENT ON TABLE series_points IS 'Time series data points with idempotent upserts';
COMMENT ON COLUMN series.id IS 'Unique identifier for the series (e.g., bcra.fx_reserves_gross)';
COMMENT ON COLUMN series.source IS 'Official data source (bcra, indec, etc.)';
COMMENT ON COLUMN series.frequency IS 'Data frequency (daily, monthly, etc.)';
COMMENT ON COLUMN series.unit IS 'Unit of measurement (USD, ARS, etc.)';
COMMENT ON COLUMN series.metadata IS 'Additional series metadata as JSON';
COMMENT ON COLUMN series_points.series_id IS 'Reference to series catalog';
COMMENT ON COLUMN series_points.ts IS 'Timestamp of the data point (DATE)';
COMMENT ON COLUMN series_points.value IS 'Numeric value of the data point';
