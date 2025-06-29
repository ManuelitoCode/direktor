/*
  # Add player participation status

  1. Schema Updates
    - Add `status` column to players table
    - Add `paused_at` timestamp column to players table
    - Add `paused_reason` text column to players table

  2. Indexes
    - Add index for efficient querying of player status

  3. Comments
    - Document the purpose of each new field
*/

-- Add participation status fields to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'status'
  ) THEN
    ALTER TABLE players ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'withdrawn'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE players ADD COLUMN paused_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'paused_reason'
  ) THEN
    ALTER TABLE players ADD COLUMN paused_reason text;
  END IF;
END $$;

-- Add index for player status queries
CREATE INDEX IF NOT EXISTS idx_players_status 
  ON players(tournament_id, status);

-- Add comments to explain the fields
COMMENT ON COLUMN players.status IS 'Player participation status: active, paused, or withdrawn';
COMMENT ON COLUMN players.paused_at IS 'Timestamp when player was paused or withdrawn';
COMMENT ON COLUMN players.paused_reason IS 'Optional reason for pausing or withdrawing player';