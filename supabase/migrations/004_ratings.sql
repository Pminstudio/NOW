-- NOW Application - Ratings & Reviews Feature
-- Run this migration in Supabase SQL Editor

-- ============================================
-- RATINGS TABLE
-- ============================================
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pulseur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Each user can only rate a pulse once
  UNIQUE(pulse_id, reviewer_id)
);

-- Enable RLS on ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Ratings policies
CREATE POLICY "Anyone can view ratings"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create ratings for pulses they participated in"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND reviewer_id != pulseur_id
    AND EXISTS (
      SELECT 1 FROM pulses
      WHERE pulses.id = pulse_id
      AND auth.uid() = ANY(pulses.participants)
      AND pulses.start_time < NOW()
    )
  );

CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own ratings"
  ON ratings FOR DELETE
  USING (auth.uid() = reviewer_id);

-- Indexes for faster lookups
CREATE INDEX idx_ratings_pulse_id ON ratings(pulse_id);
CREATE INDEX idx_ratings_pulseur_id ON ratings(pulseur_id);
CREATE INDEX idx_ratings_reviewer_id ON ratings(reviewer_id);

-- Enable realtime for ratings
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;

-- ============================================
-- FUNCTION TO UPDATE PULSEUR AVERAGE RATING
-- ============================================
CREATE OR REPLACE FUNCTION update_pulseur_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM ratings
    WHERE pulseur_id = COALESCE(NEW.pulseur_id, OLD.pulseur_id)
  )
  WHERE id = COALESCE(NEW.pulseur_id, OLD.pulseur_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update pulseur rating
CREATE TRIGGER on_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_pulseur_rating();

-- ============================================
-- VIEW FOR PULSEUR STATS
-- ============================================
CREATE OR REPLACE VIEW pulseur_stats AS
SELECT
  p.id as pulseur_id,
  COUNT(DISTINCT r.id) as total_reviews,
  COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) as average_rating,
  COUNT(DISTINCT pl.id) as total_pulses_created,
  COUNT(DISTINCT CASE WHEN pl.start_time < NOW() THEN pl.id END) as completed_pulses
FROM profiles p
LEFT JOIN ratings r ON r.pulseur_id = p.id
LEFT JOIN pulses pl ON pl.pulseur_id = p.id
GROUP BY p.id;

-- Grant access to the view
GRANT SELECT ON pulseur_stats TO authenticated;
