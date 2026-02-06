# NOW - Configuration Supabase Complete

## Vue d'ensemble

Tu as **9 migrations SQL** et **3 Edge Functions** a deployer.

---

## PARTIE 1: SQL A EXECUTER

Va dans **Supabase Dashboard > SQL Editor** et execute chaque bloc dans l'ordre.

---

### MIGRATION 1: Schema Initial (001)

```sql
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
```

---

### MIGRATION 2: Storage (002)

```sql
-- NOW Application Storage Configuration

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create bucket for pulse images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pulse-images',
  'pulse-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create bucket for profile avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Pulse images: anyone can view, authenticated users can upload their own
CREATE POLICY "Pulse images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'pulse-images');

CREATE POLICY "Authenticated users can upload pulse images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pulse-images'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own pulse images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pulse-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own pulse images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pulse-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatars: anyone can view, authenticated users can upload their own
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

### MIGRATION 3: Favoris (003)

```sql
-- NOW Application - Favorites Feature

-- ============================================
-- FAVORITES TABLE
-- ============================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pulse_id UUID NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pulse_id)
);

-- Enable RLS on favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_pulse_id ON favorites(pulse_id);

-- Enable realtime for favorites
ALTER PUBLICATION supabase_realtime ADD TABLE favorites;
```

---

### MIGRATION 4: Systeme de Notation (004)

```sql
-- NOW Application - Ratings & Reviews Feature

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

CREATE POLICY "Users can create ratings"
  ON ratings FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id AND reviewer_id != pulseur_id);

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
```

---

### MIGRATION 5: Notifications (005)

```sql
-- NOW Application - Push Notifications

-- ============================================
-- DEVICE TOKENS TABLE (for push notifications)
-- ============================================
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own tokens"
  ON device_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pulse_join', 'pulse_leave', 'pulse_reminder', 'pulse_cancelled', 'new_rating', 'new_message', 'pulse_nearby')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "pulse_join": true,
  "pulse_leave": true,
  "pulse_reminder": true,
  "pulse_cancelled": true,
  "new_rating": true,
  "new_message": true,
  "pulse_nearby": true
}'::jsonb;

-- ============================================
-- FUNCTION: Create notification for new rating
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_rating()
RETURNS TRIGGER AS $$
DECLARE
  reviewer_name TEXT;
  pulse_title TEXT;
BEGIN
  SELECT name INTO reviewer_name FROM profiles WHERE id = NEW.reviewer_id;
  SELECT title INTO pulse_title FROM pulses WHERE id = NEW.pulse_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.pulseur_id,
    'new_rating',
    'Nouvel avis reçu !',
    reviewer_name || ' t''a noté ' || NEW.rating || '★ pour "' || pulse_title || '"',
    jsonb_build_object('rating_id', NEW.id, 'pulse_id', NEW.pulse_id, 'rating', NEW.rating)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new rating
DROP TRIGGER IF EXISTS on_new_rating ON ratings;
CREATE TRIGGER on_new_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_rating();
```

---

### MIGRATION 6: Messagerie/Chat (006)

```sql
-- NOW Application - Messaging System

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID REFERENCES pulses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pulse_group', 'direct')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONVERSATION PARTICIPANTS
-- ============================================
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CONVERSATIONS POLICIES
-- ============================================
CREATE POLICY "Users can view conversations they participate in"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

-- ============================================
-- PARTICIPANTS POLICIES
-- ============================================
CREATE POLICY "Users can view participants of their conversations"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave conversations"
  ON conversation_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- MESSAGES POLICIES
