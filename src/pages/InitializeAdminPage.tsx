import React, { useState } from 'react';
import { Shield, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const InitializeAdminPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeAdmin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const adminEmail = 'admin@condofee.com';
      const defaultPassword = 'admin123';
      
      console.log('🔐 Iniciando proceso de inicialización...');
      console.log('📧 Email:', adminEmail);
      
      // Primero eliminar cualquier usuario existente con hash inválido
      console.log('🗑️ Eliminando usuario existente...');
      await supabase
        .from('dashboard_users')
        .delete()
        .eq('email', adminEmail);
      
      console.log('🔑 Hasheando contraseña...');
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      console.log('✅ Hash generado:', hashedPassword.substring(0, 20) + '...');
      
      console.log('💾 Insertando usuario en base de datos...');
      const { data, error: dbError } = await supabase
        .from('dashboard_users')
        .insert({
          email: adminEmail,
          password_hash: hashedPassword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (dbError) {
        console.error('❌ Error de base de datos:', dbError);
        throw new Error(`Error de base de datos: ${dbError.message}`);
      }
      
      console.log('🎉 Usuario admin inicializado exitosamente:', data);
      setSuccess(true);
      
    } catch (err: any) {
      console.error('❌ Error inicializando admin:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              ¡Administrador Inicializado!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              El usuario administrador ha sido creado exitosamente
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Credenciales de Acceso
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 p-2 bg-gray-50 rounded border">
                  <code className="text-sm">admin@condofee.com</code>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <div className="mt-1 p-2 bg-gray-50 rounded border">
                  <code className="text-sm">admin123</code>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Importante
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Cambia la contraseña después del primer login por seguridad.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Key className="h-4 w-4 mr-2" />
              Ir al Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Inicializar Administrador
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Configura el usuario administrador inicial del sistema
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">Error</h4>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            ¿Qué hace esto?
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Crea el usuario administrador inicial</li>
            <li>• Email: admin@condofee.com</li>
            <li>• Contraseña temporal: admin123</li>
            <li>• Hashea la contraseña de forma segura</li>
          </ul>
        </div>

        <div className="text-center">
          <button
            onClick={initializeAdmin}
            disabled={loading}
            className={`inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Inicializando...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                Inicializar Administrador
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InitializeAdminPage;