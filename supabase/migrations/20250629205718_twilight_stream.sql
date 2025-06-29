/*
  # Create ads table for advertisement management

  1. New Tables
    - `ads`
      - `id` (uuid, primary key)
      - `text` (text, required) - Advertisement text content
      - `url` (text, optional) - Link URL for clickable ads
      - `active` (boolean, default true) - Whether the ad is currently active
      - `priority` (integer, optional) - Display priority (lower numbers = higher priority)
      - `start_date` (date, required) - When the ad should start showing
      - `end_date` (date, required) - When the ad should stop showing
      - `countries` (text array, optional) - Country codes for geo-targeting
      - `created_at` (timestamp, default now())

  2. Security
    - Enable RLS on `ads` table
    - Add policy for public read access to active ads
    - Add policies for authenticated users to manage ads

  3. Indexes
    - Index on active status and date range for efficient querying
    - Index on priority for ordering
*/

CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  url text,
  active boolean NOT NULL DEFAULT true,
  priority integer,
  start_date date NOT NULL,
  end_date date NOT NULL,
  countries text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ads_active_dates ON public.ads (active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ads_priority ON public.ads (priority ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ads_countries ON public.ads USING GIN (countries);

-- RLS Policies
CREATE POLICY "Enable read access for all users" 
  ON public.ads 
  FOR SELECT 
  USING (true);

CREATE POLICY "Enable insert for authenticated users" 
  ON public.ads 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
  ON public.ads 
  FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable delete for authenticated users" 
  ON public.ads 
  FOR DELETE 
  TO authenticated 
  USING (true);