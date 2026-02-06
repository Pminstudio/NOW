-- NOW Application - Reporting System
-- Run this migration in Supabase SQL Editor

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

-- Admins can view all reports (add admin check later)
-- For now, we'll use a function to check admin status

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

-- ============================================
-- UPDATE PULSES VIEW TO EXCLUDE BLOCKED USERS
-- (Pulses from blocked users won't show up)
-- ============================================
-- Note: This would require modifying the pulses_with_participants view
-- For now, we'll handle this in the application layer