-- ============================================
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_conversations_pulse_id ON conversations(pulse_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- ============================================
-- FUNCTION: Auto-create group chat when pulse is created
-- ============================================
CREATE OR REPLACE FUNCTION create_pulse_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Create conversation for the pulse
  INSERT INTO conversations (pulse_id, type, name)
  VALUES (NEW.id, 'pulse_group', NEW.title)
  RETURNING id INTO conv_id;

  -- Add pulse creator as first participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conv_id, NEW.pulseur_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for pulse creation
DROP TRIGGER IF EXISTS on_pulse_create_conversation ON pulses;
CREATE TRIGGER on_pulse_create_conversation
  AFTER INSERT ON pulses
  FOR EACH ROW
  EXECUTE FUNCTION create_pulse_conversation();

-- ============================================
-- FUNCTION: Auto-add participant to chat when joining pulse
-- ============================================
CREATE OR REPLACE FUNCTION add_participant_to_conversation()
RETURNS TRIGGER AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Get the conversation for this pulse
  SELECT id INTO conv_id FROM conversations WHERE pulse_id = NEW.pulse_id;

  IF conv_id IS NOT NULL THEN
    -- Add them to the conversation
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, NEW.user_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for participant joining
DROP TRIGGER IF EXISTS on_pulse_participant_join_chat ON pulse_participants;
CREATE TRIGGER on_pulse_participant_join_chat
  AFTER INSERT ON pulse_participants
  FOR EACH ROW
  EXECUTE FUNCTION add_participant_to_conversation();

-- ============================================
-- FUNCTION: Update conversation timestamp on new message
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for message timestamp
DROP TRIGGER IF EXISTS on_message_update_conversation ON messages;
CREATE TRIGGER on_message_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================
-- FUNCTION: Notify on new message
-- ============================================
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  conv_name TEXT;
  participant RECORD;
BEGIN
  SELECT name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  SELECT name INTO conv_name FROM conversations WHERE id = NEW.conversation_id;

  -- Notify all participants except sender
  FOR participant IN
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      participant.user_id,
      'new_message',
      'Nouveau message',
      sender_name || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
      jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for message notification
DROP TRIGGER IF EXISTS on_new_message_notify ON messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.type = 'text')
  EXECUTE FUNCTION notify_new_message();
```

---

### MIGRATION 7: Recherche Geolocalisee (007)

```sql
-- NOW Application - Geolocation Search

-- Enable PostGIS extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- ADD GEOMETRY COLUMN TO PULSES
-- ============================================
ALTER TABLE pulses ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Create index on geometry column
CREATE INDEX IF NOT EXISTS idx_pulses_geom ON pulses USING GIST (geom);

-- ============================================
-- TRIGGER TO AUTO-UPDATE GEOMETRY
-- ============================================
CREATE OR REPLACE FUNCTION update_pulse_geom()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(
      NEW.location_lng::float,
      NEW.location_lat::float
    ), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_pulse_location_update ON pulses;
CREATE TRIGGER on_pulse_location_update
  BEFORE INSERT OR UPDATE OF location_lat, location_lng ON pulses
  FOR EACH ROW
  EXECUTE FUNCTION update_pulse_geom();

-- Update existing pulses
UPDATE pulses
SET geom = ST_SetSRID(ST_MakePoint(location_lng::float, location_lat::float), 4326)
WHERE geom IS NULL AND location_lat IS NOT NULL AND location_lng IS NOT NULL;

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
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_address TEXT,
  capacity INT,
  image_url TEXT,
  price NUMERIC,
  tags TEXT[],
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
    p.location_lat,
    p.location_lng,
    p.location_address,
    p.capacity,
    p.image_url,
    p.price,
    p.tags,
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
```

---

### MIGRATION 8: Signalement (008)

```sql
-- NOW Application - Reporting System

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('pulse', 'user', 'message')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam',
    'inappropriate_content',
    'harassment',
    'fake_profile',
    'dangerous_activity',
    'fraud',
    'other'
  )),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- REPORTS POLICIES
