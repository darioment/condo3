import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Resident, Month, PaymentType } from '../types';
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
  onSave: (amount: number, date: Date, paymentTypeId: string) => void;
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
  onSave,
}) => {
  const [paymentAmount, setPaymentAmount] = useState(amount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>(initialPaymentTypeId || '');
  const [loading, setLoading] = useState(false);
  const monthIndex = month ? ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'].indexOf(month) : 0;
  
  // Cargar tipos de pago
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

        if (data && data.length > 0) {
          setPaymentTypes(data);
          // Usar el tipo de pago inicial si se proporciona, de lo contrario usar el primero
          if (!selectedPaymentType) {
            setSelectedPaymentType(initialPaymentTypeId || data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching payment types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentTypes();
  }, []);

  if (!isOpen || !resident || !month) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(paymentAmount, new Date(paymentDate), selectedPaymentType);
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
          <p className="font-medium">{resident.unitNumber}</p>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Periodo:</p>
          <p className="font-medium">{month} {year}</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Tipo de cuota:</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedPaymentType}
            onChange={(e) => setSelectedPaymentType(e.target.value)}
            disabled={loading}
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
          <div>
            <p className="text-gray-600 mb-6">
              ¿Está seguro que desea eliminar este pago?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={() => onSave(0, new Date())}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;