/*
  # Create ads table for advertisement management

  1. New Tables
    - `ads`
      - `id` (uuid, primary key)
      - `text` (text, required) - The advertisement text content
      - `url` (text, optional) - Link URL for clickable ads
      - `active` (boolean, default true) - Whether the ad is currently active
      - `start_date` (date, required) - When the ad campaign starts
      - `end_date` (date, required) - When the ad campaign ends
      - `priority` (integer, default 0) - Display priority (lower numbers = higher priority)
      - `countries` (text array, optional) - Target countries for geo-targeting
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `ads` table
    - Add policy for public read access to active ads
    - Add policy for authenticated users to manage ads

  3. Indexes
    - Index on active status and date range for efficient querying
    - Index on priority for ordering
*/

CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  url text,
  active boolean DEFAULT true NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  priority integer DEFAULT 0,
  countries text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ads_active_dates 
  ON ads (active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_ads_priority 
  ON ads (priority);

CREATE INDEX IF NOT EXISTS idx_ads_countries 
  ON ads USING GIN (countries);

-- RLS Policies
CREATE POLICY "Public can read active ads"
  ON ads
  FOR SELECT
  TO anon, authenticated
  USING (
    active = true 
    AND start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE
  );

CREATE POLICY "Authenticated users can manage ads"
  ON ads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();