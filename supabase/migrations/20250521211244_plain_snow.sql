/*
  # Insert Sample Data

  This migration adds sample data for testing purposes:
  1. Insert condominiums
  2. Insert residents
  3. Insert payments
*/

-- Insert sample condominium
INSERT INTO condominiums (id, name, address, monthly_fee, units)
VALUES (
  'f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0',
  'Fuente Azul',
  'Calle Principal 123',
  100.00,
  24
);

-- Insert sample residents
INSERT INTO residents (condominium_id, name, unit_number, bank_info, account_number, contact_info) VALUES
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'Luis Miguel Salinas Urbina', '1', 'BANCOPEL', '***342', '835545'),
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'Tania Casas Ochoa', '2', 'BANCO AZTECA', '***1102', '596372'),
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'Jaimin Jafet Guerrero Vallejo', '3', 'BBVAMEXICO', '***2588', '632686'),
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'AMANDA GASCON MUÑOZ', '4', 'BBVAMEXICO', '***0882 / ***3223', '664754'),
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'Graciela Oseca Alcantara', '5', 'Bwa', '***4999', '958988'),
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'Felipe Pérez Arzate', '7', '', '', '286664'),
  ('f0f0f0f0-f0f0-f0f0-f0f0-f0f0f0f0f0f0', 'Roberto Hernandez Garcia', '9', 'SANTANDER', '***5175', '269328');

-- Insert sample payments for the first 5 months of 2024
INSERT INTO payments (resident_id, amount, payment_date, month, year, status)
SELECT 
  r.id,
  100.00,
  make_date(2024, (gs.month)::integer, 15),
  (
    CASE (gs.month)::integer
      WHEN 1 THEN 'ENE'
      WHEN 2 THEN 'FEB'
      WHEN 3 THEN 'MAR'
      WHEN 4 THEN 'ABR'
      WHEN 5 THEN 'MAY'
    END
  ),
  2024,
  'paid'
FROM residents r
CROSS JOIN generate_series(1, 5) gs(month)
WHERE r.unit_number IN ('1', '3', '4', '7', '9');