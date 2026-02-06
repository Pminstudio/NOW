-- NOW Application - Auto-create free subscription for new users
-- Run this migration in Supabase SQL Editor

-- ============================================
-- FUNCTION: Auto-create free subscription on profile creation
-- ============================================
CREATE OR REPLACE FUNCTION create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a free subscription for the new user
  INSERT INTO user_subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when profile is created
DROP TRIGGER IF EXISTS on_profile_create_subscription ON profiles;
CREATE TRIGGER on_profile_create_subscription
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription();

-- ============================================
-- Backfill: Create free subscriptions for existing users without one
-- ============================================
INSERT INTO user_subscriptions (user_id, plan_id, status)
SELECT p.id, 'free', 'active'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;
