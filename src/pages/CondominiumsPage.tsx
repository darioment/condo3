import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Loader2, Home, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Condominium } from '../types';
import CondominiumForm from '../components/CondominiumForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const CondominiumsPage: React.FC = () => {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para gestionar formularios y diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingCondominium, setEditingCondominium] = useState<Condominium | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [condominiumToDelete, setCondominiumToDelete] = useState<Condominium | null>(null);

  // Cargar condominios
  useEffect(() => {
    fetchCondominiums();
  }, []);

  // Función para obtener condominios
  const fetchCondominiums = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('condominiums')
        .select('*, residents(count)')
        .order('name');

      if (error) throw error;

      if (data) {
        setCondominiums(data);
      }
    } catch (error: any) {
      console.error('Error fetching condominiums:', error);
      toast.error(`Error al cargar los condominios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para crear o actualizar un condominio
  const saveCondominium = async (condominiumData: Partial<Condominium>) => {
    try {
      setLoading(true);
      
      // Si estamos editando, actualizamos el condominio existente
      if (editingCondominium) {
        const { data, error } = await supabase
          .from('condominiums')
          .update({
            name: condominiumData.name,
            address: condominiumData.address,
            description: condominiumData.description,
            is_active: condominiumData.is_active
          })
          .eq('id', editingCondominium.id)
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          setCondominiums(prev => prev.map(c => c.id === data[0].id ? data[0] : c));
          toast.success('Condominio actualizado correctamente');
        }
      } 
      // Si es un nuevo condominio
      else {
        const { data, error } = await supabase
          .from('condominiums')
          .insert([condominiumData])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          setCondominiums(prev => [...prev, data[0]]);
          toast.success('Condominio creado correctamente');
        }
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingCondominium(null);
      setShowForm(false);
    } catch (error: any) {
      console.error('Error guardando condominio:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar un condominio
  const deleteCondominium = async () => {
    if (!condominiumToDelete) return;
    
    try {
      setLoading(true);
      
      // Primero verificamos si hay residentes asociados
      const { data: residentsData, error: residentsError } = await supabase
        .from('residents')
        .select('id')
        .eq('condominium_id', condominiumToDelete.id);
        
      if (residentsError) throw residentsError;
      
      if (residentsData && residentsData.length > 0) {
        toast.error('No se puede eliminar un condominio con residentes asociados');
        setCondominiumToDelete(null);
        setShowDeleteConfirm(false);
        setLoading(false);
        return;
      }
      
      // Si no hay residentes, procedemos a eliminar
      const { error } = await supabase
        .from('condominiums')
        .delete()
        .eq('id', condominiumToDelete.id);
        
      if (error) throw error;
      
      setCondominiums(prev => prev.filter(c => c.id !== condominiumToDelete.id));
      toast.success('Condominio eliminado correctamente');
      
      // Limpiar el estado y cerrar el diálogo
      setCondominiumToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error eliminando condominio:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir formulario para editar
  const handleEdit = (condominium: Condominium) => {
    setEditingCondominium(condominium);
    setShowForm(true);
  };
  
  // Abrir diálogo de confirmación para eliminar
  const handleDelete = (condominium: Condominium) => {
    setCondominiumToDelete(condominium);
    setShowDeleteConfirm(true);
  };

  // Filtrar condominios por término de búsqueda
  const filteredCondominiums = condominiums.filter(condo => 
    condo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (condo.address && condo.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Condominios
        </h1>
        
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar condominio..."
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
      
      {filteredCondominiums.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No hay condominios disponibles</h2>
          <p className="text-gray-500 mb-6">Comienza creando tu primer condominio</p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} className="mr-1" />
            <span>Nuevo Condominio</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCondominiums.map((condo) => (
            <div key={condo.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">{condo.name}</h3>
                  <div className="flex space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-900 focus:outline-none"
                      onClick={() => handleEdit(condo)}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900 focus:outline-none"
                      onClick={() => handleDelete(condo)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                {condo.address && (
                  <div className="flex items-start mb-3">
                    <Home size={16} className="text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{condo.address}</p>
                  </div>
                )}
                
                <div className="flex items-start mb-3">
                  <Users size={16} className="text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
                    {condo.residents ? `${condo.residents.count} residentes` : '0 residentes'}
                  </p>
                </div>
                
                {condo.description && (
                  <p className="text-sm text-gray-600 mb-5 line-clamp-2">{condo.description}</p>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${condo.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-gray-500">{condo.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  
                  <Link
                    to={`/residents?condo=${condo.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Ver residentes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Formulario para crear/editar condominios */}
      {showForm && (
        <CondominiumForm
          condominium={editingCondominium || undefined}
          onSave={saveCondominium}
          onCancel={() => {
            setShowForm(false);
            setEditingCondominium(null);
          }}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && condominiumToDelete && (
        <ConfirmDialog
          title="Eliminar Condominio"
          message={`¿Está seguro que desea eliminar el condominio ${condominiumToDelete.name}? Esta acción no se puede deshacer.`}
          onConfirm={deleteCondominium}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setCondominiumToDelete(null);
          }}
          confirmText="Eliminar"
        />
      )}
    </div>
  );
};

export default CondominiumsPage;