-- ============================================

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_id ON reports(reported_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_type ON reports(reported_type);

-- ============================================
-- BLOCKED USERS TABLE
-- ============================================
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their blocks"
  ON blocked_users FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ============================================
-- REPORT REASONS (for UI)
-- ============================================
CREATE OR REPLACE VIEW report_reasons AS
SELECT * FROM (VALUES
  ('spam', 'Spam', 'Contenu promotionnel non sollicité'),
  ('inappropriate_content', 'Contenu inapproprié', 'Contenu offensant, violent ou sexuel'),
  ('harassment', 'Harcèlement', 'Comportement abusif ou intimidant'),
  ('fake_profile', 'Faux profil', 'Profil frauduleux ou usurpation d''identité'),
  ('dangerous_activity', 'Activité dangereuse', 'Activité illégale ou risquée'),
  ('fraud', 'Arnaque', 'Tentative de fraude ou escroquerie'),
  ('other', 'Autre', 'Autre problème à signaler')
) AS t(reason, label, description);

GRANT SELECT ON report_reasons TO authenticated;

-- ============================================
-- FUNCTION: Check if user is blocked
-- ============================================
CREATE OR REPLACE FUNCTION is_user_blocked(check_user_id UUID, by_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = by_user_id AND blocked_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_blocked TO authenticated;
```

---

### MIGRATION 9: Abonnements & Monetisation (009)

```sql
-- NOW Application - Subscriptions & Monetization

-- ============================================
-- SUBSCRIPTION PLANS
-- ============================================
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly NUMERIC(10,2),
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits) VALUES
('free', 'Gratuit', 'L''essentiel pour commencer à pulser', 0, 0,
  '["Créer des pulses", "Rejoindre des pulses", "Carte basique", "Notifications"]'::jsonb,
  '{"max_active_pulses": 2, "max_participants_per_pulse": 10, "can_boost": false, "priority_visibility": false, "advanced_filters": false, "smart_history": false}'::jsonb
),
('pulse_plus', 'Pulse+', 'Pour les pulseurs passionnés', 9.99, 89.99,
  '["Pulses illimités", "Visibilité prioritaire", "Filtres avancés", "Historique intelligent", "Badge Pulse+", "Support prioritaire"]'::jsonb,
  '{"max_active_pulses": -1, "max_participants_per_pulse": 50, "can_boost": true, "priority_visibility": true, "advanced_filters": true, "smart_history": true}'::jsonb
);

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'expired')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans are public
CREATE POLICY "Anyone can view plans"
  ON subscription_plans FOR SELECT
  USING (is_active = TRUE);

-- Users can only see their own subscription
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- System manages subscriptions (via service role)
CREATE POLICY "Service role manages subscriptions"
  ON user_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- ============================================
