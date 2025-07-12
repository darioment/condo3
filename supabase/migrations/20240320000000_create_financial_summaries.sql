-- Create financial_summaries table
CREATE TABLE IF NOT EXISTS financial_summaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  saldo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_final DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(condominium_id, year)
);

-- Add RLS policies
ALTER TABLE financial_summaries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON financial_summaries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON financial_summaries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON financial_summaries;

-- Create new policies with proper conditions
CREATE POLICY "Enable read access for authenticated users" ON financial_summaries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON financial_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON financial_summaries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_financial_summaries_updated_at ON financial_summaries;
CREATE TRIGGER update_financial_summaries_updated_at
  BEFORE UPDATE ON financial_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 