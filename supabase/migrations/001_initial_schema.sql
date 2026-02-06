-- NOW Application Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT DEFAULT 'Prêt à pulser !',
  avatar_url TEXT,
  interests TEXT[] DEFAULT '{}',
  is_pulseur BOOLEAN DEFAULT false,
  rating DECIMAL(2,1) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PULSES TABLE
-- ============================================
CREATE TABLE pulses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  pulseur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  location_lat DECIMAL(10,7) NOT NULL,
  location_lng DECIMAL(10,7) NOT NULL,
  location_address TEXT,
  capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity > 0),
  image_url TEXT,
  price DECIMAL(10,2) DEFAULT 0 CHECK (price >= 0),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on pulses
ALTER TABLE pulses ENABLE ROW LEVEL SECURITY;

-- Pulses policies
CREATE POLICY "Pulses are viewable by everyone"
  ON pulses FOR SELECT
  USING (true);

CREATE POLICY "Pulseurs can create pulses"
  ON pulses FOR INSERT
  WITH CHECK (auth.uid() = pulseur_id);

CREATE POLICY "Pulseurs can update their own pulses"
  ON pulses FOR UPDATE
  USING (auth.uid() = pulseur_id)
  WITH CHECK (auth.uid() = pulseur_id);

CREATE POLICY "Pulseurs can delete their own pulses"
  ON pulses FOR DELETE
  USING (auth.uid() = pulseur_id);

-- ============================================
-- PULSE_PARTICIPANTS TABLE (Junction)
-- ============================================
CREATE TABLE pulse_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pulse_id, user_id)
);

-- Enable RLS on pulse_participants
ALTER TABLE pulse_participants ENABLE ROW LEVEL SECURITY;

-- Participants policies
CREATE POLICY "Participants are viewable by everyone"
  ON pulse_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join pulses"
  ON pulse_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave pulses"
  ON pulse_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_pulses_pulseur_id ON pulses(pulseur_id);
CREATE INDEX idx_pulses_start_time ON pulses(start_time);
CREATE INDEX idx_pulses_type ON pulses(type);
CREATE INDEX idx_pulse_participants_pulse_id ON pulse_participants(pulse_id);
CREATE INDEX idx_pulse_participants_user_id ON pulse_participants(user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pulses_updated_at
  BEFORE UPDATE ON pulses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Nouveau Pulseur'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for pulses and participants tables
ALTER PUBLICATION supabase_realtime ADD TABLE pulses;
ALTER PUBLICATION supabase_realtime ADD TABLE pulse_participants;

-- ============================================
-- VIEWS (Optional - for easier querying)
-- ============================================

-- View to get pulses with participant count
CREATE OR REPLACE VIEW pulses_with_participants AS
SELECT
  p.*,
  COALESCE(
    (SELECT json_agg(pp.user_id) FROM pulse_participants pp WHERE pp.pulse_id = p.id),
    '[]'::json
  ) as participant_ids,
  (SELECT COUNT(*) FROM pulse_participants pp WHERE pp.pulse_id = p.id) as participant_count
FROM pulses p;

-- Grant access to the view
GRANT SELECT ON pulses_with_participants TO authenticated, anon;