-- PULSE BOOSTS (for future use)
-- ============================================
CREATE TABLE pulse_boosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id UUID NOT NULL REFERENCES pulses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  boost_type TEXT NOT NULL DEFAULT 'standard' CHECK (boost_type IN ('standard', 'premium')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pulse_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boosts"
  ON pulse_boosts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create boosts"
  ON pulse_boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pulse_boosts_pulse ON pulse_boosts(pulse_id);
CREATE INDEX idx_pulse_boosts_active ON pulse_boosts(is_active, expires_at);

-- ============================================
-- ADD SUBSCRIPTION INFO TO PROFILES
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- ============================================
-- FUNCTION: Get user's current plan limits
-- ============================================
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_plan_id TEXT;
  plan_limits JSONB;
BEGIN
  -- Get user's current plan
  SELECT us.plan_id INTO user_plan_id
  FROM user_subscriptions us
  WHERE us.user_id = p_user_id
  AND us.status IN ('active', 'trialing')
  AND (us.current_period_end IS NULL OR us.current_period_end > NOW());

  -- Default to free if no active subscription
  IF user_plan_id IS NULL THEN
    user_plan_id := 'free';
  END IF;

  -- Get plan limits
  SELECT limits INTO plan_limits
  FROM subscription_plans
  WHERE id = user_plan_id;

  RETURN COALESCE(plan_limits, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_limits TO authenticated;

-- ============================================
-- FUNCTION: Check if user can create pulse
-- ============================================
CREATE OR REPLACE FUNCTION can_create_pulse(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  limits JSONB;
  max_pulses INT;
  current_pulses INT;
BEGIN
  limits := get_user_limits(p_user_id);
  max_pulses := (limits->>'max_active_pulses')::int;

  -- -1 means unlimited
  IF max_pulses = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count current active pulses
  SELECT COUNT(*) INTO current_pulses
  FROM pulses
  WHERE pulseur_id = p_user_id
  AND start_time > NOW();

  RETURN current_pulses < max_pulses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_create_pulse TO authenticated;

-- ============================================
-- FUNCTION: Check if user is premium
-- ============================================
CREATE OR REPLACE FUNCTION is_user_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_premium BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = p_user_id
    AND plan_id != 'free'
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  ) INTO is_premium;

  RETURN COALESCE(is_premium, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_premium TO authenticated;

-- ============================================
-- TRIGGER: Update profile premium status
-- ============================================
CREATE OR REPLACE FUNCTION update_profile_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    is_premium = (NEW.plan_id != 'free' AND NEW.status IN ('active', 'trialing')),
    premium_until = NEW.current_period_end
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_change ON user_subscriptions;
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_premium_status();

-- ============================================
-- VIEW: Pulses with boost priority
-- ============================================
CREATE OR REPLACE VIEW pulses_with_priority AS
SELECT
  p.*,
  CASE
    WHEN pb.is_active = TRUE AND pb.expires_at > NOW() THEN TRUE
    ELSE FALSE
  END as is_boosted,
  CASE
    WHEN pb.is_active = TRUE AND pb.expires_at > NOW() THEN 2
    WHEN pr.is_premium = TRUE THEN 1
    ELSE 0
  END as priority_score
FROM pulses p
LEFT JOIN pulse_boosts pb ON p.id = pb.pulse_id AND pb.is_active = TRUE AND pb.expires_at > NOW()
LEFT JOIN profiles pr ON p.pulseur_id = pr.id
ORDER BY priority_score DESC, p.created_at DESC;

GRANT SELECT ON pulses_with_priority TO authenticated;

-- ============================================
-- Initialize free subscription for existing users
-- ============================================
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT id, 'free', 'active'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions WHERE user_id = profiles.id
);
```

---

## PARTIE 2: EDGE FUNCTIONS

### Configuration des Secrets

Va dans **Supabase Dashboard > Project Settings > Edge Functions** et ajoute ces secrets:

```
STRIPE_SECRET_KEY=sk_test_xxx (ou sk_live_xxx en prod)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Deploiement des Edge Functions

#### Option A: Via Supabase CLI (recommande)

```bash
# Installer Supabase CLI si pas fait
npm install -g supabase

# Se connecter
supabase login

# Lier le projet (remplace PROJECT_REF par ton ID)
supabase link --project-ref YOUR_PROJECT_REF

# Deployer les 3 fonctions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

#### Option B: Via le Dashboard

Si tu preferes copier-coller, va dans **Supabase Dashboard > Edge Functions > New Function** et cree chaque fonction:

**Fonction 1: create-checkout-session**

```typescript
// Supabase Edge Function: Create Stripe Checkout Session
// Deploy with: supabase functions deploy create-checkout-session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { planId, billingCycle, userId } = await req.json()

    if (!planId || !userId) {
      throw new Error('Missing required parameters')
    }

    // Get the plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      throw new Error('Plan not found')
    }

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name, stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User not found')
    }

    let customerId = profile.stripe_customer_id

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.name,
        metadata: {
          supabase_user_id: userId,
        },
      })
      customerId = customer.id

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    }

    // Get price ID based on billing cycle
    const priceId = billingCycle === 'yearly'
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id_monthly

    if (!priceId) {
      throw new Error('Price not configured for this plan')
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan_id: planId,
        },
      },
      allow_promotion_codes: true,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

**Fonction 2: create-portal-session**

