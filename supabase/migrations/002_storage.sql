-- NOW Application Storage Configuration
-- Run this migration in Supabase SQL Editor after 001_initial_schema.sql

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
