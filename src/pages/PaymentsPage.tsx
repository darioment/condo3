import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Condominium, Resident, Month, Payment, PaymentType } from '../types';
import CondoSelect from '../components/CondoSelect';
import ResidentRow from '../components/ResidentRow';
import PaymentModal from '../components/PaymentModal';
import { toast } from 'react-toastify';
import { Loader2, Filter } from 'lucide-react';

const PaymentsPage: React.FC = () => {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados para manejar tipos de cuota
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState<string>('');

  // Fetch condominiums
  useEffect(() => {
    const fetchCondominiums = async () => {
      try {
        setLoading(true);
        console.log('Fetching condominiums...');
        
        const { data, error } = await supabase
          .from('condominiums')
          .select('*')
          .order('name');

        if (error) {
          console.error('Supabase error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        console.log('Condominiums response:', data);

        if (data) {
          setCondominiums(data);
          if (data.length > 0 && !selectedCondo) {
            console.log('Setting initial condominium:', data[0]);
            setSelectedCondo(data[0]);
          } else {
            console.log('No condominiums found or already selected:', selectedCondo);
          }
        }
      } catch (error: any) {
        console.error('Error fetching condominiums:', error);
        toast.error(`Error al cargar los condominios: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchPaymentTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('payment_types')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          setPaymentTypes(data);
          // Establecer el primer tipo como valor predeterminado si no hay ninguno seleccionado
          if (!selectedPaymentTypeId) {
            setSelectedPaymentTypeId(data[0].id);
          }
        }
      } catch (error: any) {
        console.error('Error fetching payment types:', error);
        toast.error(`Error al cargar los tipos de cuota: ${error.message}`);
      }
    };

    fetchCondominiums();
    fetchPaymentTypes();
  }, []);

  // Fetch residents and payments when selected condo changes or selected payment type changes
  useEffect(() => {
    const fetchResidentsAndPayments = async () => {
      if (!selectedCondo || !selectedPaymentTypeId) return;

      try {
        setLoading(true);
        console.log('Fetching residents for condominium:', selectedCondo.id);
        
        // Fetch residents
        const { data: residentsData, error: residentsError } = await supabase
          .from('residents')
          .select('*')
          .eq('condominium_id', selectedCondo.id)
          .order('unit_number');

        if (residentsError) {
          console.error('Error fetching residents:', residentsError);
          throw residentsError;
        }

        console.log(`Found ${residentsData.length} residents`);

        // Fetch payments for all residents in this condo for the selected year and payment type
        const residentIds = residentsData.map(r => r.id);
        
        if (residentIds.length > 0) {
          console.log('Fetching payments for residents:', residentIds, 'year:', year, 'payment type:', selectedPaymentTypeId);
          
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .in('resident_id', residentIds)
            .eq('year', year)
            .eq('payment_type_id', selectedPaymentTypeId);

          if (paymentsError) {
            console.error('Error fetching payments:', paymentsError);
            throw paymentsError;
          }

          console.log(`Found ${paymentsData.length} payments`);
          setPayments(paymentsData);
        } else {
          console.log('No residents found, no payments to fetch');
          setPayments([]);
        }

        setResidents(residentsData);
      } catch (error: any) {
        console.error('Error in fetchResidentsAndPayments:', error);
        toast.error(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchResidentsAndPayments();
  }, [selectedCondo, year, selectedPaymentTypeId]);

  const handlePayment = async (resident: Resident, month: Month, isPaid: boolean) => {
    setSelectedResident(resident);
    setSelectedMonth(month);
    setIsPaid(isPaid);
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (amount: number, date: Date, paymentTypeId: string) => {
    if (!selectedResident || !selectedMonth) return;

    try {
      setLoading(true);
      
      if (isPaid) {
        // Delete payment
        const { error } = await supabase
          .from('payments')
          .delete()
          .match({
            resident_id: selectedResident.id,
            month: selectedMonth,
            year: year
          });

        if (error) throw error;
        
        // Update local state
        setPayments(payments.filter(p => 
          !(p.resident_id === selectedResident.id && 
            p.month === selectedMonth && 
            p.year === year)
        ));

        toast.success('Pago eliminado exitosamente');
      } else {
        // Create new payment
        const newPayment = {
          resident_id: selectedResident.id,
          payment_type_id: paymentTypeId,
          amount,
          payment_date: date.toISOString(),
          month: selectedMonth,
          year,
          status: 'paid',
          created_at: new Date().toISOString()
        };

        console.log('Creating new payment:', newPayment);

        const { data, error } = await supabase
          .from('payments')
          .insert(newPayment)
          .select()
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.log('Payment created:', data);

        // Update local state
        setPayments([...payments, data]);
        toast.success('Pago registrado exitosamente');
      }
    } catch (error: any) {
      console.error('Error managing payment:', error);
      toast.error(`Error: ${error.message}`);
    }

    setPaymentModalOpen(false);
    setSelectedResident(null);
    setSelectedMonth(null);
    setIsPaid(false);
  };

  // Get available years
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: 5 },
    (_, i) => currentYear - 2 + i
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Registro de Pagos
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <CondoSelect
            condominiums={condominiums}
            selectedCondominium={selectedCondo}
            onSelect={setSelectedCondo}
          />
        </div>
      </div>
      
      {/* Selector de tipos de cuota */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Filter size={18} className="text-gray-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-700">Tipo de Cuota</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {paymentTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedPaymentTypeId(type.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${selectedPaymentTypeId === type.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {residents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Residente
                    </th>
                    {['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'].map(
                      (month) => (
                        <th
                          key={month}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {month}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {residents.map((resident) => (
                    <ResidentRow
                      key={resident.id}
                      resident={resident}
                      payments={payments.filter((p) => p.resident_id === resident.id)}
                      year={year}
                      onPaymentClick={handlePayment}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No hay residentes registrados en este condominio.
            </div>
          )}

          {!loading && selectedCondo && residents.length === 0 && (
            <div className="bg-white shadow-md rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No hay residentes</h2>
              <p className="text-gray-500">
                No hay residentes registrados en este condominio. Agrega residentes para empezar a gestionar pagos.
              </p>
            </div>
          )}
          
          {!loading && selectedCondo && residents.length > 0 && paymentTypes.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-800">
                {paymentTypes.find(pt => pt.id === selectedPaymentTypeId)?.name || 'Cuotas'} - {year}
              </h3>
              <p className="text-sm text-blue-600">
                Haga clic en una celda para registrar o eliminar un pago
              </p>
            </div>
          )}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-600">
                  Total de residentes: {residents.length}
                </span>
              </div>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => console.log('Exportar a Excel')}
              >
                Exportar a Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOpen && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          resident={selectedResident}
          month={selectedMonth}
          year={year}
          amount={50}
          isPaid={isPaid}
          onSave={handleSavePayment}
          initialPaymentTypeId={selectedPaymentTypeId}
        />
      )}
    </div>
  );
};

export default PaymentsPage;
