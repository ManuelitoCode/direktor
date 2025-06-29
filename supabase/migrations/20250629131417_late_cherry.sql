/*
  # Create Ads Table

  1. New Tables
    - `ads`
      - `id` (uuid, primary key)
      - `text` (text, required)
      - `url` (text, optional)
      - `active` (boolean, default: true)
      - `priority` (integer, optional)
      - `start_date` (date, required)
      - `end_date` (date, required)
      - `countries` (text array, optional)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `ads` table
    - Add policy for public read access to active ads
    - Add policies for developer-only write access
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