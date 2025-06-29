/*
  # Create ads table and security policies
  
  1. New Tables
    - `ads` - Stores advertisement data with targeting capabilities
  
  2. Security
    - Enable RLS on `ads` table
    - Add policy for public read access to active ads
    - Add policies for developer-only write access
*/

-- Create ads table if it doesn't exist
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  url TEXT,
  active BOOLEAN DEFAULT true,
  priority INTEGER,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  countries TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DO $$
BEGIN
  -- Drop read policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ads' AND policyname = 'Anyone can read active ads'
  ) THEN
    DROP POLICY "Anyone can read active ads" ON ads;
  END IF;
  
  -- Drop insert policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ads' AND policyname = 'Developer can insert ads'
  ) THEN
    DROP POLICY "Developer can insert ads" ON ads;
  END IF;
  
  -- Drop update policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ads' AND policyname = 'Developer can update ads'
  ) THEN
    DROP POLICY "Developer can update ads" ON ads;
  END IF;
  
  -- Drop delete policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ads' AND policyname = 'Developer can delete ads'
  ) THEN
    DROP POLICY "Developer can delete ads" ON ads;
  END IF;
END
$$;

-- Create policy for read access (all users)
CREATE POLICY "Anyone can read active ads"
  ON ads
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true AND
    CURRENT_DATE >= start_date AND
    CURRENT_DATE <= end_date
  );

-- Create policies for write access (only developer)
CREATE POLICY "Developer can insert ads"
  ON ads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.email() = 'ashikemlito@gmail.com');

CREATE POLICY "Developer can update ads"
  ON ads
  FOR UPDATE
  TO authenticated
  USING (auth.email() = 'ashikemlito@gmail.com')
  WITH CHECK (auth.email() = 'ashikemlito@gmail.com');

CREATE POLICY "Developer can delete ads"
  ON ads
  FOR DELETE
  TO authenticated
  USING (auth.email() = 'ashikemlito@gmail.com');

-- Create index for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_ads_active_dates ON ads(active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_priority ON ads(priority);