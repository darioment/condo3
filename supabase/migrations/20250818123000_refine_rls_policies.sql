
-- Refine RLS policies for existing tables to be role-aware

-- Function to check user role against the user_condominiums table
CREATE OR REPLACE FUNCTION check_user_role(user_id_to_check uuid, role_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_condominiums
    WHERE user_id = user_id_to_check AND role = role_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- financial_summaries
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON financial_summaries;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON financial_summaries;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON financial_summaries;

-- Create new role-aware policies
CREATE POLICY "Admins can manage financial summaries" ON financial_summaries
  FOR ALL
  USING (check_user_role(auth.uid(), 'admin'))
  WITH CHECK (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Viewers can read financial summaries" ON financial_summaries
  FOR SELECT
  USING (check_user_role(auth.uid(), 'viewer'));


-- gasto_tipo_conceptos
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON gasto_tipo_conceptos;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON gasto_tipo_conceptos;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON gasto_tipo_conceptos;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON gasto_tipo_conceptos;

-- Create new role-aware policies
CREATE POLICY "Admins can manage gasto tipo conceptos" ON gasto_tipo_conceptos
  FOR ALL
  USING (check_user_role(auth.uid(), 'admin'))
  WITH CHECK (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Viewers can read gasto tipo conceptos" ON gasto_tipo_conceptos
  FOR SELECT
  USING (check_user_role(auth.uid(), 'viewer'));


-- dashboard_users
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Dashboard users can read own data" ON dashboard_users;
DROP POLICY IF EXISTS "Dashboard users can update own data" ON dashboard_users;
DROP POLICY IF EXISTS "Allow dashboard user creation" ON dashboard_users;
DROP POLICY IF EXISTS "Allow dashboard user deletion" ON dashboard_users;

-- Create new role-aware policies
CREATE POLICY "Admins can manage dashboard users" ON dashboard_users
  FOR ALL
  USING (check_user_role(auth.uid(), 'admin'))
  WITH CHECK (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own data" ON dashboard_users
  FOR SELECT
  USING (id = auth.uid());




