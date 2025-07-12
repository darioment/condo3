import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, CreditCard } from 'lucide-react';
import { GastoTipo, Concepto, Condominium } from '../types';
import GastoTipoForm from '../components/GastoTipoForm';
import ConfirmDialog from '../components/ConfirmDialog';
import CondoSelect from '../components/CondoSelect';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const GastoTiposPage: React.FC = () => {
  const [gastoTipos, setGastoTipos] = useState<GastoTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  
  // Estado para gestionar formularios y diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingGastoTipo, setEditingGastoTipo] = useState<GastoTipo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<GastoTipo | null>(null);

  // Nuevos estados para gestionar conceptos y asignaciones para tipos no generales
  const [allConceptos, setAllConceptos] = useState<Concepto[]>([]);
  const [assignedConceptoIds, setAssignedConceptoIds] = useState<string[]>([]);

  // Cargar condominios al inicio
  useEffect(() => {
    fetchCondominiums();
  }, []);

  // Cargar tipos de gasto cuando cambia el condominio seleccionado
  useEffect(() => {
    if (selectedCondo) {
      fetchGastoTipos();
    } else {
      setGastoTipos([]);
    }
  }, [selectedCondo]);

  // Función para obtener condominios
  const fetchCondominiums = async () => {
    try {
      const { data, error } = await supabase
        .from('condominiums')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        setCondominiums(data);
        if (data.length > 0) {
          setSelectedCondo(data[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching condominiums:', error);
      toast.error(`Error al cargar los condominios: ${error.message}`);
    }
  };

  // Función para obtener tipos de gasto
  const fetchGastoTipos = async () => {
    if (!selectedCondo) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gasto_tipos')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .order('name');

      if (error) throw error;

      if (data) {
        setGastoTipos(data);
      }
    } catch (error: any) {
      console.error('Error fetching gasto tipos:', error);
      toast.error(`Error al cargar los tipos de gasto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener todos los conceptos
  const fetchAllConceptos = async () => {
    if (!selectedCondo) return;

    try {
      const { data, error } = await supabase
        .from('conceptos')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .eq('is_active', true)
        .order('nombre');

      if (error) throw error;

      if (data) {
        setAllConceptos(data);
      }
    } catch (error: any) {
      console.error('Error fetching conceptos:', error);
      toast.error(`Error al cargar los conceptos: ${error.message}`);
    }
  };

  // Función para guardar un tipo de gasto
  const saveGastoTipo = async (gastoTipoData: Partial<GastoTipo>, assignedConceptoIds?: string[]) => {
    if (!selectedCondo) {
      toast.error('Debe seleccionar un condominio');
      return;
    }

    try {
      setLoading(true);
      let savedGastoTipo: GastoTipo | null = null;
      
      // Agregar el condominium_id al tipo de gasto
      const gastoTipoWithCondo = {
        ...gastoTipoData,
        condominium_id: selectedCondo.id
      };
      
      // Si estamos editando, actualizamos el tipo existente
      if (editingGastoTipo) {
        const { data, error } = await supabase
          .from('gasto_tipos')
          .update({
            name: gastoTipoWithCondo.name,
            description: gastoTipoWithCondo.description,
            is_active: gastoTipoWithCondo.is_active,
            is_general: gastoTipoWithCondo.is_general,
            condominium_id: gastoTipoWithCondo.condominium_id
          })
          .eq('id', editingGastoTipo.id)
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          savedGastoTipo = data[0];
          // Actualizamos el estado local del tipo de gasto
          setGastoTipos(prev => prev.map(gt => gt.id === savedGastoTipo!.id ? savedGastoTipo! : gt));
          toast.success('Tipo de gasto actualizado correctamente');
        } else {
          throw new Error('No se pudo actualizar el tipo de gasto');
        }
      } 
      // Si es un nuevo tipo de gasto
      else {
        const { data, error } = await supabase
          .from('gasto_tipos')
          .insert([gastoTipoWithCondo])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          savedGastoTipo = data[0];
          // Agregamos el nuevo tipo al estado local
          setGastoTipos(prev => [...prev, savedGastoTipo!]);
          toast.success('Tipo de gasto creado correctamente');
        } else {
          throw new Error('No se pudo crear el tipo de gasto');
        }
      }

      // Si el tipo de gasto no es general y hay conceptos asignados
      if (!gastoTipoData.is_general && assignedConceptoIds && assignedConceptoIds.length > 0 && savedGastoTipo) {
        // Primero eliminamos todas las asignaciones existentes
        const { error: deleteError } = await supabase
          .from('gasto_tipo_conceptos')
          .delete()
          .eq('gasto_tipo_id', savedGastoTipo.id);

        if (deleteError) throw deleteError;

        // Luego insertamos las nuevas asignaciones
        const asignaciones = assignedConceptoIds.map(conceptoId => ({
          gasto_tipo_id: savedGastoTipo!.id,
          concepto_id: conceptoId
        }));

        const { error: insertError } = await supabase
          .from('gasto_tipo_conceptos')
          .insert(asignaciones);

        if (insertError) throw insertError;
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingGastoTipo(null);
      setShowForm(false);
      setAssignedConceptoIds([]);
      setAllConceptos([]);

    } catch (error: any) {
      console.error('Error guardando tipo de gasto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar un tipo de gasto
  const deleteGastoTipo = async () => {
    if (!tipoToDelete) return;
    
    try {
      setLoading(true);
      
      // Primero verificamos si hay gastos asociados
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos')
        .select('id')
        .eq('gasto_tipo', tipoToDelete.id)
        .limit(1);
        
      if (gastosError) throw gastosError;
      
      if (gastosData && gastosData.length > 0) {
        toast.error('No se puede eliminar un tipo de gasto con gastos asociados');
        setTipoToDelete(null);
        setShowDeleteConfirm(false);
        setLoading(false);
        return;
      }
      
      // Si no hay gastos, procedemos a eliminar
      const { error } = await supabase
        .from('gasto_tipos')
        .delete()
        .eq('id', tipoToDelete.id);
        
      if (error) throw error;
      
      setGastoTipos(prev => prev.filter(gt => gt.id !== tipoToDelete.id));
      toast.success('Tipo de gasto eliminado correctamente');
      
      // Limpiar el estado y cerrar el diálogo
      setTipoToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error eliminando tipo de gasto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir formulario para crear nuevo tipo de gasto
  const handleNewType = async () => {
    if (!selectedCondo) {
      toast.error('Debe seleccionar un condominio');
      return;
    }

    try {
      setLoading(true);
      
      // Cargamos los conceptos del condominio
      const { data: conceptosData, error: conceptosError } = await supabase
        .from('conceptos')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .eq('is_active', true)
        .order('nombre');

      if (conceptosError) throw conceptosError;

      if (conceptosData) {
        setAllConceptos(conceptosData);
      }

      // Limpiamos el estado y abrimos el formulario
      setEditingGastoTipo(null);
      setAssignedConceptoIds([]);
      setShowForm(true);

    } catch (error: any) {
      console.error('Error al cargar conceptos:', error);
      toast.error(`Error: ${error.message}`);
      setAllConceptos([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir formulario para editar
  const handleEdit = async (gastoTipo: GastoTipo) => {
    try {
      setLoading(true);
      
      // Primero cargamos los conceptos del condominio
      const { data: conceptosData, error: conceptosError } = await supabase
        .from('conceptos')
        .select('*')
        .eq('condominium_id', selectedCondo?.id)
        .eq('is_active', true)
        .order('nombre');

      if (conceptosError) throw conceptosError;

      if (conceptosData) {
        setAllConceptos(conceptosData);
      }

      // Si el tipo de gasto NO es general, cargar las asignaciones existentes
      if (!gastoTipo.is_general) {
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from('gasto_tipo_conceptos')
          .select('concepto_id')
          .eq('gasto_tipo_id', gastoTipo.id);
        
        if (asignacionesError) throw asignacionesError;
        
        if (asignacionesData) {
          setAssignedConceptoIds(asignacionesData.map(item => item.concepto_id));
        }
      } else {
        setAssignedConceptoIds([]);
      }

      // Finalmente, abrimos el formulario con el tipo de gasto
      setEditingGastoTipo(gastoTipo);
      setShowForm(true);

    } catch (error: any) {
      console.error('Error al cargar datos para edición:', error);
      toast.error(`Error: ${error.message}`);
      setAllConceptos([]);
      setAssignedConceptoIds([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir diálogo de confirmación para eliminar
  const handleDelete = (gastoTipo: GastoTipo) => {
    setTipoToDelete(gastoTipo);
    setShowDeleteConfirm(true);
  };

  if (loading && gastoTipos.length === 0) {
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
          Tipos de gastos
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <CondoSelect
            condominiums={condominiums}
            selectedCondominium={selectedCondo}
            onSelect={setSelectedCondo}
          />
          
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            onClick={handleNewType}
            disabled={!selectedCondo}
          >
            <Plus size={18} className="mr-1" />
            <span>Nuevo Tipo</span>
          </button>
        </div>
      </div>
      
      {!selectedCondo ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Seleccione un condominio</h2>
          <p className="text-gray-500">Por favor, seleccione un condominio para ver sus tipos de gastos</p>
        </div>
      ) : gastoTipos.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No hay tipos de gastos configurados</h2>
          <p className="text-gray-500 mb-6">Comienza creando tu primer tipo de gasto</p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center"
            onClick={handleNewType}
          >
            <Plus size={18} className="mr-1" />
            <span>Nuevo Tipo de Gasto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gastoTipos.map((tipo) => (
            <div key={tipo.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <CreditCard className="text-blue-600 mr-3" size={22} />
                    <h3 className="text-lg font-semibold text-gray-800 truncate">{tipo.name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-900 focus:outline-none"
                      onClick={() => handleEdit(tipo)}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900 focus:outline-none"
                      onClick={() => handleDelete(tipo)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                {tipo.description && (
                  <p className="text-sm text-gray-600 mb-5">{tipo.description}</p>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${tipo.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-gray-500">{tipo.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Formulario para crear/editar tipos de gasto */}
      {showForm && (
        <GastoTipoForm
          gastoTipo={editingGastoTipo || undefined}
          onSave={saveGastoTipo}
          onCancel={() => {
            setShowForm(false);
            setEditingGastoTipo(null);
            setAssignedConceptoIds([]);
            setAllConceptos([]);
          }}
          allConceptos={allConceptos}
          assignedConceptoIds={assignedConceptoIds}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && tipoToDelete && (
        <ConfirmDialog
          title="Eliminar Tipo de Gasto"
          message={`¿Está seguro que desea eliminar el tipo de gasto "${tipoToDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={deleteGastoTipo}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setTipoToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default GastoTiposPage; 