import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Concepto, Gasto, GastoTipo } from '../types';
import { formatCurrency } from '../utils/format';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  concepto: Concepto;
  gasto: Gasto | null;
  gastoTipoId: string;
  condominiumId: string;
  year: number;
  month: string;
  onSave: (amount: number, date: Date, gastoTipoId: string, notes: string) => void;
}

const GastoModal: React.FC<GastoModalProps> = ({
  isOpen,
  onClose,
  concepto,
  gasto,
  gastoTipoId,
  condominiumId,
  year,
  month,
  onSave
}) => {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [gastoTipo, setGastoTipo] = useState<GastoTipo | null>(null);

  useEffect(() => {
    if (gasto) {
      setAmount(gasto.amount.toString());
      setDate(new Date(gasto.payment_date).toISOString().split('T')[0]);
      setNotes(gasto.notes || '');
    } else {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [gasto]);

  useEffect(() => {
    const fetchGastoTipo = async () => {
      try {
        const { data, error } = await supabase
          .from('gasto_tipos')
          .select('*')
          .eq('id', gastoTipoId)
          .single();

        if (error) throw error;
        setGastoTipo(data);
      } catch (error: any) {
        console.error('Error fetching gasto tipo:', error);
        toast.error(`Error al cargar el tipo de gasto: ${error.message}`);
      }
    };

    if (gastoTipoId) {
      fetchGastoTipo();
    }
  }, [gastoTipoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;

    setLoading(true);
    try {
      const amountNumber = parseFloat(amount);
      if (isNaN(amountNumber)) {
        throw new Error('El monto debe ser un número válido');
      }

      console.log('Guardando gasto con datos:', {
        amount: amountNumber,
        date: new Date(date),
        gastoTipoId,
        notes,
        concepto: concepto.nombre,
        month,
        year
      });

      onSave(amountNumber, new Date(date), gastoTipoId, notes);
    } catch (error: any) {
      console.error('Error saving gasto:', error);
      toast.error(`Error al guardar el gasto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            {gasto ? 'Editar Gasto' : 'Registrar Gasto'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Concepto
              </label>
              <div className="text-sm text-gray-900">{concepto.nombre}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Gasto
              </label>
              <div className="text-sm text-gray-900">{gastoTipo?.name}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes
              </label>
              <div className="text-sm text-gray-900">{month}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <div className="text-sm text-gray-900">{year}</div>
            </div>

            <div className="mb-4">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Monto
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Pago
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GastoModal; 