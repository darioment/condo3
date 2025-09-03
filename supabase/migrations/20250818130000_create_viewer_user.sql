-- Create a viewer user in the dashboard_users table
INSERT INTO public.dashboard_users (email, password_hash)
VALUES ('viewer@example.com', '$2b$12$KGvsXBwgnTSCG5EI7RGox..Qv9ddCibFFzqoxoeFRxKnuuvFRJ./q');

-- Assign the viewer role to the new user for the first available condominium
INSERT INTO public.user_condominiums (user_id, condominium_id, role)
SELECT
    (SELECT id FROM public.dashboard_users WHERE email = 'viewer@example.com'),
    c.id,
    'viewer'
FROM public.condominiums c
LIMIT 1
ON CONFLICT (user_id, condominium_id) DO NOTHING;
