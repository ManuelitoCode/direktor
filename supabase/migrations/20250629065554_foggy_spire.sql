/*
  # Triumvirate Mode Schema Update

  This migration adds support for the Triumvirate tournament format with two distinct phases.
  
  1. New Columns
     - Adds triumvirate_mode, triumvirate_phase, and triumvirate_config to tournaments table
     - Adds triumvirate_group, triumvirate_position, and phase statistics to teams table
  
  2. New Tables
     - triumvirate_groups: Tracks team groups for each phase
     - triumvirate_phases: Stores phase configuration and completion status
  
  3. Security
     - Enables RLS on new tables
     - Adds appropriate policies with safety checks to prevent duplicates
  
  4. Indexes
     - Creates performance indexes for efficient querying
*/

-- Add Triumvirate Mode fields to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS triumvirate_mode BOOLEAN DEFAULT false;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS triumvirate_phase INTEGER DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS triumvirate_config JSONB DEFAULT '{}'::jsonb;

-- Add Triumvirate fields to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS triumvirate_group TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS triumvirate_position INTEGER;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS phase1_wins INTEGER DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS phase1_spread INTEGER DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS phase1_individual_wins INTEGER DEFAULT 0;

-- Create triumvirate_groups table
CREATE TABLE IF NOT EXISTS triumvirate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  phase INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tournament_id, group_name, phase)
);

-- Create triumvirate_phases table
CREATE TABLE IF NOT EXISTS triumvirate_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  start_round INTEGER NOT NULL,
  end_round INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tournament_id, phase_number)
);

-- Enable RLS on new tables
ALTER TABLE triumvirate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE triumvirate_phases ENABLE ROW LEVEL SECURITY;

-- Add policies for triumvirate_groups with safety checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_groups' AND policyname = 'Users can create triumvirate_groups'
  ) THEN
    CREATE POLICY "Users can create triumvirate_groups"
      ON triumvirate_groups
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_groups' AND policyname = 'Users can read triumvirate_groups'
  ) THEN
    CREATE POLICY "Users can read triumvirate_groups"
      ON triumvirate_groups
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_groups' AND policyname = 'Users can update triumvirate_groups'
  ) THEN
    CREATE POLICY "Users can update triumvirate_groups"
      ON triumvirate_groups
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_groups' AND policyname = 'Users can delete triumvirate_groups'
  ) THEN
    CREATE POLICY "Users can delete triumvirate_groups"
      ON triumvirate_groups
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Add policies for triumvirate_phases with safety checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_phases' AND policyname = 'Users can create triumvirate_phases'
  ) THEN
    CREATE POLICY "Users can create triumvirate_phases"
      ON triumvirate_phases
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_phases' AND policyname = 'Users can read triumvirate_phases'
  ) THEN
    CREATE POLICY "Users can read triumvirate_phases"
      ON triumvirate_phases
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_phases' AND policyname = 'Users can update triumvirate_phases'
  ) THEN
    CREATE POLICY "Users can update triumvirate_phases"
      ON triumvirate_phases
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'triumvirate_phases' AND policyname = 'Users can delete triumvirate_phases'
  ) THEN
    CREATE POLICY "Users can delete triumvirate_phases"
      ON triumvirate_phases
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_triumvirate_groups_tournament ON triumvirate_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_triumvirate_phases_tournament ON triumvirate_phases(tournament_id);
CREATE INDEX IF NOT EXISTS idx_teams_triumvirate_group ON teams(tournament_id, triumvirate_group);