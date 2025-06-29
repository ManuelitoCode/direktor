-- Create tournament_drafts table
CREATE TABLE IF NOT EXISTS tournament_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_drafts_user_id ON tournament_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_drafts_status ON tournament_drafts(status);
CREATE INDEX IF NOT EXISTS idx_tournament_drafts_last_updated ON tournament_drafts(last_updated DESC);

-- Enable Row Level Security
ALTER TABLE tournament_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Add comment
COMMENT ON TABLE tournament_drafts IS 'Stores draft tournament data for session recovery';