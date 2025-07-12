-- Create user_condominiums table
CREATE TABLE IF NOT EXISTS user_condominiums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'resident', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, condominium_id)
);

-- Add RLS policies
ALTER TABLE user_condominiums ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own condominiums" ON user_condominiums;
DROP POLICY IF EXISTS "Users can insert their own condominiums" ON user_condominiums;
DROP POLICY IF EXISTS "Users can update their own condominiums" ON user_condominiums;
DROP POLICY IF EXISTS "Users can delete their own condominiums" ON user_condominiums;

-- Create policies
CREATE POLICY "Users can view their own condominiums" ON user_condominiums
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own condominiums" ON user_condominiums
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own condominiums" ON user_condominiums
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own condominiums" ON user_condominiums
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_condominiums_updated_at ON user_condominiums;
CREATE TRIGGER update_user_condominiums_updated_at
  BEFORE UPDATE ON user_condominiums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data for existing users and condominiums
INSERT INTO user_condominiums (user_id, condominium_id, role)
SELECT 
  auth.uid(),
  c.id,
  'admin'
FROM condominiums c
WHERE NOT EXISTS (
  SELECT 1 FROM user_condominiums uc 
  WHERE uc.user_id = auth.uid() 
  AND uc.condominium_id = c.id
); 