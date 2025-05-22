import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2, CreditCard, DollarSign } from 'lucide-react';
import { PaymentType } from '../types';
import PaymentTypeForm from '../components/PaymentTypeForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

const PaymentTypesPage: React.FC = () => {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para gestionar formularios y diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<PaymentType | null>(null);

  // Cargar tipos de pago
  useEffect(() => {
    fetchPaymentTypes();
  }, []);

  // Función para obtener tipos de pago
  const fetchPaymentTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_types')
        .select('*')
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

  // Función para crear o actualizar un tipo de pago
  const savePaymentType = async (paymentTypeData: Partial<PaymentType>) => {
    try {
      setLoading(true);
      
      // Si estamos editando, actualizamos el tipo existente
      if (editingPaymentType) {
        const { data, error } = await supabase
          .from('payment_types')
          .update({
            name: paymentTypeData.name,
            description: paymentTypeData.description,
            is_active: paymentTypeData.is_active
          })
          .eq('id', editingPaymentType.id)
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          setPaymentTypes(prev => prev.map(pt => pt.id === data[0].id ? data[0] : pt));
          toast.success('Tipo de pago actualizado correctamente');
        }
      } 
      // Si es un nuevo tipo de pago
      else {
        const { data, error } = await supabase
          .from('payment_types')
          .insert([paymentTypeData])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          setPaymentTypes(prev => [...prev, data[0]]);
          toast.success('Tipo de pago creado correctamente');
        }
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingPaymentType(null);
      setShowForm(false);
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
  
  // Abrir formulario para editar
  const handleEdit = (paymentType: PaymentType) => {
    setEditingPaymentType(paymentType);
    setShowForm(true);
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
        
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
          onClick={() => setShowForm(true)}
        >
          <Plus size={18} className="mr-1" />
          <span>Nuevo Tipo</span>
        </button>
      </div>
      
      {paymentTypes.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">No hay tipos de cuotas configurados</h2>
          <p className="text-gray-500 mb-6">Comienza creando tu primer tipo de pago</p>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center"
            onClick={() => setShowForm(true)}
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
          }}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && typeToDelete && (
        <ConfirmDialog
          title="Eliminar Tipo de Pago"
          message={`¿Está seguro que desea eliminar el tipo de pago "${typeToDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={deletePaymentType}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setTypeToDelete(null);
          }}
          confirmText="Eliminar"
        />
      )}
    </div>
  );
};

export default PaymentTypesPage;
