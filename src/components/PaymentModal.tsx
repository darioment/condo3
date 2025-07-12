import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Resident, Month, PaymentType, Payment } from '../types/index';
import { supabase } from '../lib/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident | null;
  month: Month | null;
  year: number;
  amount: number;
  isPaid: boolean;
  initialPaymentTypeId?: string;
  selectedPayment?: Payment | null;
  onSave: (amount: number, date: Date, paymentTypeId: string, concepto: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  resident,
  month,
  year,
  amount,
  isPaid,
  initialPaymentTypeId,
  selectedPayment,
  onSave,
}) => {
  const [paymentAmount, setPaymentAmount] = useState(amount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const monthIndex = month ? ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'].indexOf(month) : 0;
  
  // Actualizar el concepto cuando cambia el pago seleccionado
  useEffect(() => {
    if (selectedPayment?.concepto) {
      setConcepto(selectedPayment.concepto);
    }
  }, [selectedPayment]);

  // Cargar tipos de pago una vez al montar el componente
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('payment_types')
          .select('*')
          .eq('is_active', true)
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

    fetchPaymentTypes();
  }, []); // Dependencia vacía para que se ejecute solo una vez

  // Establecer el tipo de pago seleccionado cuando cambian paymentTypes o initialPaymentTypeId
  useEffect(() => {
    if (paymentTypes.length > 0) {
      if (initialPaymentTypeId) {
        // Si estamos editando un pago existente, usar su tipo de cuota
        setSelectedPaymentType(initialPaymentTypeId);
      } else if (paymentTypes.length > 0) {
        // Si no estamos editando, seleccionar el primer tipo de cuota por defecto
        setSelectedPaymentType(paymentTypes[0].id);
      }
    }
  }, [paymentTypes, initialPaymentTypeId]);

  if (!isOpen || !resident || !month) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentType && paymentTypes.length > 0) {
      toast.error('Por favor selecciona un tipo de pago');
      return;
    }
    onSave(paymentAmount, new Date(paymentDate), selectedPaymentType || paymentTypes[0]?.id || '', concepto);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fadeIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isPaid ? 'Eliminar Pago' : 'Registrar Pago'}
        </h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Residente:</p>
          <p className="font-medium">{resident.name}</p>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Unidad:</p>
          <p className="font-medium">{resident.unit_number}</p>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Periodo:</p>
          <p className="font-medium">{month} {year}</p>
        </div>
        
        {isPaid && (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Concepto:</p>
              <p className="font-medium">{selectedPayment?.concepto || 'Sin concepto'}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Monto:</p>
              <p className="font-medium">{selectedPayment?.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Fecha de Pago:</p>
              <p className="font-medium">{new Date(selectedPayment?.payment_date || '').toLocaleDateString()}</p>
            </div>
          </>
        )}
        
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Tipo de cuota:</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedPaymentType || ''}
            onChange={(e) => setSelectedPaymentType(e.target.value)}
            disabled={loading || isPaid}
            required
          >
            {paymentTypes.length === 0 ? (
              <option value="">Cargando tipos de cota...</option>
            ) : (
              paymentTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))
            )}
          </select>
        </div>
        
        {!isPaid && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto:
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concepto:
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingrese el concepto del pago"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Pago:
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Guardar
              </button>
            </div>
          </form>
        )}
        
        {isPaid && (
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(0, new Date(), initialPaymentTypeId || '', '')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Eliminar Pago
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;