-- NOW Application - Subscriptions & Monetization
-- Run this migration in Supabase SQL Editor

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
