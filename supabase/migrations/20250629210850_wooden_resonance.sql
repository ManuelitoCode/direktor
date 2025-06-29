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
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `ads` table
    - Add policy for public read access to active ads
    - Add policies for authenticated users to manage ads
*/

-- Create ads table
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

-- Enable Row Level Security
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ads_active_dates 
  ON ads (active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_ads_priority 
  ON ads (priority);

CREATE INDEX IF NOT EXISTS idx_ads_countries 
  ON ads USING GIN (countries);

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ads' AND policyname = 'Public can read active ads'
  ) THEN
    CREATE POLICY "Public can read active ads"
      ON ads
      FOR SELECT
      TO anon, authenticated
      USING (
        active = true 
        AND start_date <= CURRENT_DATE 
        AND end_date >= CURRENT_DATE
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ads' AND policyname = 'Authenticated users can manage ads'
  ) THEN
    CREATE POLICY "Authenticated users can manage ads"
      ON ads
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- Add trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_ads_updated_at'
  ) THEN
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
  END IF;
END
$$;

-- Add comment
COMMENT ON TABLE ads IS 'Advertisements for display in the application';