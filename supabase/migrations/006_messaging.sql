-- NOW Application - Messaging System
-- Run this migration in Supabase SQL Editor

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
  new_participant_id UUID;
BEGIN
  -- Get the conversation for this pulse
  SELECT id INTO conv_id FROM conversations WHERE pulse_id = NEW.id;

  IF conv_id IS NOT NULL THEN
    -- Get the newly added participant (last in array)
    new_participant_id := NEW.participants[array_length(NEW.participants, 1)];

    -- Add them to the conversation if not already there
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, new_participant_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for participant joining
DROP TRIGGER IF EXISTS on_pulse_participant_add_to_chat ON pulses;
CREATE TRIGGER on_pulse_participant_add_to_chat
  AFTER UPDATE OF participants ON pulses
  FOR EACH ROW
  WHEN (array_length(NEW.participants, 1) > COALESCE(array_length(OLD.participants, 1), 0))
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