```typescript
// Supabase Edge Function: Create Stripe Customer Portal Session
// Deploy with: supabase functions deploy create-portal-session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('Missing user ID')
    }

    // Get user's Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      throw new Error('No billing account found')
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/profile`,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Portal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

**Fonction 3: stripe-webhook**

```typescript
// Supabase Edge Function: Handle Stripe Webhooks
// Deploy with: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planId = session.metadata?.plan_id

        if (userId && planId && session.subscription) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )

          // Update or create user subscription
          await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              plan_id: planId,
              status: 'active',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              billing_cycle: subscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            })

          console.log(`Subscription created for user ${userId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          await supabase
            .from('user_subscriptions')
            .update({
              status: subscription.status === 'active' ? 'active' :
                      subscription.status === 'trialing' ? 'trialing' :
                      subscription.status === 'past_due' ? 'past_due' :
                      subscription.status === 'canceled' ? 'cancelled' : 'expired',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id)

          console.log(`Subscription updated for user ${userId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Downgrade to free plan
        await supabase
          .from('user_subscriptions')
          .update({
            plan_id: 'free',
            status: 'expired',
            stripe_subscription_id: null,
            current_period_end: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        console.log(`Subscription cancelled: ${subscription.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          console.log(`Payment failed for subscription: ${invoice.subscription}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          // Subscription renewed
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )

          await supabase
            .from('user_subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string)

          console.log(`Subscription renewed: ${invoice.subscription}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

---

## PARTIE 3: CONFIGURATION STRIPE

### 3.1 Creer les produits Stripe

1. Va sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Active le **mode Test** pour developper
3. Va dans **Products > Add product**

**Produit: Pulse+**
- Nom: `Pulse+`
- Description: `Abonnement premium NOW - Pulses illimites`

**Prix mensuel:**
- Montant: `9.99 EUR`
- Recurrence: `Mensuel`
- Note le `price_id` → ex: `price_1ABC123...`

**Prix annuel:**
- Montant: `89.99 EUR`
- Recurrence: `Annuel`
- Note le `price_id` → ex: `price_1XYZ789...`

### 3.2 Mettre a jour la base de donnees

Execute ce SQL en remplacant par tes vrais price_id:

```sql
UPDATE subscription_plans
SET
  stripe_price_id_monthly = 'price_1ABC123...',
  stripe_price_id_yearly = 'price_1XYZ789...'
WHERE id = 'pulse_plus';
```

### 3.3 Configurer le Webhook Stripe

1. Va dans **Stripe Dashboard > Developers > Webhooks**
2. Clique **Add endpoint**
3. URL: `https://[TON_PROJECT_REF].supabase.co/functions/v1/stripe-webhook`
4. Selectionne ces events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Copie le **Signing secret** (`whsec_xxx`)
6. Ajoute-le dans Supabase Edge Functions secrets

---

## PARTIE 4: CHECKLIST FINALE

- [ ] Migration 001 executee
- [ ] Migration 002 executee
- [ ] Migration 003 executee
- [ ] Migration 004 executee
- [ ] Migration 005 executee
- [ ] Migration 006 executee
- [ ] Migration 007 executee
- [ ] Migration 008 executee
- [ ] Migration 009 executee
- [ ] Secret `STRIPE_SECRET_KEY` configure
- [ ] Secret `STRIPE_WEBHOOK_SECRET` configure
- [ ] Edge Function `create-checkout-session` deployee
- [ ] Edge Function `create-portal-session` deployee
- [ ] Edge Function `stripe-webhook` deployee
- [ ] Produit Stripe cree avec prix mensuel et annuel
- [ ] `subscription_plans` mis a jour avec les price_id
- [ ] Webhook Stripe configure

---

## Test

**Cartes de test Stripe:**
| Type | Numero |
|------|--------|
| Succes | 4242 4242 4242 4242 |
| Echec | 4000 0000 0000 0002 |
| 3D Secure | 4000 0025 0000 3155 |

Date d'expiration: n'importe quelle date future
CVC: n'importe quel code a 3 chiffres
