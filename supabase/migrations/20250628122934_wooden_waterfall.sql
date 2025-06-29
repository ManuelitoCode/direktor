/*
  # Add Gamification System with Badges and Player Profiles

  1. New Tables
    - `badge_types`
      - `id` (uuid, primary key)
      - `name` (text, badge name)
      - `description` (text, badge description)
      - `icon` (text, icon identifier)
      - `criteria` (text, criteria description)
      - `created_at` (timestamp)
    - `badges`
      - `id` (uuid, primary key)
      - `player_id` (uuid, foreign key to players)
      - `tournament_id` (uuid, foreign key to tournaments)
      - `badge_type_id` (uuid, foreign key to badge_types)
      - `awarded_at` (timestamp)
      - `created_at` (timestamp)
    - `player_profiles`
      - `id` (uuid, primary key, references players)
      - `bio` (text, player biography)
      - `avatar_url` (text, optional avatar image URL)
      - `social_links` (jsonb, social media links)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage badges
    - Allow public read access for badge types

  3. Indexes
    - Add indexes for efficient querying
*/

-- Create badge_types table
CREATE TABLE IF NOT EXISTS badge_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  criteria text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  badge_type_id uuid NOT NULL REFERENCES badge_types(id) ON DELETE CASCADE,
  awarded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create player_profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
  id uuid PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  bio text,
  avatar_url text,
  social_links jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_badges_player_id ON badges(player_id);
CREATE INDEX IF NOT EXISTS idx_badges_tournament_id ON badges(tournament_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_type_id ON badges(badge_type_id);
CREATE INDEX IF NOT EXISTS idx_badges_awarded_at ON badges(awarded_at DESC);

-- Enable RLS on all tables
ALTER TABLE badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for badge_types
CREATE POLICY "Public can read badge types"
  ON badge_types
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage badge types"
  ON badge_types
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for badges
CREATE POLICY "Public can read badges"
  ON badges
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert badges"
  ON badges
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add RLS policies for player_profiles
CREATE POLICY "Public can read player profiles"
  ON player_profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can update player profiles"
  ON player_profiles
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert player profiles"
  ON player_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profile changes
CREATE TRIGGER update_player_profiles_updated_at
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW EXECUTE FUNCTION update_player_profile_updated_at();

-- Insert initial badge types
INSERT INTO badge_types (name, description, icon, criteria) VALUES
('Flawless Record', 'Win all games in a tournament', 'trophy', 'Win all games in a tournament'),
('Biggest Win', 'Achieve the highest point spread in a single game', 'trending-up', 'Achieve the highest point spread in a single game'),
('Best Underdog', 'Win against a player with a significantly higher rating', 'zap', 'Win against a player with at least 200 points higher rating'),
('Winning Streak', 'Win 3 or more consecutive games', 'activity', 'Win 3 or more consecutive games'),
('Comeback King', 'Finish in the top 3 after losing a game', 'crown', 'Finish in the top 3 after losing at least one game'),
('High Scorer', 'Score 500+ points in a single game', 'bar-chart-3', 'Score 500 or more points in a single game'),
('Tournament Champion', 'Win a tournament', 'award', 'Finish in first place in a tournament'),
('Perfect Spread', 'Maintain a positive spread in every game', 'check-circle', 'Maintain a positive spread in every game played'),
('First Tournament', 'Complete your first tournament', 'flag', 'Complete your first tournament'),
('Team Player', 'Contribute to a team victory', 'users', 'Be part of a winning team in a team tournament')
ON CONFLICT (id) DO NOTHING;