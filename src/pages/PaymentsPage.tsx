import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Condominium, Resident, Month, Payment, PaymentType } from '../types';
import CondoSelect from '../components/CondoSelect';
import ResidentRow from '../components/ResidentRow';
import PaymentModal from '../components/PaymentModal';
import { toast } from 'react-toastify';
import { Loader2, Filter, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const PaymentsPage: React.FC = () => {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Month | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para manejar el ordenamiento
  const [sortConfig, setSortConfig] = useState<{
    key: 'unit_number' | 'name' | 'total';
    direction: 'asc' | 'desc';
  }>({ key: 'unit_number', direction: 'asc' });
  
  // Estados para manejar tipos de cuota
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState<string>('');

  // Función para obtener residentes y pagos
  const fetchResidentsAndPayments = async () => {
    if (!selectedCondo || !selectedPaymentTypeId) return;

    try {
      setLoading(true);
      console.log('Fetching residents and payments for condominium:', selectedCondo.id, 'payment type:', selectedPaymentTypeId);

      // 1. Find the selected payment type details from the state
      const selectedPaymentType = paymentTypes.find(pt => pt.id === selectedPaymentTypeId);

      if (!selectedPaymentType) {
          console.error('Selected payment type not found in state');
          toast.error('Error: Tipo de cuota seleccionado no encontrado.');
          setResidents([]);
          setPayments([]);
          return;
      }

      let residentsData: Resident[] = [];
      let residentsError: any = null;

      // 3. Modify resident fetching based on is_general property
      if (selectedPaymentType.is_general) {
        console.log('Fetching all residents for general payment type.');
        // Fetch all residents for the selected condo (current behavior)
        const { data, error } = await supabase
          .from('residents')
          .select('*')
          .eq('condominium_id', selectedCondo.id)
          .order('unit_number');
        residentsData = data || [];
        residentsError = error;

      } else {
        console.log('Fetching specific residents for non-general payment type.');
        // Fetch residents linked through resident_payment_types
        // First, get the resident IDs linked to this payment type
        const { data: linkedResidentIdsData, error: linkedResidentIdsError } = await supabase
            .from('resident_payment_types')
            .select('resident_id')
            .eq('payment_type_id', selectedPaymentTypeId);

        if (linkedResidentIdsError) {
            console.error('Error fetching linked resident IDs:', linkedResidentIdsError);
            throw linkedResidentIdsError;
        }

        const residentIdsForPaymentType = linkedResidentIdsData.map(item => item.resident_id);

        // If no residents are linked, return an empty array
        if (residentIdsForPaymentType.length === 0) {
            console.log('No residents linked to this payment type.');
            residentsData = [];
        } else {
            // Then, fetch the residents using the obtained IDs
             const { data, error } = await supabase
                .from('residents')
                .select('id, condominium_id, name, unit_number, contact_info, bank_info, account_number, email, phone, is_active, created_at, updated_at')
                .eq('condominium_id', selectedCondo.id) // Still filter by condominium
                .order('unit_number')
                .in('id', residentIdsForPaymentType); // Use the array of IDs here

            residentsData = data || [];
            residentsError = error; // Assign the error from the residents query
        }
      }


      if (residentsError) {
        console.error('Error fetching residents:', residentsError);
        throw residentsError;
      }

      console.log(`Found ${residentsData.length} residents`);

      // Fetch payments for the fetched residents
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
        console.log('No residents found for this payment type and condo, no payments to fetch');
        setPayments([]);
      }

      setResidents(residentsData); // Update the residents state with the filtered list

    } catch (error: any) {
      console.error('Error in fetchResidentsAndPayments:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch condominiums and payment types on mount
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

  // Fetch residents and payments when dependencies change
  useEffect(() => {
    if (selectedCondo && selectedPaymentTypeId) {
      fetchResidentsAndPayments();
    }
  }, [selectedCondo, year, selectedPaymentTypeId]);

  const handlePayment = async (resident: Resident, month: Month, isPaid: boolean) => {
    const existingPayment = payments.find(p => 
      p.resident_id === resident.id && 
      p.month === month && 
      p.year === year
    );
    
    setSelectedResident(resident);
    setSelectedMonth(month);
    setSelectedPayment(existingPayment || null);
    setIsPaid(isPaid);
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (amount: number, date: Date, paymentTypeId: string, concepto: string) => {
    if (!selectedResident || !selectedMonth) return;

    try {
      setLoading(true);
      
      if (isPaid) {
        // Si isPaid es true, significa que estamos desmarcando un pago existente (eliminándolo)
        console.log(`Intentando eliminar pago para ${selectedResident.name}, ${selectedMonth}, ${year}, Tipo: ${selectedPayment?.payment_type_id || paymentTypeId}`);
        
        const paymentTypeToDelete = selectedPayment?.payment_type_id || paymentTypeId;
        
        if (!paymentTypeToDelete) {
          throw new Error('No se pudo determinar el tipo de pago a eliminar');
        }
        
        // Delete payment
        const { error } = await supabase
          .from('payments')
          .delete()
          .match({
            resident_id: selectedResident.id,
            month: selectedMonth,
            year: year,
            payment_type_id: paymentTypeToDelete
          });

        if (error) throw error;
        
        // Update local state by filtering out the deleted payment
        setPayments(payments.filter(p => 
          !(p.resident_id === selectedResident.id && 
            p.month === selectedMonth && 
            p.year === year &&
            p.payment_type_id === paymentTypeToDelete)
        ));

        toast.success('Pago eliminado exitosamente');
      } else {
        // Si no está pagado, estamos creando un nuevo pago
        const newPayment = {
          resident_id: selectedResident.id,
          payment_type_id: paymentTypeId,
          condominium_id: selectedCondo!.id,
          amount,
          payment_date: date.toISOString(),
          month: selectedMonth,
          year,
          status: 'paid',
          concepto
        };

        const { error } = await supabase
          .from('payments')
          .insert(newPayment);

        if (error) throw error;

        // Actualizar el estado local agregando el nuevo pago
        const newPaymentWithId = {
          ...newPayment,
          id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setPayments([...payments, newPaymentWithId]);
        toast.success('Pago registrado exitosamente');
      }
    } catch (error: any) {
      console.error('Error saving payment:', error);
      toast.error(`Error al ${isPaid ? 'eliminar' : 'registrar'} el pago: ${error.message}`);
    } finally {
      setLoading(false);
      setPaymentModalOpen(false);
    }
  };

  // Función para eliminar todos los pagos de un residente para el año y tipo de cuota seleccionados
  const handleDeleteResidentPayments = async (residentId: string, residentName: string) => {
    if (!selectedCondo || !selectedPaymentTypeId || !year) {
      toast.error('No se pudo determinar el condominio, tipo de cuota o año');
      return;
    }

    if (!window.confirm(`¿Está seguro de eliminar TODOS los pagos de ${residentName} (${selectedCondo.name}) para el año ${year} y tipo de cuota ${paymentTypes.find(pt => pt.id === selectedPaymentTypeId)?.name || 'seleccionado'}?`)) {
      return;
    }

    try {
      setLoading(true);
      console.log(`Eliminando pagos para residente ${residentName} (ID: ${residentId}) año ${year}, tipo ${selectedPaymentTypeId}`);

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('resident_id', residentId)
        .eq('year', year)
        .eq('payment_type_id', selectedPaymentTypeId);

      if (error) {
        console.error('Error al eliminar pagos del residente:', error);
        throw error;
      }

      // En lugar de actualizar el estado local filtrando, recargamos los datos completos
      await fetchResidentsAndPayments();

      toast.success(`Todos los pagos de ${residentName} para el año ${year} han sido eliminados.`);

    } catch (error: any) {
      console.error('Error al eliminar pagos del residente:', error);
      toast.error(`Error al eliminar pagos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get available years (from 2021 to current year + 1)
  const currentYear = new Date().getFullYear();
  const startYear = 2021;
  const availableYears = Array.from(
    { length: currentYear - startYear + 2 }, // +2 to include current year and next year
    (_, i) => startYear + i
  ).filter(year => year <= currentYear + 1); // Show up to next year

  // Calculate monthly totals
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;
  
  const monthlyTotals = months.reduce((acc, month) => {
    acc[month] = payments
      .filter(p => p.month === month)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate resident totals and prepare data for sorting
  const residentsWithTotals = useMemo(() => {
    return residents.map(resident => {
      const total = payments
        .filter(p => p.resident_id === resident.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      return {
        ...resident,
        total
      };
    });
  }, [residents, payments]);

  // Sort residents based on sortConfig
  const sortedResidents = useMemo(() => {
    const sortableResidents = [...residentsWithTotals];
    
    return sortableResidents.sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'unit_number') {
        // For unit numbers, convert to numbers for proper numeric sorting
        aValue = a.unit_number ? parseInt(a.unit_number.toString(), 10) : 0;
        bValue = b.unit_number ? parseInt(b.unit_number.toString(), 10) : 0;
      } else {
        // For names and totals, use direct comparison
        aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
        bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [residentsWithTotals, sortConfig]);

  // Handle sorting when clicking on column headers
  const requestSort = (key: 'unit_number' | 'name' | 'total') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort indicator for column headers
  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Calculate resident totals for display
  const residentTotals = residentsWithTotals.reduce((acc, resident) => {
    acc[resident.id] = resident.total;
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(monthlyTotals).reduce((sum, total) => sum + total, 0);

  // Exportar a Excel
  const exportToExcel = () => {
    if (!residents.length || !payments.length) {
      toast.warning('No hay datos para exportar');
      return;
    }

    try {
      // Preparar datos para exportar
      const dataToExport = residents.map(resident => {
        const residentPayments = payments.filter(p => p.resident_id === resident.id);
        const paymentData: Record<string, any> = {
          'Unidad': resident.unit_number,
          'Residente': resident.name,
          'Total': residentTotals[resident.id]?.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) || '$0.00'
        };

        // Agregar columnas para cada mes
        months.forEach(month => {
          const monthPayment = residentPayments.find(p => p.month === month);
          paymentData[month] = monthPayment 
            ? monthPayment.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
            : '-';
        });

        return paymentData;
      });

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Ajustar el ancho de las columnas
      const wscols = [
        { wch: 10 }, // Unidad
        { wch: 30 }, // Residente
        { wch: 15 }, // Total
        ...months.map(() => ({ wch: 12 })) // Columnas de meses
      ];
      ws['!cols'] = wscols;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
      
      // Generar y descargar archivo
      const fileName = `Pagos_${selectedCondo?.name || 'Condominio'}_${year}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      toast.error('Error al exportar los datos');
    }
  };

  // Importar desde Excel
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limpiar el input para permitir cargar el mismo archivo de nuevo
    event.target.value = '';

    try {
      setLoading(true);
      
      // Leer el archivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData.length) {
        toast.warning('El archivo está vacío');
        return;
      }

      // Validar columnas requeridas
      const requiredColumns = ['Unidad', 'Residente'];
      const firstRow = jsonData[0] as Record<string, unknown>;
      const missingColumns = requiredColumns.filter(col => !(col in firstRow));
      
      if (missingColumns.length > 0) {
        toast.error(`Columnas requeridas faltantes: ${missingColumns.join(', ')}`);
        return;
      }

      // Confirmar con el usuario antes de proceder
      if (!window.confirm(`¿Está seguro de importar los pagos del ${year}? Se eliminarán todos los pagos existentes de este año.`)) {
        return;
      }

      // Borrar todos los pagos existentes del año seleccionado
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('year', year)
        .eq('payment_type_id', selectedPaymentTypeId);

      if (deleteError) {
        console.error('Error al eliminar pagos existentes:', deleteError);
        throw new Error('No se pudieron eliminar los pagos existentes');
      }

      // Mapear datos a la estructura de pagos
      const paymentsToImport: Omit<Payment, 'id' | 'created_at' | 'updated_at'>[] = [];
      const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;
      
      jsonData.forEach((row: any) => {
        const resident = residents.find(r => 
          r.unit_number === row['Unidad'] || 
          r.name.toLowerCase() === String(row['Residente']).toLowerCase()
        );

        if (resident) {
          months.forEach(month => {
            if (row[month] && !isNaN(parseFloat(row[month]))) {
              const amount = parseFloat(row[month]);
              if (amount > 0) {
                paymentsToImport.push({
                  resident_id: resident.id,
                  condominium_id: selectedCondo!.id,
                  year,
                  month,
                  amount,
                  payment_type_id: selectedPaymentTypeId,
                  notes: `Importado el ${new Date().toLocaleDateString()}`,
                  is_paid: true,
                  payment_date: new Date().toISOString(),
                  created_by: 'system-import',
                  updated_by: 'system-import'
                });
              }
            }
          });
        }
      });

      if (paymentsToImport.length === 0) {
        toast.warning('No se encontraron pagos válidos para importar');
        return;
      }

      // Insertar pagos en lotes
      const BATCH_SIZE = 50;
      for (let i = 0; i < paymentsToImport.length; i += BATCH_SIZE) {
        const batch = paymentsToImport.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('payments')
          .insert(batch);

        if (error) throw error;
      }

      // Actualizar la lista de pagos
      await fetchResidentsAndPayments();
      toast.success(`${paymentsToImport.length} pagos importados exitosamente`);
    } catch (error) {
      console.error('Error al importar pagos:', error);
      toast.error('Error al importar los pagos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Registro de Pagos
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
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
            <button 
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center text-sm"
              onClick={exportToExcel}
              title="Exportar a Excel"
            >
              <Download size={16} className="mr-1" />
              <span>Exportar</span>
            </button>
            <label 
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center text-sm cursor-pointer"
              title="Importar desde Excel"
            >
              <Upload size={16} className="mr-1" />
              <span>Importar</span>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileImport}
                className="hidden"
                ref={fileInputRef}
              />
            </label>
          </div>
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
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('unit_number')}
                    >
                      <div className="flex items-center">
                        Unidad
                        <span className="ml-1">{getSortIndicator('unit_number')}</span>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('name')}
                    >
                      <div className="flex items-center">
                        Residente
                        <span className="ml-1">{getSortIndicator('name')}</span>
                      </div>
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
                    <th
                      key="total"
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total
                    </th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th colSpan={2} className="px-6 py-2 text-left text-xs font-medium text-gray-700">
                      Total por Mes
                    </th>
                    {months.map(month => (
                      <td key={`month-total-${month}`} className="px-3 py-2 text-center text-sm font-medium text-gray-900">
                        {monthlyTotals[month] > 0 ? monthlyTotals[month].toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-sm font-medium text-white bg-blue-600">
                      {grandTotal > 0 ? grandTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '-'}
                    </td>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedResidents.map((resident) => (
                    <ResidentRow
                      key={resident.id}
                      resident={resident}
                      payments={payments.filter((p) => p.resident_id === resident.id)}
                      year={year}
                      onPaymentClick={handlePayment}
                      totalAmount={residentTotals[resident.id] || 0}
                      monthlyTotals={payments
                        .filter(p => p.resident_id === resident.id)
                        .reduce((acc, p) => ({
                          ...acc,
                          [p.month]: (acc[p.month] || 0) + (p.amount || 0)
                        }), {} as Record<string, number>)}
                      onDeleteResidentPayments={handleDeleteResidentPayments}
                    />
                  ))}
                  <tr>
                    <th
                      colSpan={2}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total
                    </th>
                    {['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'].map(
                      (month) => (
                        <td
                          key={month}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {payments
                            .filter((p) => p.month === month)
                            .reduce((acc, p) => acc + p.amount, 0)}
                        </td>
                      )
                    )}
                    <td
                      key="total"
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {payments.reduce((acc, p) => acc + p.amount, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              {!loading && selectedCondo && residents.length > 0 && paymentTypes.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4 mx-6 mb-6">
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
                  <span className="text-sm text-gray-600">
                    Total de residentes: {residents.length}
                  </span>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => console.log('Exportar a Excel')}
                  >
                    Exportar a Excel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-600 mb-2">No hay residentes</h2>
              <p className="text-gray-500">
                No hay residentes registrados en este condominio. Agrega residentes para empezar a gestionar pagos.
              </p>
              
              <div className="mt-6 px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Total de residentes: 0
                  </span>
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => console.log('Exportar a Excel')}
                    disabled
                  >
                    Exportar a Excel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {paymentModalOpen && selectedResident && selectedMonth && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          resident={selectedResident}
          month={selectedMonth}
          year={year}
          amount={selectedPayment?.amount || 0}
          isPaid={isPaid}
          initialPaymentTypeId={selectedPayment?.payment_type_id || selectedPaymentTypeId}
          selectedPayment={selectedPayment}
          onSave={handleSavePayment}
        />
      )}
    </div>
  );
};

export default PaymentsPage;
