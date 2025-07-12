import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, CreditCard, DollarSign } from 'lucide-react';
import { PaymentType, Resident, Condominium } from '../types';
import PaymentTypeForm from '../components/PaymentTypeForm';
import ConfirmDialog from '../components/ConfirmDialog';
import CondoSelect from '../components/CondoSelect';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const PaymentTypesPage: React.FC = () => {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  
  // Estado para gestionar formularios y diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<PaymentType | null>(null);

  // Nuevos estados para gestionar residentes y asignaciones para tipos no generales
  const [allResidents, setAllResidents] = useState<Resident[]>([]);
  const [assignedResidentIds, setAssignedResidentIds] = useState<string[]>([]);

  // Cargar condominios al inicio
  useEffect(() => {
    fetchCondominiums();
  }, []);

  // Cargar tipos de pago cuando cambia el condominio seleccionado
  useEffect(() => {
    if (selectedCondo) {
      fetchPaymentTypes();
    } else {
      setPaymentTypes([]);
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
        if (data.length > 0 && !selectedCondo) {
          setSelectedCondo(data[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching condominiums:', error);
      toast.error(`Error al cargar los condominios: ${error.message}`);
    }
  };

  // Función para obtener tipos de pago
  const fetchPaymentTypes = async () => {
    if (!selectedCondo) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_types')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .order('name');

      if (error) throw error;

      if (data) {
        setPaymentTypes(data);
      }
    } catch (error: any) {
      console.error('Error fetching payment types:', error);
      toast.error(`Error al cargar los tipos de cuota: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener todos los residentes (necesario para asignar a tipos no generales)
  const fetchAllResidents = async () => {
    if (!selectedCondo) {
      toast.error('Debe seleccionar un condominio');
      return;
    }

    try {
      // No establecer loading a true aquí para no interferir con la carga principal
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .eq('is_active', true)
        .order('unit_number');

      if (error) throw error;

      if (data) {
        setAllResidents(data);
      }
    } catch (error: any) {
      console.error('Error fetching all residents:', error);
      // Mostrar un toast si falla, pero la página principal aún puede cargar sin residentes disponibles para asignar
      toast.error(`Error al cargar la lista de residentes: ${error.message}`);
    }
  };

  // Función para crear o actualizar un tipo de pago y sus asignaciones de residentes
  const savePaymentType = async (paymentTypeData: Partial<PaymentType>, assignedResidentIds?: string[]) => {
    if (!selectedCondo) {
      toast.error('Debe seleccionar un condominio');
      return;
    }

    try {
      setLoading(true);
      let savedPaymentType: PaymentType | null = null;
      
      // Agregar el condominium_id y cuota_mensual al tipo de pago
      const paymentTypeWithCondo = {
        ...paymentTypeData,
        condominium_id: selectedCondo.id,
        cuota_mensual: paymentTypeData.cuota_mensual ?? null
      };
      
      // Si estamos editando, actualizamos el tipo existente
      if (editingPaymentType) {
        const { data, error } = await supabase
          .from('payment_types')
          .update({
            name: paymentTypeWithCondo.name,
            description: paymentTypeWithCondo.description,
            is_active: paymentTypeWithCondo.is_active,
            is_general: paymentTypeWithCondo.is_general,
            condominium_id: paymentTypeWithCondo.condominium_id,
            cuota_mensual: paymentTypeWithCondo.cuota_mensual
          })
          .eq('id', editingPaymentType.id)
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          savedPaymentType = data[0];
          // Actualizamos el estado local del tipo de pago
          setPaymentTypes(prev => prev.map(pt => pt.id === savedPaymentType!.id ? savedPaymentType! : pt));
          toast.success('Tipo de pago actualizado correctamente');
        } else {
            throw new Error('No se pudo actualizar el tipo de pago');
        }
      } 
      // Si es un nuevo tipo de pago
      else {
        const { data, error } = await supabase
          .from('payment_types')
          .insert([{ ...paymentTypeWithCondo, cuota_mensual: paymentTypeWithCondo.cuota_mensual }])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          savedPaymentType = data[0];
           // Agregamos el nuevo tipo al estado local
          setPaymentTypes(prev => [...prev, savedPaymentType!]);
          toast.success('Tipo de pago creado correctamente');
        } else {
            throw new Error('No se pudo crear el tipo de pago');
        }
      }

      // Lógica para guardar las asignaciones de residentes si el tipo no es general y es una actualización
      // Si es una creación de tipo no general, las asignaciones se manejan después de obtener el ID
      if (savedPaymentType && !savedPaymentType.is_general) {
        if (!assignedResidentIds) {
             console.warn('Tipo de cuota no general guardado sin IDs de residentes asignados.');
             // Considerar si se debe lanzar un error o simplemente no guardar asignaciones si la lista está vacía
        } else if (savedPaymentType.id) {
             // Eliminar asignaciones existentes para este tipo de cuota
             const { error: deleteError } = await supabase
                .from('resident_payment_types')
                .delete()
                .eq('payment_type_id', savedPaymentType.id);

            if (deleteError) {
                console.error('Error al eliminar asignaciones existentes:', deleteError);
                throw new Error('No se pudieron actualizar las asignaciones de residentes');
            }

            // Insertar nuevas asignaciones
            if (assignedResidentIds.length > 0) {
                const assignmentsToInsert = assignedResidentIds.map(residentId => ({
                    resident_id: residentId,
                    payment_type_id: savedPaymentType.id
                }));

                const { error: insertError } = await supabase
                    .from('resident_payment_types')
                    .insert(assignmentsToInsert);
                
                if (insertError) {
                    console.error('Error al insertar nuevas asignaciones:', insertError);
                     throw new Error('No se pudieron guardar las nuevas asignaciones de residentes');
                }
                toast.info(`Asignados ${assignedResidentIds.length} residentes a este tipo de cuota.`);
            } else {
                 toast.info('No se asignaron residentes a este tipo de cuota.');
            }
        }
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingPaymentType(null);
      setShowForm(false);
      // Opcional: recargar tipos de pago para asegurar que la lista esté actualizada, 
      // aunque la actualización local ya lo hace para el tipo editado/creado.
      // await fetchPaymentTypes(); 

    } catch (error: any) {
      console.error('Error guardando tipo de pago:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar un tipo de pago
  const deletePaymentType = async () => {
    if (!typeToDelete) return;
    
    try {
      setLoading(true);
      
      // Primero verificamos si hay pagos asociados
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_type_id', typeToDelete.id)
        .limit(1);
        
      if (paymentsError) throw paymentsError;
      
      if (paymentsData && paymentsData.length > 0) {
        toast.error('No se puede eliminar un tipo de pago con pagos asociados');
        setTypeToDelete(null);
        setShowDeleteConfirm(false);
        setLoading(false);
        return;
      }
      
      // Si no hay pagos, procedemos a eliminar
      const { error } = await supabase
        .from('payment_types')
        .delete()
        .eq('id', typeToDelete.id);
        
      if (error) throw error;
      
      setPaymentTypes(prev => prev.filter(pt => pt.id !== typeToDelete.id));
      toast.success('Tipo de pago eliminado correctamente');
      
      // Limpiar el estado y cerrar el diálogo
      setTypeToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error eliminando tipo de pago:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir formulario para crear nuevo tipo de pago
  const handleNewType = async () => {
    if (!selectedCondo) {
      toast.error('Debe seleccionar un condominio');
      return;
    }

      setEditingPaymentType(null); // Asegurarse de que sea para crear uno nuevo
      setAssignedResidentIds([]); // Limpiar asignaciones para un nuevo tipo
    
    // Cargar los residentes del condominio seleccionado
    await fetchAllResidents();
    
      setShowForm(true);
  };
  
  // Abrir formulario para editar
  const handleEdit = async (paymentType: PaymentType) => {
    setEditingPaymentType(paymentType);
    setShowForm(true);

    // Si el tipo de cuota NO es general, cargar todos los residentes y las asignaciones existentes
    if (!paymentType.is_general) {
        setLoading(true); // Indicar carga mientras se obtienen residentes y asignaciones
        await fetchAllResidents();
        
        try {
            const { data, error } = await supabase
                .from('resident_payment_types')
                .select('resident_id')
                .eq('payment_type_id', paymentType.id);
            
            if (error) throw error;
            
            if (data) {
                setAssignedResidentIds(data.map(item => item.resident_id));
            }
        } catch (error: any) {
             console.error('Error fetching assigned resident IDs:', error);
             toast.error(`Error al cargar asignaciones de residentes: ${error.message}`);
             setAssignedResidentIds([]); // Asegurarse de que esté vacío si falla
        } finally {
            setLoading(false); // Finalizar carga
        }
    } else {
        // Si es general, asegurarse de que las listas de residentes estén vacías (o no relevantes)
        setAllResidents([]);
        setAssignedResidentIds([]);
    }
  };
  
  // Abrir diálogo de confirmación para eliminar
  const handleDelete = (paymentType: PaymentType) => {
    setTypeToDelete(paymentType);
    setShowDeleteConfirm(true);
  };

  if (loading && paymentTypes.length === 0) {
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
          Tipos de cuotas
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
          <p className="text-gray-500">Por favor, seleccione un condominio para ver sus tipos de cuotas</p>
        </div>
      ) : paymentTypes.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No hay tipos de cuotas configurados</h2>
          <p className="text-gray-500 mb-6">Comienza creando tu primer tipo de pago</p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center"
            onClick={handleNewType}
          >
            <Plus size={18} className="mr-1" />
            <span>Nuevo Tipo de Pago</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paymentTypes.map((type) => (
            <div key={type.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <CreditCard className="text-blue-600 mr-3" size={22} />
                    <h3 className="text-lg font-semibold text-gray-800 truncate">{type.name}</h3>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-900 focus:outline-none"
                      onClick={() => handleEdit(type)}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="text-red-600 hover:text-red-900 focus:outline-none"
                      onClick={() => handleDelete(type)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                {type.description && (
                  <p className="text-sm text-gray-600 mb-5">{type.description}</p>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${type.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-gray-500">{type.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Formulario para crear/editar tipos de pago */}
      {showForm && (
        <PaymentTypeForm
          paymentType={editingPaymentType || undefined}
          onSave={savePaymentType}
          onCancel={() => {
            setShowForm(false);
            setEditingPaymentType(null);
            setAssignedResidentIds([]); // Limpiar asignaciones al cerrar el modal
            setAllResidents([]); // Limpiar lista de residentes al cerrar el modal
          }}
          allResidents={allResidents}
          assignedResidentIds={assignedResidentIds}
          fetchAllResidents={fetchAllResidents}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && typeToDelete && (
        <ConfirmDialog
          title="Eliminar Tipo de Pago"
          description={<span>¿Está seguro que desea eliminar el tipo de pago "{typeToDelete.name}"? Esta acción no se puede deshacer.</span>}
          onConfirm={deletePaymentType}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setTypeToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default PaymentTypesPage;
