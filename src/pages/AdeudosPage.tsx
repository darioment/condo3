import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Condominium, Resident, Month, Payment, PaymentType } from '../types';
import CondoSelect from '../components/CondoSelect';
import { toast } from 'react-toastify';
import { Loader2, Filter } from 'lucide-react';
import { MONTHS } from '../types';
import { useParams, Link } from 'react-router-dom';

const AdeudosPage: React.FC = () => {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCondominiums = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('condominiums')
          .select('*')
          .order('name');
        if (error) throw error;
        setCondominiums(data || []);
        if (data && data.length > 0 && !selectedCondo) {
          setSelectedCondo(data[0]);
        }
      } catch (error: any) {
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
        setPaymentTypes(data || []);
        if (data && data.length > 0 && !selectedPaymentTypeId) {
          setSelectedPaymentTypeId(data[0].id);
        }
      } catch (error: any) {
        toast.error(`Error al cargar los tipos de cuota: ${error.message}`);
      }
    };
    fetchCondominiums();
    fetchPaymentTypes();
  }, []);

  useEffect(() => {
    const fetchResidentsAndPayments = async () => {
      if (!selectedCondo || !selectedPaymentTypeId) return;
      try {
        setLoading(true);
        // Obtener el tipo de cuota seleccionado
        const selectedPaymentType = paymentTypes.find(pt => pt.id === selectedPaymentTypeId);
        let residentsData: Resident[] = [];
        let residentsError: any = null;
        if (selectedPaymentType?.is_general) {
          // Todos los residentes activos del condominio
          const { data, error } = await supabase
            .from('residents')
            .select('*')
            .eq('condominium_id', selectedCondo.id)
            .eq('is_active', true)
            .order('unit_number');
          residentsData = data || [];
          residentsError = error;
        } else {
          // Solo los residentes ligados a este tipo de cuota
          const { data: linkedResidentIdsData, error: linkedResidentIdsError } = await supabase
            .from('resident_payment_types')
            .select('resident_id')
            .eq('payment_type_id', selectedPaymentTypeId);
          if (linkedResidentIdsError) throw linkedResidentIdsError;
          const residentIdsForPaymentType = linkedResidentIdsData.map((item: any) => item.resident_id);
          if (residentIdsForPaymentType.length === 0) {
            residentsData = [];
          } else {
            const { data, error } = await supabase
              .from('residents')
              .select('*')
              .eq('condominium_id', selectedCondo.id)
              .eq('is_active', true)
              .in('id', residentIdsForPaymentType)
              .order('unit_number');
            residentsData = data || [];
            residentsError = error;
          }
        }
        if (residentsError) throw residentsError;
        setResidents(residentsData);
        // Pagos filtrados por tipo de cuota
        const residentIds = residentsData.map((r: Resident) => r.id);
        let paymentsData: Payment[] = [];
        if (residentIds.length > 0) {
          const { data: paymentsRaw, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .in('resident_id', residentIds)
            .eq('year', year)
            .eq('status', 'paid')
            .eq('payment_type_id', selectedPaymentTypeId);
          if (paymentsError) throw paymentsError;
          paymentsData = paymentsRaw || [];
        }
        setPayments(paymentsData);
      } catch (error: any) {
        toast.error(`Error al cargar residentes o pagos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchResidentsAndPayments();
  }, [selectedCondo, year, selectedPaymentTypeId, paymentTypes]);

  // Calcular adeudos por residente y mes
  const getResidentDebts = (residentId: string) => {
    const paidMonths = payments.filter(p => p.resident_id === residentId).map(p => p.month);
    return MONTHS.filter(month => !paidMonths.includes(month));
  };

  // Obtener el monto de la cuota para el tipo de cuota seleccionado
  const getCuotaMonto = () => {
    const selectedType = paymentTypes.find(pt => pt.id === selectedPaymentTypeId);
    if (!selectedType) return 0;
    // Usar el campo cuota_mensual del tipo de cuota
    return selectedType.cuota_mensual || 0;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Adeudos</h1>
      <div className="flex items-center space-x-4 mb-6">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          {[...Array(5)].map((_, i) => {
            const y = new Date().getFullYear() - i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
        <CondoSelect
          condominiums={condominiums}
          selectedCondominium={selectedCondo}
          onSelect={setSelectedCondo}
        />
      </div>
      {/* Selector de tipos de cuota como pestañas */}
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Residente</th>
                {MONTHS.map(month => (
                  <th key={month} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{month}</th>
                ))}
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Meses Adeudados</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Adeudado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {residents.map(resident => {
                const debts = getResidentDebts(resident.id);
                const cuotaMonto = getCuotaMonto();
                const montoAdeudado = debts.length * cuotaMonto;
                return (
                  <tr key={resident.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{resident.unit_number}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{resident.name}</td>
                    {MONTHS.map(month => (
                      <td key={month} className={`px-2 py-2 text-center text-sm ${debts.includes(month) ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-50 text-green-600'}`}>
                        {debts.includes(month) ? '●' : ''}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center text-sm font-bold text-red-700">{debts.length}</td>
                    <td className="px-4 py-2 text-center text-sm font-bold text-blue-700">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(montoAdeudado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AdeudoDetalleResidente: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [resident, setResident] = useState<Resident | null>(null);
  const [condo, setCondo] = useState<Condominium | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener residente
        const { data: residentData, error: residentError } = await supabase
          .from('residents')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (residentError) throw residentError;
        setResident(residentData);
        // Obtener condominio
        if (residentData?.condominium_id) {
          const { data: condoData, error: condoError } = await supabase
            .from('condominiums')
            .select('*')
            .eq('id', residentData.condominium_id)
            .maybeSingle();
          if (condoError) throw condoError;
          setCondo(condoData);
        }
        // Obtener tipos de cuota
        const { data: ptData, error: ptError } = await supabase
          .from('payment_types')
          .select('*')
          .eq('is_active', true)
          .eq('condominium_id', residentData.condominium_id);
        if (ptError) throw ptError;
        setPaymentTypes(ptData || []);
        // Obtener pagos
        const { data: payData, error: payError } = await supabase
          .from('payments')
          .select('*')
          .eq('resident_id', id);
        if (payError) throw payError;
        setPayments(payData || []);
      } catch (error) {
        // Manejo de error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-blue-500" /></div>;
  }
  if (!resident) {
    return <div className="text-center py-12 text-gray-500">Residente no encontrado</div>;
  }

  // Calcular adeudos por tipo de cuota y mes
  const getAdeudos = () => {
    return paymentTypes.map(pt => {
      const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
      const adeudosMes = MONTHS.map(month => !paidMonths.includes(month));
      return {
        tipo: pt,
        adeudosMes
      };
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/adeudos" className="text-blue-600 hover:underline mb-4 inline-block">← Volver a Adeudos</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Detalle de Adeudos</h1>
      <div className="mb-4 text-gray-700">
        <span className="font-semibold">Residente:</span> {resident.name} <br />
        <span className="font-semibold">Unidad:</span> {resident.unit_number} <br />
        {condo && <><span className="font-semibold">Condominio:</span> {condo.name}</>}<br />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Cuota</th>
              {MONTHS.map(month => (
                <th key={month} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{month}</th>
              ))}
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Meses</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Adeudado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getAdeudos().map(({ tipo, adeudosMes }) => {
              const totalMeses = adeudosMes.filter(Boolean).length;
              const monto = totalMeses * (tipo.cuota_mensual || 0);
              return (
                <tr key={tipo.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{tipo.name}</td>
                  {adeudosMes.map((adeuda, i) => (
                    <td key={i} className={`px-2 py-2 text-center text-sm ${adeuda ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-50 text-green-600'}`}>{adeuda ? '●' : ''}</td>
                  ))}
                  <td className="px-4 py-2 text-center text-sm font-bold text-red-700">{totalMeses}</td>
                  <td className="px-4 py-2 text-center text-sm font-bold text-blue-700">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdeudosPage; 