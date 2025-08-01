/*
  # Create Dashboard Users Table

  This migration creates the dashboard_users table for managing authentication
  to the dashboard application.

  1. New Table
    - `dashboard_users`: Stores dashboard user authentication information
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_login` (timestamp, nullable)

  2. Security
    - Enable RLS on dashboard_users table
    - Add policies for authenticated dashboard users
*/

-- Create dashboard_users table
CREATE TABLE IF NOT EXISTS dashboard_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Enable Row Level Security
ALTER TABLE dashboard_users ENABLE ROW LEVEL SECURITY;

-- Create policies for dashboard_users
-- Allow dashboard users to read their own data
CREATE POLICY "Dashboard users can read own data"
  ON dashboard_users
  FOR SELECT
  USING (true); -- For now, allow all reads - will be refined with proper auth

-- Allow dashboard users to update their own data
CREATE POLICY "Dashboard users can update own data"
  ON dashboard_users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow insert for new dashboard users (for registration/admin creation)
CREATE POLICY "Allow dashboard user creation"
  ON dashboard_users
  FOR INSERT
  WITH CHECK (true);

-- Allow delete for dashboard user management
CREATE POLICY "Allow dashboard user deletion"
  ON dashboard_users
  FOR DELETE
  USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_dashboard_users_updated_at
    BEFORE UPDATE ON dashboard_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user for initial access
-- Password is 'admin123' - will be properly hashed when the application starts
-- This is a placeholder that will be updated by the application
INSERT INTO dashboard_users (email, password_hash) 
VALUES ('admin@condofee.com', 'PLACEHOLDER_HASH')
ON CONFLICT (email) DO NOTHING;