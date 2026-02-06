-- NOW Application - Push Notifications
-- Run this migration in Supabase SQL Editor

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
-- FUNCTION: Create notification when someone joins a pulse
-- ============================================
CREATE OR REPLACE FUNCTION notify_pulse_join()
RETURNS TRIGGER AS $$
DECLARE
  pulse_record RECORD;
  participant_name TEXT;
BEGIN
  -- Get pulse info
  SELECT p.*, pr.name as pulseur_name
  INTO pulse_record
  FROM pulses p
  JOIN profiles pr ON p.pulseur_id = pr.id
  WHERE p.id = NEW.id;

  -- Get new participant name (last one added)
  SELECT name INTO participant_name
  FROM profiles
  WHERE id = NEW.participants[array_length(NEW.participants, 1)];

  -- Notify pulse owner if someone new joined (not the owner themselves)
  IF NEW.participants[array_length(NEW.participants, 1)] != pulse_record.pulseur_id THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      pulse_record.pulseur_id,
      'pulse_join',
      'Nouveau participant !',
      participant_name || ' rejoint "' || pulse_record.title || '"',
      jsonb_build_object('pulse_id', NEW.id, 'participant_id', NEW.participants[array_length(NEW.participants, 1)])
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for pulse join
DROP TRIGGER IF EXISTS on_pulse_participant_join ON pulses;
CREATE TRIGGER on_pulse_participant_join
  AFTER UPDATE OF participants ON pulses
  FOR EACH ROW
  WHEN (array_length(NEW.participants, 1) > COALESCE(array_length(OLD.participants, 1), 0))
  EXECUTE FUNCTION notify_pulse_join();

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
