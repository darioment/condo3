import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase - reemplaza con tus valores reales
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necesitas la service role key

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos');
  console.log('Configura estas variables de entorno:');
  console.log('VITE_SUPABASE_URL=tu_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initializeAdmin() {
  try {
    console.log('Inicializando usuario administrador...');
    
    // Contraseña por defecto
    const defaultPassword = 'admin123';
    const adminEmail = 'admin@condofee.com';
    
    // Hashear la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
    
    console.log('Contraseña hasheada generada');
    
    // Actualizar o insertar el usuario admin
    const { data, error } = await supabase
      .from('dashboard_users')
      .upsert({
        email: adminEmail,
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select();
    
    if (error) {
      console.error('Error al crear/actualizar usuario admin:', error);
      process.exit(1);
    }
    
    console.log('✅ Usuario administrador inicializado exitosamente');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Contraseña:', defaultPassword);
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

initializeAdmin();