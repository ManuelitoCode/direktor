/*
  # User Profile Updates

  1. New Fields
    - Add full_name column to user_profiles table
    - Add country column to user_profiles table
    - Add bio column to user_profiles table
    
  2. Safety
    - Uses conditional checks to avoid errors if columns already exist
*/

-- Add new fields to user_profiles table
DO $$
BEGIN
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name TEXT;
  END IF;

  -- Add country column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN country TEXT;
  END IF;

  -- Add bio column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio TEXT;
  END IF;
END
$$;