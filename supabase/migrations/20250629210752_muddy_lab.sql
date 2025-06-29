/*
  # Create audit logs table for tracking user actions

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `action` (text, action type)
      - `timestamp` (timestamptz)
      - `details` (jsonb, additional context)

  2. Security
    - Enable RLS on `audit_logs` table
    - Only allow authenticated users to insert logs
    - Only allow users to read their own logs

  3. Indexes
    - Add indexes for efficient querying by user and timestamp
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  details jsonb DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies with safety checks to avoid duplicates
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' AND policyname = 'Users can insert their own audit logs'
  ) THEN
    CREATE POLICY "Users can insert their own audit logs"
      ON audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' AND policyname = 'Users can read their own audit logs'
  ) THEN
    CREATE POLICY "Users can read their own audit logs"
      ON audit_logs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Check if policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' AND policyname = 'Admins can read all audit logs'
  ) THEN
    CREATE POLICY "Admins can read all audit logs"
      ON audit_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND username ILIKE '%admin%'
        )
      );
  END IF;
END
$$;

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for tracking user actions and system events';