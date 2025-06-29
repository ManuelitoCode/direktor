/*
  # Add Player Participation Status

  1. Schema Updates
    - Add `participation_status` column to players table
    - Default value is 'active'
    - Valid values: 'active', 'paused', 'withdrawn'
    - Add index for efficient filtering by status

  2. Comments
    - Document the purpose of the participation status field
*/

-- Add participation_status to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'participation_status'
  ) THEN
    ALTER TABLE players ADD COLUMN participation_status text DEFAULT 'active' CHECK (participation_status IN ('active', 'paused', 'withdrawn'));
  END IF;
END $$;

-- Add index for filtering by participation status
CREATE INDEX IF NOT EXISTS idx_players_participation_status ON players(tournament_id, participation_status);

-- Add comment
COMMENT ON COLUMN players.participation_status IS 'Player participation status: active (default), paused (temporarily not participating), or withdrawn (permanently removed from future pairings)';

-- Update existing pairings functions to respect participation status
CREATE OR REPLACE FUNCTION should_include_in_pairings(player_status text)
RETURNS boolean AS $$
BEGIN
  RETURN player_status = 'active';
END;
$$ LANGUAGE plpgsql;