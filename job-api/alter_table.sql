-- Add columns and unique constraint for jobs table

-- Add columns if they don't exist
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS apply_url text;

-- Add unique constraint (first check if it exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'jobs_external_id_key'
  ) THEN 
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_external_id_key UNIQUE (external_id); 
  END IF; 
END $$;
