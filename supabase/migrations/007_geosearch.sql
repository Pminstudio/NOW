-- NOW Application - Geolocation Search
-- Run this migration in Supabase SQL Editor

-- Enable PostGIS extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- ADD GEOMETRY COLUMN TO PULSES
-- ============================================
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Create index on geometry column
CREATE INDEX IF NOT EXISTS idx_pulses_geom ON pulses USING GIST (geom);

-- ============================================
-- UPDATE EXISTING PULSES WITH GEOMETRY
-- ============================================
UPDATE pulses
SET geom = ST_SetSRID(ST_MakePoint(
  (location->>'lng')::float,
  (location->>'lat')::float
), 4326)
WHERE geom IS NULL AND location IS NOT NULL;

-- ============================================
-- TRIGGER TO AUTO-UPDATE GEOMETRY
-- ============================================
CREATE OR REPLACE FUNCTION update_pulse_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(
      (NEW.location->>'lng')::float,
      (NEW.location->>'lat')::float
    ), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_pulse_location_update ON pulses;
CREATE TRIGGER on_pulse_location_update
  BEFORE INSERT OR UPDATE OF location ON pulses
  FOR EACH ROW
  EXECUTE FUNCTION update_pulse_geom();

-- ============================================
-- FUNCTION: Search pulses within radius
-- ============================================
CREATE OR REPLACE FUNCTION search_pulses_nearby(
  user_lat FLOAT,
  user_lng FLOAT,
  radius_km FLOAT DEFAULT 10,
  category TEXT DEFAULT NULL,
  limit_count INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  description TEXT,
  pulseur_id UUID,
  start_time TIMESTAMPTZ,
  location JSONB,
  capacity INT,
  image_url TEXT,
  price NUMERIC,
  tags TEXT[],
  participants UUID[],
  distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.title,
    p.type,
    p.description,
    p.pulseur_id,
    p.start_time,
    p.location,
    p.capacity,
    p.image_url,
    p.price,
    p.tags,
    p.participants,
    ROUND((ST_Distance(
      p.geom::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000)::numeric, 2)::float as distance_km
  FROM pulses p
  WHERE
    p.geom IS NOT NULL
    AND ST_DWithin(
      p.geom::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000  -- Convert km to meters
    )
    AND (category IS NULL OR p.type = category)
    AND p.start_time > NOW()  -- Only future pulses
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_pulses_nearby TO authenticated;

-- ============================================
-- FUNCTION: Get pulse count by area
-- ============================================
CREATE OR REPLACE FUNCTION count_pulses_in_area(
  min_lat FLOAT,
  min_lng FLOAT,
  max_lat FLOAT,
  max_lng FLOAT
)
RETURNS INT AS $$
DECLARE
  pulse_count INT;
BEGIN
  SELECT COUNT(*) INTO pulse_count
  FROM pulses p
  WHERE
    p.geom IS NOT NULL
    AND ST_Within(
      p.geom,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
    AND p.start_time > NOW();

  RETURN pulse_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION count_pulses_in_area TO authenticated;
