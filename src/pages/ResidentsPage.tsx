import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Condominium, Resident } from '../types';
import CondoSelect from '../components/CondoSelect';
import ResidentForm from '../components/ResidentForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const ResidentsPage: React.FC = () => {
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  
  // Estado para gestionar formularios y diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null);

  // Fetch condominiums
  useEffect(() => {
    const fetchCondominiums = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('condominiums')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data) {
          setCondominiums(data);
          if (data.length > 0 && !selectedCondo) {
            setSelectedCondo(data[0]);
          }
        }
      } catch (error: any) {
        console.error('Error fetching condominiums:', error);
        toast.error(`Error al cargar los condominios: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCondominiums();
  }, []);

  // Fetch residents when selectedCondo changes
  useEffect(() => {
    fetchResidents();
  }, [selectedCondo]);
  
  // Función para obtener residentes
  const fetchResidents = async () => {
    if (!selectedCondo) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .order('unit_number');

      if (error) throw error;

      if (data) {
        setResidents(data);
      }
    } catch (error: any) {
      console.error('Error fetching residents:', error);
      toast.error(`Error al cargar los residentes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para crear o actualizar un residente
  const saveResident = async (residentData: Partial<Resident>) => {
    try {
      setLoading(true);
      
      // Si estamos editando, actualizamos el residente existente
      if (editingResident) {
        const { data, error } = await supabase
          .from('residents')
          .update({
            name: residentData.name,
            unit_number: residentData.unit_number,
            contact_info: residentData.contact_info,
            bank_info: residentData.bank_info,
            account_number: residentData.account_number,
            email: residentData.email,
            phone: residentData.phone,
            is_active: residentData.is_active
          })
          .eq('id', editingResident.id)
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          setResidents(prev => prev.map(r => r.id === data[0].id ? data[0] : r));
          toast.success('Residente actualizado correctamente');
        }
      } 
      // Si es un nuevo residente
      else {
        // Asegurarnos de que el condominium_id está incluido
        const newResidentData = {
          ...residentData,
          condominium_id: selectedCondo?.id
        };
        
        const { data, error } = await supabase
          .from('residents')
          .insert([newResidentData])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          setResidents(prev => [...prev, data[0]]);
          toast.success('Residente creado correctamente');
        }
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingResident(null);
      setShowForm(false);
    } catch (error: any) {
      console.error('Error guardando residente:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar un residente
  const deleteResident = async () => {
    if (!residentToDelete) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', residentToDelete.id);
        
      if (error) throw error;
      
      setResidents(prev => prev.filter(r => r.id !== residentToDelete.id));
      toast.success('Residente eliminado correctamente');
      
      // Limpiar el estado y cerrar el diálogo
      setResidentToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error eliminando residente:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir formulario para editar
  const handleEdit = (resident: Resident) => {
    setEditingResident(resident);
    setShowForm(true);
  };
  
  // Abrir diálogo de confirmación para eliminar
  const handleDelete = (resident: Resident) => {
    setResidentToDelete(resident);
    setShowDeleteConfirm(true);
  };

  // Filter residents based on search term
  const filteredResidents = residents.filter(resident => 
    resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resident.unit_number.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!condominiums || condominiums.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600">No hay condominios disponibles</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Residentes
        </h1>
        <CondoSelect
          condominiums={condominiums}
          selectedCondominium={selectedCondo}
          onSelect={setSelectedCondo}
        />
      </div>
      
      {!selectedCondo ? (
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-600">Seleccione un condominio</h2>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-blue-900 mb-4 sm:mb-0">
              {selectedCondo.name} - Directorio de Residentes
            </h2>
            
            <div className="flex space-x-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar residente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <Search size={18} />
                </div>
              </div>
              
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                onClick={() => setShowForm(true)}
              >
                <Plus size={18} className="mr-1" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Banco
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuenta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResidents.length > 0 ? (
                  filteredResidents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {resident.unit_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {resident.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {resident.contact_info || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {resident.bank_info || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {resident.account_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-blue-600 hover:text-blue-900 mr-3 focus:outline-none"
                          onClick={() => handleEdit(resident)}
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 focus:outline-none"
                          onClick={() => handleDelete(resident)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No se encontraron residentes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              Mostrando {filteredResidents.length} de {residents.length} residentes
            </span>
          </div>
        </div>
      )}

      {/* Formulario para crear/editar residentes */}
      {showForm && (
        <ResidentForm
          resident={editingResident || undefined}
          onSave={saveResident}
          onCancel={() => {
            setShowForm(false);
            setEditingResident(null);
          }}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && residentToDelete && (
        <ConfirmDialog
          title="Eliminar Residente"
          message={`¿Está seguro que desea eliminar a ${residentToDelete.name}? Esta acción no se puede deshacer.`}
          onConfirm={deleteResident}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setResidentToDelete(null);
          }}
          confirmText="Eliminar"
        />
      )}
    </div>
  );
};

export default ResidentsPage;
