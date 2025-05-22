import React, { useState } from 'react';
import { Save, PlusCircle } from 'lucide-react';
import { condominiums } from '../data/mockData';
import CondoSelect from '../components/CondoSelect';

const SettingsPage: React.FC = () => {
  const [selectedCondo, setSelectedCondo] = useState(condominiums[0]);
  const [condoName, setCondoName] = useState(selectedCondo.name);
  const [condoAddress, setCondoAddress] = useState(selectedCondo.address);
  const [monthlyFee, setMonthlyFee] = useState(selectedCondo.monthlyFee.toString());
  const [units, setUnits] = useState(selectedCondo.units.toString());
  
  // Update form when selected condominium changes
  React.useEffect(() => {
    setCondoName(selectedCondo.name);
    setCondoAddress(selectedCondo.address);
    setMonthlyFee(selectedCondo.monthlyFee.toString());
    setUnits(selectedCondo.units.toString());
  }, [selectedCondo]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would update the condominium settings
    alert('Configuración guardada exitosamente');
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Configuración
        </h1>
        <CondoSelect
          condominiums={condominiums}
          selectedCondominium={selectedCondo}
          onSelect={setSelectedCondo}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Condominium Settings */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-blue-900">
                Información del Condominio
              </h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="condoName" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Condominio
                    </label>
                    <input
                      type="text"
                      id="condoName"
                      value={condoName}
                      onChange={(e) => setCondoName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="condoAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      id="condoAddress"
                      value={condoAddress}
                      onChange={(e) => setCondoAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="monthlyFee" className="block text-sm font-medium text-gray-700 mb-1">
                        Cuota Mensual (MXN)
                      </label>
                      <input
                        type="number"
                        id="monthlyFee"
                        value={monthlyFee}
                        onChange={(e) => setMonthlyFee(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="units" className="block text-sm font-medium text-gray-700 mb-1">
                        Número de Unidades
                      </label>
                      <input
                        type="number"
                        id="units"
                        value={units}
                        onChange={(e) => setUnits(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                    >
                      <Save size={18} className="mr-2" />
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          {/* User Permissions */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-blue-900">
                Permisos de Usuario
              </h2>
              <button className="text-blue-600 hover:text-blue-800 flex items-center">
                <PlusCircle size={18} className="mr-1" />
                <span>Agregar Usuario</span>
              </button>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Administrador
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        admin@example.com
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        Administrador
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Activo
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Tesorero
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        tesorero@example.com
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        Editor
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Activo
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Asistente
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        asistente@example.com
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        Visualizador
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inactivo
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* System Settings */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-blue-900">
                Configuración del Sistema
              </h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700">Enviar recordatorios automáticos</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked />
                    <span className="ml-2 text-sm text-gray-700">Mostrar saldos negativos en rojo</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked />
                    <span className="ml-2 text-sm text-gray-700">Generar reportes automáticos mensuales</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-700">Permitir pagos parciales</span>
                  </label>
                </div>
              </div>
              
              <hr className="my-6" />
              
              <div>
                <label htmlFor="backupFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                  Frecuencia de Respaldo
                </label>
                <select
                  id="backupFrequency"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option>Diariamente</option>
                  <option>Semanalmente</option>
                  <option selected>Mensualmente</option>
                  <option>Nunca</option>
                </select>
              </div>
              
              <button
                className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Guardar Preferencias
              </button>
            </div>
          </div>
          
          {/* Version Info */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h2 className="text-lg font-semibold text-blue-900">
                Información del Sistema
              </h2>
            </div>
            
            <div className="p-6">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Versión</dt>
                  <dd className="text-sm text-gray-900">1.0.0</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Última actualización</dt>
                  <dd className="text-sm text-gray-900">15/11/2025</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Licencia</dt>
                  <dd className="text-sm text-gray-900">Profesional</dd>
                </div>
              </dl>
              
              <button
                className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                Buscar Actualizaciones
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;