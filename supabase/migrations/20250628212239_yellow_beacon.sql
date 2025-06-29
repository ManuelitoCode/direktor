/*
  # Create tournament_drafts table for saving draft tournaments

  1. New Tables
    - `tournament_drafts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `data` (jsonb, stores draft tournament data)
      - `last_updated` (timestamptz, for sorting)
      - `status` (text, 'draft' or 'completed')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `tournament_drafts` table
    - Only allow users to access their own drafts

  3. Indexes
    - Add indexes for efficient querying by user and last_updated
*/

-- Create tournament_drafts table if it doesn't exist
CREATE TABLE IF NOT EXISTS tournament_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_tournament_drafts_user_id ON tournament_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_drafts_status ON tournament_drafts(status);
CREATE INDEX IF NOT EXISTS idx_tournament_drafts_last_updated ON tournament_drafts(last_updated DESC);

-- Enable Row Level Security if not already enabled
ALTER TABLE tournament_drafts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can read own drafts" ON tournament_drafts;
    DROP POLICY IF EXISTS "Users can insert own drafts" ON tournament_drafts;
    DROP POLICY IF EXISTS "Users can update own drafts" ON tournament_drafts;
    DROP POLICY IF EXISTS "Users can delete own drafts" ON tournament_drafts;
    
    -- Create new policies
    CREATE POLICY "Users can read own drafts"
      ON tournament_drafts
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert own drafts"
      ON tournament_drafts
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update own drafts"
      ON tournament_drafts
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can delete own drafts"
      ON tournament_drafts
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
END;
$$;

-- Add comment to table
COMMENT ON TABLE tournament_drafts IS 'Stores draft tournament data for session recovery';