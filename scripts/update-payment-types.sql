-- Crear la tabla payment_types si no existe
CREATE TABLE IF NOT EXISTS payment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar tipos de pago predeterminados
INSERT INTO payment_types (name, description, is_active)
VALUES
  ('Mantenimiento', 'Cuota regular de mantenimiento mensual', TRUE),
  ('Estacionamiento', 'Cuota por uso de estacionamiento', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Agregar el campo payment_type_id a la tabla payments si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'payment_type_id'
  ) THEN
    -- Agregar la columna
    ALTER TABLE payments ADD COLUMN payment_type_id UUID;
    
    -- Crear restricción de clave externa
    ALTER TABLE payments 
    ADD CONSTRAINT fk_payment_type
    FOREIGN KEY (payment_type_id) 
    REFERENCES payment_types(id);
    
    -- Asignar todos los pagos existentes al tipo "Mantenimiento"
    UPDATE payments 
    SET payment_type_id = (SELECT id FROM payment_types WHERE name = 'Mantenimiento' LIMIT 1)
    WHERE payment_type_id IS NULL;
    
    -- Hacer que la columna sea NOT NULL después de migrar los datos
    ALTER TABLE payments ALTER COLUMN payment_type_id SET NOT NULL;
  END IF;
END $$;
