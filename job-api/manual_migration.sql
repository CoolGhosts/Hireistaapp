-- Manual migration to add missing columns to jobs table
-- Run this SQL directly in Supabase SQL Editor or using psql

-- Add missing columns
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS apply_url text;

-- Add unique constraint for external_id
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_external_id_key'
  ) THEN 
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_external_id_key UNIQUE (external_id); 
  END IF; 
END $$;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' AND table_schema = 'public'
ORDER BY ordinal_position;