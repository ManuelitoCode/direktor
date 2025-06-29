/*
  # Advertisement System

  1. New Tables
    - `ads`
      - `id` (uuid, primary key)
      - `text` (text, advertisement message)
      - `url` (text, optional external link)
      - `active` (boolean, controls visibility)
      - `priority` (integer, display order)
      - `start_date` (date, when ad begins showing)
      - `end_date` (date, when ad expires)
      - `countries` (text[], targeted countries)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `ads` table
    - Add policies for read access to all users (with conditions)
    - Add policies for write access only to developer account
*/

-- Create ads table
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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ads_active_dates ON ads(active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_priority ON ads(priority);