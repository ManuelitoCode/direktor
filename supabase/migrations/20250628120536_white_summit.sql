/*
  # Add Player Participation Status

  1. Schema Updates
    - Add `participation_status` column to players table
      - Possible values: 'active', 'paused', 'withdrawn'
      - Default value: 'active'
    - Add `paused_at` timestamp column to track when a player was paused
    - Add `pause_reason` text column to store reason for pausing

  2. Indexes
    - Add index for efficient filtering by participation status

  3. Comments
    - Document the purpose of each field
*/

-- Add participation status to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'participation_status'
  ) THEN
    ALTER TABLE players ADD COLUMN participation_status text DEFAULT 'active' CHECK (participation_status IN ('active', 'paused', 'withdrawn'));
  END IF;
END $$;

-- Add timestamp for when player was paused
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'paused_at'
  ) THEN
    ALTER TABLE players ADD COLUMN paused_at timestamptz;
  END IF;
END $$;

-- Add reason for pausing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'pause_reason'
  ) THEN
    ALTER TABLE players ADD COLUMN pause_reason text;
  END IF;
END $$;

-- Add index for participation status queries
CREATE INDEX IF NOT EXISTS idx_players_participation_status ON players(tournament_id, participation_status);

-- Add comments
COMMENT ON COLUMN players.participation_status IS 'Player participation status: active (default), paused (temporarily not participating), or withdrawn (permanently removed from future pairings)';
COMMENT ON COLUMN players.paused_at IS 'Timestamp when player was paused or withdrawn';
COMMENT ON COLUMN players.pause_reason IS 'Optional reason for pausing or withdrawing player';