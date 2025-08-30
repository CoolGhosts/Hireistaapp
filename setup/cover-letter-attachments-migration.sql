-- Cover Letter Attachments Migration
-- This migration adds comprehensive cover letter attachment support to the Jobbify app

-- Create cover_letters table for storing both file and text-based cover letters
CREATE TABLE IF NOT EXISTS cover_letters (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- File-based cover letter fields
  file_url TEXT, -- URL to the PDF file in Supabase Storage
  file_name TEXT, -- Original filename
  file_size INTEGER, -- File size in bytes
  file_type TEXT DEFAULT 'application/pdf', -- MIME type
  
  -- Text-based cover letter field
  custom_text TEXT, -- For cover letters written directly in the app
  
  -- Cover letter type: 'file' or 'text'
  type TEXT CHECK (type IN ('file', 'text')) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one cover letter per application
  UNIQUE(application_id),
  
  -- Ensure user can only access their own cover letters
  CONSTRAINT cover_letters_user_application_check 
    CHECK (user_id = (SELECT profile_id FROM matches WHERE id = application_id))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS cover_letters_application_id_idx ON cover_letters(application_id);
CREATE INDEX IF NOT EXISTS cover_letters_user_id_idx ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS cover_letters_type_idx ON cover_letters(type);

-- Enable Row Level Security
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own cover letters
CREATE POLICY "Users can manage their own cover letters" 
  ON cover_letters 
  FOR ALL 
  USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_cover_letters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_cover_letters_updated_at_trigger ON cover_letters;
CREATE TRIGGER update_cover_letters_updated_at_trigger
  BEFORE UPDATE ON cover_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_cover_letters_updated_at();

-- Create Supabase Storage bucket for cover letter PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cover-letters',
  'cover-letters',
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for cover-letters bucket
CREATE POLICY "Users can upload their own cover letters"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cover-letters' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own cover letters"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cover-letters' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own cover letters"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cover-letters' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own cover letters"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cover-letters' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create a view for easy querying of applications with cover letter status
CREATE OR REPLACE VIEW applications_with_cover_letters AS
SELECT 
  m.id as application_id,
  m.profile_id,
  m.job_id,
  m.status,
  m.created_at as applied_at,
  m.updated_at,
  m.cover_letter as legacy_cover_letter, -- Keep the old text field for backward compatibility
  m.application_email,
  m.metadata,
  
  -- Cover letter attachment info
  cl.id as cover_letter_id,
  cl.type as cover_letter_type,
  cl.file_url,
  cl.file_name,
  cl.file_size,
  cl.custom_text as cover_letter_text,
  cl.created_at as cover_letter_created_at,
  cl.updated_at as cover_letter_updated_at,
  
  -- Computed fields
  CASE 
    WHEN cl.id IS NOT NULL THEN true 
    WHEN m.cover_letter IS NOT NULL AND m.cover_letter != '' THEN true
    ELSE false 
  END as has_cover_letter,
  
  CASE 
    WHEN cl.type = 'file' THEN 'attachment'
    WHEN cl.type = 'text' THEN 'custom'
    WHEN m.cover_letter IS NOT NULL AND m.cover_letter != '' THEN 'legacy'
    ELSE 'none'
  END as cover_letter_status

FROM matches m
LEFT JOIN cover_letters cl ON m.id = cl.application_id;

-- Grant access to the view
GRANT SELECT ON applications_with_cover_letters TO authenticated;

-- Create helper functions for cover letter management

-- Function to create or update a file-based cover letter
CREATE OR REPLACE FUNCTION upsert_file_cover_letter(
  p_application_id INTEGER,
  p_user_id UUID,
  p_file_url TEXT,
  p_file_name TEXT,
  p_file_size INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_cover_letter_id INTEGER;
  v_result JSON;
BEGIN
  -- Insert or update the cover letter
  INSERT INTO cover_letters (
    application_id, 
    user_id, 
    type, 
    file_url, 
    file_name, 
    file_size,
    custom_text
  )
  VALUES (
    p_application_id, 
    p_user_id, 
    'file', 
    p_file_url, 
    p_file_name, 
    p_file_size,
    NULL
  )
  ON CONFLICT (application_id) 
  DO UPDATE SET
    type = 'file',
    file_url = p_file_url,
    file_name = p_file_name,
    file_size = p_file_size,
    custom_text = NULL,
    updated_at = NOW()
  RETURNING id INTO v_cover_letter_id;
  
  -- Return the result
  SELECT jsonb_build_object(
    'id', v_cover_letter_id,
    'application_id', p_application_id,
    'type', 'file',
    'file_url', p_file_url,
    'file_name', p_file_name,
    'file_size', p_file_size
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or update a text-based cover letter
CREATE OR REPLACE FUNCTION upsert_text_cover_letter(
  p_application_id INTEGER,
  p_user_id UUID,
  p_custom_text TEXT
)
RETURNS JSON AS $$
DECLARE
  v_cover_letter_id INTEGER;
  v_result JSON;
BEGIN
  -- Insert or update the cover letter
  INSERT INTO cover_letters (
    application_id, 
    user_id, 
    type, 
    custom_text,
    file_url,
    file_name,
    file_size
  )
  VALUES (
    p_application_id, 
    p_user_id, 
    'text', 
    p_custom_text,
    NULL,
    NULL,
    NULL
  )
  ON CONFLICT (application_id) 
  DO UPDATE SET
    type = 'text',
    custom_text = p_custom_text,
    file_url = NULL,
    file_name = NULL,
    file_size = NULL,
    updated_at = NOW()
  RETURNING id INTO v_cover_letter_id;
  
  -- Return the result
  SELECT jsonb_build_object(
    'id', v_cover_letter_id,
    'application_id', p_application_id,
    'type', 'text',
    'custom_text', p_custom_text
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION upsert_file_cover_letter TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_text_cover_letter TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE cover_letters IS 'Stores cover letter attachments (both file and text-based) for job applications';
COMMENT ON VIEW applications_with_cover_letters IS 'Provides a comprehensive view of applications with their cover letter status and details';
