-- Add a role column to the dashboard_users table
ALTER TABLE public.dashboard_users ADD COLUMN role text DEFAULT 'viewer';

-- Update the admin user to have the admin role
UPDATE public.dashboard_users SET role = 'admin' WHERE email = 'admin@condofee.com';

-- Function to get the current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.dashboard_users
  WHERE id = (SELECT id FROM public.dashboard_users WHERE email = (auth.jwt() ->> 'email'));
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- financial_summaries
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage financial summaries" ON financial_summaries;
DROP POLICY IF EXISTS "Viewers can read financial summaries" ON financial_summaries;

-- Create new role-aware policies
CREATE POLICY "Admins can manage financial summaries" ON financial_summaries
  FOR ALL
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Viewers can read financial summaries" ON financial_summaries
  FOR SELECT
  USING (get_current_user_role() = 'viewer');


-- gasto_tipo_conceptos
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage gasto tipo conceptos" ON gasto_tipo_conceptos;
DROP POLICY IF EXISTS "Viewers can read gasto tipo conceptos" ON gasto_tipo_conceptos;

-- Create new role-aware policies
CREATE POLICY "Admins can manage gasto tipo conceptos" ON gasto_tipo_conceptos
  FOR ALL
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Viewers can read gasto tipo conceptos" ON gasto_tipo_conceptos
  FOR SELECT
  USING (get_current_user_role() = 'viewer');


-- dashboard_users
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage dashboard users" ON dashboard_users;
DROP POLICY IF EXISTS "Users can view their own data" ON dashboard_users;

-- Create new role-aware policies
CREATE POLICY "Admins can manage dashboard users" ON dashboard_users
  FOR ALL
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Users can view their own data" ON dashboard_users
  FOR SELECT
  USING (id = (SELECT id FROM public.dashboard_users WHERE email = (auth.jwt() ->> 'email')));
