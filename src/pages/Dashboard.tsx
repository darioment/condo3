import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Home, TrendingUp, Mail as MailIcon } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { Condominium, MONTHS, Payment, Resident, PaymentType, Month } from '../types';
import CondoSelect from '../components/CondoSelect';
import StatCard from '../components/Dashboard/StatCard';
import PaymentSummary from '../components/Dashboard/PaymentSummary';
import FinancialSummary from '../components/Dashboard/FinancialSummary';
import { getFinancialReport, YearlyFinancialSummary } from '../services/financialReportService';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Dashboard: React.FC = () => {
  // Leer valores iniciales de localStorage o usar valores por defecto
  const initialYear = (() => {
    const stored = localStorage.getItem('dashboard_selectedYear');
    return stored ? Number(stored) : new Date().getFullYear();
  })();
  const initialMonth = (() => {
    const stored = localStorage.getItem('dashboard_selectedMonth');
    return stored && MONTHS.includes(stored as Month) ? (stored as Month) : MONTHS[0];
  })();

  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<YearlyFinancialSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<Month>(initialMonth);
  const [residentCount, setResidentCount] = useState<number>(0);

  // Debug: Log el valor de selectedMonth
  console.log('Dashboard render - selectedMonth:', selectedMonth, 'initialMonth:', initialMonth, 'localStorage month:', localStorage.getItem('dashboard_selectedMonth'));

  // Guardar selectedMonth en localStorage cuando cambie
  useEffect(() => {
    if (selectedMonth) {
      localStorage.setItem('dashboard_selectedMonth', selectedMonth);
      console.log('Saved selectedMonth to localStorage:', selectedMonth);
    }
  }, [selectedMonth]);
  const [residentDebts, setResidentDebts] = useState<{ resident: Resident; subtotales: { [paymentTypeId: string]: number }; amountOwed: number }[]>([]);
  const [residentPayments, setResidentPayments] = useState<{ residentId: string; totalPaid: number }[]>([]);
  const [debtLoading, setDebtLoading] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [paymentsGlobal, setPaymentsGlobal] = useState<Payment[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState<any>(null);
  const [residentPaymentTypes, setResidentPaymentTypes] = useState<{ resident_id: string; payment_type_id: string }[]>([]);

  // Obtener años disponibles (desde 2021 hasta el año actual)
  const availableYears = Array.from(
    { length: new Date().getFullYear() - 2021 + 1 },
    (_, i) => 2021 + i
  );

  const currentYear = new Date().getFullYear();
  const currentMonthIndex = selectedYear === currentYear ? new Date().getMonth() : 11; // 0-indexed

  // Cargar condominios
  useEffect(() => {
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

    fetchCondominiums();
  }, []);

  // Cargar el conteo de residentes cuando cambia el condominio seleccionado
  useEffect(() => {
    const fetchResidentCount = async () => {
      if (!selectedCondo) return;

      try {
        const { count, error } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('condominium_id', selectedCondo.id)
          .eq('is_active', true);

        if (error) throw error;

        setResidentCount(count || 0);
      } catch (error: any) {
        console.error('Error fetching resident count:', error);
        toast.error(`Error al cargar el conteo de residentes: ${error.message}`);
      }
    };

    fetchResidentCount();
  }, [selectedCondo]);

  // Cargar datos financieros cuando cambia el condominio o el año seleccionado
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!selectedCondo) return;

      try {
        setLoading(true);
        const data = await getFinancialReport(selectedCondo.id, selectedYear);
        setFinancialData(data);
      } catch (error: any) {
        console.error('Error fetching financial data:', error);
        toast.error(`Error al cargar los datos financieros: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [selectedCondo, selectedYear, selectedMonth]);

  // Cargar resumen de adeudos por residente
  useEffect(() => {
    const fetchDebts = async () => {
      if (!selectedCondo) return;
      setDebtLoading(true);
      try {
        // Obtener residentes activos
        const { data: residentsData, error: residentsError } = await supabase
          .from('residents')
          .select('*')
          .eq('condominium_id', selectedCondo.id)
          .eq('is_active', true)
          .order('unit_number');
        if (residentsError) throw residentsError;
        // Obtener tipos de cuota activos
        const { data: paymentTypes, error: ptError } = await supabase
          .from('payment_types')
          .select('*')
          .eq('is_active', true)
          .eq('condominium_id', selectedCondo.id);
        if (ptError) throw ptError;
        // Obtener residentes asignados a cada tipo de cuota
        const { data: residentPaymentTypes, error: rptError } = await supabase
          .from('resident_payment_types')
          .select('resident_id, payment_type_id');
        if (rptError) throw rptError;
        // Obtener pagos del año
        const residentIds = (residentsData || []).map((r: Resident) => r.id);
        let payments: Payment[] = [];
        if (residentIds.length > 0) {
          const { data: paymentsRaw, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .in('resident_id', residentIds)
            .eq('year', selectedYear)
            .eq('status', 'paid');
          if (paymentsError) throw paymentsError;
          payments = paymentsRaw || [];
        }
        // Obtener todos los pagos del condominio (para el resumen anual)
        const { data: allPayments, error: allPaymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('condominium_id', selectedCondo.id)
          .eq('status', 'paid');
        if (allPaymentsError) throw allPaymentsError;
        setPaymentsGlobal(allPayments || []);
        // Después de obtener los pagos:
        const startMonthIndex = MONTHS.indexOf(selectedMonth);
        const monthsToCheck = MONTHS.filter((month, idx) => idx >= startMonthIndex && (selectedYear !== currentYear || idx <= currentMonthIndex));
        // Calcular adeudos por residente (sumando todos los tipos de cuota)
        const debts = (residentsData || []).map((resident: Resident) => {
          const subtotales: { [paymentTypeId: string]: number } = {};
          (paymentTypes as import('../types').PaymentType[]).forEach((pt: PaymentType) => {
            let applicable = pt.is_general || false;
            if (!pt.is_general) {
              applicable = !!residentPaymentTypes.find(rpt => rpt.resident_id === resident.id && rpt.payment_type_id === pt.id);
            }
            if (applicable) {
              const paidMonths = payments.filter(p => p.resident_id === resident.id && p.payment_type_id === pt.id).map(p => p.month);
              const monthsDebt = monthsToCheck.filter(month => !paidMonths.includes(month));
              subtotales[pt.id] = monthsDebt.length * ((pt as import('../types').PaymentType).cuota_mensual ?? 0);
            } else {
              subtotales[pt.id] = 0;
            }
          });
          const amountOwed = Object.values(subtotales).reduce((a, b) => a + b, 0);
          return { resident, subtotales, amountOwed };
        });

        const residentPaymentsData = (residentsData || []).map((resident: Resident) => {
          const totalPaid = paymentsGlobal
            .filter(p => p.resident_id === resident.id && p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);
          return { residentId: resident.id, totalPaid };
        });

        setResidentDebts(debts);
        setResidentPayments(residentPaymentsData);
        setPaymentTypes((paymentTypes || []) as PaymentType[]);
        setResidentPaymentTypes(residentPaymentTypes || []);
      } catch (error: any) {
        toast.error('Error al cargar adeudos por residente: ' + error.message);
      } finally {
        setDebtLoading(false);
      }
    };
    fetchDebts();
  }, [selectedCondo, selectedYear, selectedMonth]);

  const sortedResidentDebts = [...residentDebts].sort((a, b) => {
    const unitA = a.resident.unit_number ? parseInt(a.resident.unit_number, 10) : 0;
    const unitB = b.resident.unit_number ? parseInt(b.resident.unit_number, 10) : 0;
    return unitA - unitB;
  });

  // Filtra los años a mostrar en la tabla de resumen por deudor y año
  type YearResumen = { year: number, total: number };
  const yearsToShow = availableYears.filter(y => y >= selectedYear);

  // Resumen por deudor y por año SOLO para los años a partir del seleccionado
  type ResumenAnual = YearResumen[];
  const resumenPorDeudorAnio = sortedResidentDebts.length > 0 ? sortedResidentDebts.map(({ resident }) => {
    // Solo calcula resumen para los años a mostrar
    const resumenAnual: ResumenAnual = yearsToShow.map((year: number) => {
      let total = 0;
      (paymentTypes as import('../types').PaymentType[]).forEach((pt: PaymentType) => {
        let applicable = pt.is_general || false;
        if (!pt.is_general) {
          applicable = !!residentDebts.find(d => d.resident.id === resident.id && d.subtotales[pt.id] > 0);
        }
        if (applicable) {
          // Obtener pagos del residente, tipo y año
          const pagos = paymentsGlobal.filter((p: Payment) => p.resident_id === resident.id && p.payment_type_id === pt.id && p.year === year);
          // Calcular meses con pagos en el condominio y año
          const mesesConPagos = Array.from(new Set(paymentsGlobal.filter((p: Payment) => p.condominium_id === resident.condominium_id && p.year === year).map((p: Payment) => p.month)));
          const currentYearLocal = new Date().getFullYear();
          const currentMonthIndex = year === currentYearLocal ? new Date().getMonth() : 11;
          // Si es el año seleccionado, usar el mes seleccionado como inicio; si no, desde enero
          const startMonthIdx = year === selectedYear ? MONTHS.indexOf(selectedMonth) : 0;
          const monthsToCheck = MONTHS.filter((month, idx) => idx >= startMonthIdx && mesesConPagos.includes(month) && (year !== currentYearLocal || idx <= currentMonthIndex));
          const paidMonths = pagos.map((p: Payment) => p.month);
          const monthsDebt = monthsToCheck.filter(month => !paidMonths.includes(month));
          total += monthsDebt.length * ((pt as import('../types').PaymentType).cuota_mensual ?? 0);
        }
      });
      return { year, total };
    });
    return { resident, resumenAnual };
  }) : [];

  // Ordenar resumenPorDeudorAnio por número de unidad
  const resumenPorDeudorAnioOrdenado = [...resumenPorDeudorAnio].sort((a, b) => {
    const unitA = a.resident.unit_number ? parseInt(a.resident.unit_number, 10) : 0;
    const unitB = b.resident.unit_number ? parseInt(b.resident.unit_number, 10) : 0;
    return unitA - unitB;
  });
  // Calcular totales por año SOLO para los años a mostrar
  const totalesPorAnio = yearsToShow.map((year, idx) => resumenPorDeudorAnioOrdenado.reduce((sum, r) => sum + (r.resumenAnual[idx]?.total || 0), 0));
  // Calcular total por residente
  const resumenPorDeudorAnioConTotal = resumenPorDeudorAnioOrdenado.map(r => ({
    ...r,
    totalResidente: r.resumenAnual.reduce((sum, a) => sum + (a.total || 0), 0)
  }));
  // Calcular total final
  const totalFinal = totalesPorAnio.reduce((sum, t) => sum + t, 0);

  // Guardar año y mes seleccionados en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem('dashboard_selectedYear', String(selectedYear));
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('dashboard_selectedMonth', selectedMonth);
  }, [selectedMonth]);

  // Función para armar el desglose en HTML por mes y año
  const buildEmailHtml = (
    resident: Resident,
    subtotales: { [paymentTypeId: string]: number },
    amountOwed: number,
    payments: Payment[],
    paymentTypes: PaymentType[],
    selectedYear: number,
    selectedMonth: Month,
    selectedCondo: Condominium | null,
    residentPaymentTypes: { resident_id: string; payment_type_id: string }[]
  ) => {
    let rows = '';
    const startMonthIdx = MONTHS.indexOf(selectedMonth);
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    paymentTypes.forEach(pt => {
      let applicable = pt.is_general;
      if (!pt.is_general) {
        applicable = !!residentPaymentTypes.find(rpt => rpt.resident_id === resident.id && rpt.payment_type_id === pt.id);
      }
      if (applicable && (subtotales[pt.id] ?? 0) > 0) {
        const paidMonths = payments.filter(p => p.resident_id === resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
        // Solo meses desde el mes seleccionado hasta el mes actual (si es el año actual) o diciembre
        const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIdx && (selectedYear !== currentYear || idx <= currentMonthIdx));
        const mesesAdeudados = monthsToCheck.filter(month => !paidMonths.includes(month));
        mesesAdeudados.forEach(month => {
          rows += `<tr><td style='padding:4px 8px;border:1px solid #ccc;'>${selectedYear}</td><td style='padding:4px 8px;border:1px solid #ccc;'>${month}</td><td style='padding:4px 8px;border:1px solid #ccc;'>${pt.name}</td><td style='padding:4px 8px;border:1px solid #ccc;text-align:right;'>${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pt.cuota_mensual ?? 0)}</td></tr>`;
        });
      }
    });
    return `
      <div style='font-family:sans-serif;'>
        <h2>Estado de Cuenta Mantenimiento</h2>
        <p><b>Condominio:</b> ${selectedCondo?.name ?? ''}</p>
        <p><b>Residente:</b> ${resident.name}</p>
        <table style='border-collapse:collapse;margin-bottom:8px;'>
          <thead><tr><th style='padding:4px 8px;border:1px solid #ccc;'>Año</th><th style='padding:4px 8px;border:1px solid #ccc;'>Mes</th><th style='padding:4px 8px;border:1px solid #ccc;'>Concepto</th><th style='padding:4px 8px;border:1px solid #ccc;'>Monto</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan='3' style='padding:4px 8px;border:1px solid #ccc;font-weight:bold;'>Total Adeudado</td><td style='padding:4px 8px;border:1px solid #ccc;font-weight:bold;text-align:right;color:red;'>${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amountOwed)}</td></tr></tfoot>
        </table>
        <p>Por favor, póngase al corriente lo antes posible.<br/>Saludos,<br/>Administración</p>
      </div>
    `;
  };

  const handleSendEmailWithPdf = (
    resident: Resident,
    subtotales: { [paymentTypeId: string]: number },
    amountOwed: number
  ) => {
    setEmailData({ resident, subtotales, amountOwed });
    setShowEmailModal(true);
  };

  const handleSendWhatsApp = async (resident: Resident, amountOwed: number) => {
    if (!resident.phone) {
      toast.error("El residente no tiene un número de teléfono registrado.");
      return;
    }

    const totalPaid = residentPayments.find(rp => rp.residentId === resident.id)?.totalPaid || 0;

    const adeudosDetalleUrl = `${window.location.origin}/estado-cuenta/${resident.id}?year=${selectedYear}&month=${selectedMonth || MONTHS[0]}`;
    const webhookUrl = `https://n8n.usoreal.com/webhook/condo?phone=${resident.phone}&name=${encodeURIComponent(resident.name)}&totalAdeudos=${amountOwed}&totalPagos=${totalPaid}&adeudosUrl=${encodeURIComponent(adeudosDetalleUrl)}`;

    try {
      const response = await fetch(webhookUrl, {
        method: 'GET',
      });

      if (response.ok) {
        toast.success("Mensaje de WhatsApp enviado exitosamente.");
      } else {
        toast.error("Error al enviar el mensaje de WhatsApp.");
      }
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      toast.error("Error de red al enviar el mensaje de WhatsApp.");
    }
  };

  const handleConfirmSendEmail = () => {
    if (!emailData) return;
    const { resident, subtotales, amountOwed } = emailData;
    const subject = encodeURIComponent('Estado de Cuenta de Mantenimiento');
    const startMonthIdx = MONTHS.indexOf(selectedMonth);
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    let plainRows = '';
    paymentTypes.forEach(pt => {
      let applicable = pt.is_general;
      if (!pt.is_general) {
        applicable = !!residentPaymentTypes.find(rpt => rpt.resident_id === resident.id && rpt.payment_type_id === pt.id);
      }
      if (applicable && (subtotales[pt.id] ?? 0) > 0) {
        const paidMonths = paymentsGlobal.filter(p => p.resident_id === resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
        const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIdx && (selectedYear !== currentYear || idx <= currentMonthIdx));
        const mesesAdeudados = monthsToCheck.filter(month => !paidMonths.includes(month));
        mesesAdeudados.forEach(month => {
          plainRows += `${selectedYear} - ${month} - ${pt.name}: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pt.cuota_mensual ?? 0)}\n`;
        });
      }
    });
    const mailBody = encodeURIComponent(
      `Condominio: ${selectedCondo?.name ?? ''}\n` +
      `Residente: ${resident.name}\n\n` +
      `Le informamos que su saldo pendiente es de: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amountOwed)}\n\n` +
      `Detalle de adeudos por mes, año y concepto (a partir de ${selectedMonth} ${selectedYear}):\n${plainRows}\n` +
      'Por favor, póngase al corriente lo antes posible.\n\nSaludos,\nAdministración'
    );
    window.open(`mailto:${resident.email}?subject=${subject}&body=${mailBody}`);
    setShowEmailModal(false);
    setEmailData(null);
  };

  const sendPdfEmail = async () => {
    if (!emailData) return;
    // Esperar un pequeño tiempo para asegurar que el DOM esté renderizado
    await new Promise(resolve => setTimeout(resolve, 300));
    // 1. Generar el PDF visualmente igual que en la página de detalle
    const pdfElement = document.getElementById('pdf-preview');
    if (!pdfElement) {
      toast.error('No se encontró la estructura del PDF para enviar.');
      return;
    }
    const canvas = await html2canvas(pdfElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pdfWidth = pageWidth - 40;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
    // 2. Obtener el PDF como base64
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    // 3. Enviar el PDF y los datos por fetch
    try {
      const response = await fetch('https://contafactura.info/api/envia_test.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: emailData.resident.name,
          email: emailData.resident.email,
          message: 'Estado de cuenta de mantenimiento',
          asunto: 'Estado de cuenta',
          pdf_base64: pdfBase64
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Correo enviado exitosamente');
      } else {
        toast.error('Error al enviar el correo: ' + (result.error || ''));
      }
    } catch (err) {
      toast.error('Error al enviar el correo');
    }
    setShowEmailModal(false);
    setEmailData(null);
  };

  const navigate = useNavigate();

  if (!selectedCondo) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Dashboard
        </h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value as Month)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <CondoSelect
            condominiums={condominiums}
            selectedCondominium={selectedCondo}
            onSelect={setSelectedCondo}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {financialData && (
            <div className="mb-8">
              <FinancialSummary data={financialData} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={`Total Recaudado ${selectedYear}`}
              value={financialData?.monthlySummaries ? new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(financialData.monthlySummaries.reduce((sum, month) => sum + (month?.ingresos || 0), 0)) : '$0.00'}
              icon={<DollarSign size={20} className="text-white" />}
              color="bg-green-500"
            />
            <StatCard
              title={`Total Gastos ${selectedYear}`}
              value={financialData?.monthlySummaries ? new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(financialData.monthlySummaries.reduce((sum, month) => sum + (month?.egresos || 0), 0)) : '$0.00'}
              icon={<TrendingUp size={20} className="text-white" />}
              color="bg-red-500"
            />
            <StatCard
              title={`Saldo Inicial ${selectedYear}`}
              value={financialData ? new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(financialData.saldoInicial || 0) : '$0.00'}
              icon={<DollarSign size={20} className="text-white" />}
              color="bg-blue-500"
            />
            <StatCard
              title={`Saldo Final ${selectedYear}`}
              value={financialData ? new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(financialData.saldoFinal || 0) : '$0.00'}
              icon={<DollarSign size={20} className="text-white" />}
              color="bg-purple-500"
            />
            <StatCard
              title={`Total Esperado ${selectedYear}`}
              value={selectedCondo ? new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(selectedCondo.monthly_fee * residentCount * 12) : '$0.00'}
              icon={<DollarSign size={20} className="text-white" />}
              color="bg-green-500"
            />
            <StatCard
              title={`Total Recibido ${selectedYear}`}
              value={financialData?.monthlySummaries ? new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(financialData.monthlySummaries.reduce((sum, month) => sum + (month?.ingresos || 0), 0)) : '$0.00'}
              icon={<DollarSign size={20} className="text-white" />}
              color="bg-green-500"
            />
          </div>

          {/* Resumen de adeudos por residente */}
          <div className="bg-white rounded-lg shadow-md overflow-x-auto mb-8">
            <div className="px-6 py-4 bg-red-50">
              <h3 className="text-lg font-semibold text-red-900">Resumen de Adeudos por Residente</h3>
            </div>
            {debtLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Residente</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                    {paymentTypes.map((pt: PaymentType) => (
                      <th key={pt.id} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{pt.name}</th>
                    ))}
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Adeudado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedResidentDebts.length === 0 ? (
                    <tr>
                      <td colSpan={paymentTypes.length + 3} className="text-center py-6 text-gray-400">No hay adeudos registrados</td>
                    </tr>
                  ) : (
                    sortedResidentDebts.map(({ resident, subtotales, amountOwed }) => (
                      <tr key={resident.id} className={amountOwed === 0 ? 'bg-green-50 text-green-700 font-semibold' : ''}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{resident.unit_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/adeudos/detalle/${resident.id}?year=${selectedYear}&month=${selectedMonth}&autoSendEmail=1`)}
                            title="Enviar estado de cuenta por email"
                            className="text-blue-600 hover:text-blue-900"
                            disabled={!resident.email}
                          >
                            <MailIcon size={20} />
                          </button>
                          <Link 
                            to={`/adeudos/detalle/${resident.id}?year=${selectedYear}&month=${selectedMonth || MONTHS[0]}`} 
                            className="text-blue-700 underline hover:text-blue-900"
                            onClick={() => {
                              const monthToUse = selectedMonth || MONTHS[0];
                              console.log('Dashboard link clicked:', { 
                                selectedYear, 
                                selectedMonth, 
                                monthToUse,
                                url: `/adeudos/detalle/${resident.id}?year=${selectedYear}&month=${monthToUse}`,
                                location: window.location.href
                              });
                            }}
                          >
                            {resident.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => handleSendWhatsApp(resident, amountOwed)}
                            title="Enviar mensaje de WhatsApp"
                            className="text-green-500 hover:text-green-700"
                            disabled={!resident.phone}
                          >
                            <FaWhatsapp size={20} />
                          </button>
                        </td>
                        {paymentTypes.map((pt: PaymentType) => (
                          <td key={pt.id} className="px-4 py-2 text-center text-sm font-bold text-blue-700">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(subtotales[pt.id] || 0)}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-center text-sm font-bold text-blue-900">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amountOwed)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
                    </div>

          {/* Resumen por deudor y por año */}
          <div className="bg-white rounded-lg shadow-md overflow-x-auto mb-8">
            <div className="px-6 py-4 bg-blue-50 flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-blue-900 mb-2 sm:mb-0">Resumen de Adeudos por Deudor y Año</h3>
              <div className="flex items-center space-x-2">
                <label htmlFor="mes-inicio" className="text-sm text-gray-700">Mes inicio:</label>
                <select
                  id="mes-inicio"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value as Month)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <label htmlFor="anio-inicio" className="text-sm text-gray-700 ml-4">Año:</label>
                <select
                  id="anio-inicio"
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Residente</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Residente</th>
                  {yearsToShow.map(year => (
                    <th key={year} className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumenPorDeudorAnioConTotal.length === 0 ? (
                  <tr>
                    <td colSpan={yearsToShow.length + 3} className="text-center py-6 text-gray-400">No hay adeudos registrados</td>
                  </tr>
                ) : (
                  <>
                  {resumenPorDeudorAnioConTotal.map(({ resident, resumenAnual, totalResidente }) => (
                    <tr key={resident.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{resident.unit_number}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{resident.name}</td>
                      <td className="px-4 py-2 text-center text-sm font-bold text-blue-900">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalResidente)}</td>
                      {resumenAnual.map(({ year, total }) => (
                        <td key={year} className="px-4 py-2 text-center text-sm font-bold text-blue-700">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)}</td>
                      ))}
                    </tr>
                  ))}
                  {/* Fila de totales por año y total final */}
                  <tr className="bg-blue-100 font-bold">
                    <td className="px-4 py-2 text-right" colSpan={2}>Total Año</td>
                    <td className="px-4 py-2 text-center text-blue-900">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalFinal)}</td>
                    {totalesPorAnio.map((total, idx) => (
                      <td key={idx} className="px-4 py-2 text-center text-blue-900">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(total)}</td>
                    ))}
                  </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal de confirmación para enviar email */}
          {showEmailModal && emailData && (
            <ConfirmDialog
              title="Enviar estado de cuenta por email"
              description={<div>
                <div className="mb-2">¿Deseas enviar el siguiente estado de cuenta a <b>{emailData.resident.name}</b> ({emailData.resident.email})?</div>
                <div className="border rounded p-2 bg-gray-50 text-xs overflow-x-auto" dangerouslySetInnerHTML={{ __html: buildEmailHtml(emailData.resident, emailData.subtotales, emailData.amountOwed, paymentsGlobal, paymentTypes, selectedYear, selectedMonth, selectedCondo, residentPaymentTypes) }} />
                <div className="mt-2 text-gray-500">Nota: El correo se abrirá en tu cliente de email. Si deseas enviar el desglose en HTML, copia y pega el contenido en el cuerpo del correo.</div>
              </div>}
              confirmText="Enviar Email"
              cancelText="Cancelar"
              onConfirm={sendPdfEmail}
              onCancel={() => { setShowEmailModal(false); setEmailData(null); }}
            />
          )}

          {/* Renderizado oculto del PDF para enviar por email */}
          {showEmailModal && emailData && (
            <div style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
              <div id="pdf-preview" className="mt-6 border-2 border-dashed border-blue-400 rounded-lg bg-white shadow-lg p-8 max-w-3xl mx-auto print:bg-white">
                <div className="flex items-center mb-4">
                  <div className="mr-4">
                    {selectedCondo?.logo ? (
                      <img src={selectedCondo.logo} alt="Logo condominio" className="h-20 w-auto object-contain rounded" />
                    ) : (
                      <div className="h-20 w-20 bg-gray-200 flex items-center justify-center rounded text-gray-400">Logo</div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCondo?.name || 'Nombre del condominio'}</h2>
                    <div className="text-gray-700 text-sm">{selectedCondo?.address}</div>
                    <div className="text-gray-500 text-xs">{selectedCondo?.description}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">Fecha de emisión: {new Date().toLocaleString('es-MX')}</span>
                  <span className="text-xs text-gray-500">Año: {selectedYear}</span>
                </div>
                <h1 className="text-xl font-bold text-center text-blue-900 mb-4 mt-2">Estado de cuenta de mantenimiento</h1>
                {/* Tabla de adeudos */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-red-700 mb-2">Adeudos</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipo de Cuota</th>
                          {MONTHS.filter((m, idx) => idx >= MONTHS.indexOf(selectedMonth) && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth())).map(month => (
                            <th key={month} className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{month}</th>
                          ))}
                          <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Meses</th>
                          <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Monto Adeudado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).map(pt => {
                          const cuotaMensual = pt.cuota_mensual || 0;
                          const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                          const startMonthIndex = MONTHS.indexOf(selectedMonth);
                          const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                          const adeudosMes = monthsToCheck.map(month => !paidMonths.includes(month));
                          const totalMeses = adeudosMes.filter(Boolean).length;
                          const monto = totalMeses * cuotaMensual;
                          return (
                            <tr key={pt.id}>
                              <td className="px-1 py-1 whitespace-nowrap text-gray-900">{pt.name}</td>
                              {monthsToCheck.map((month, i) => (
                                <td key={i} className={`px-1 py-1 text-center ${adeudosMes[i] ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-50 text-green-600'}`}>{adeudosMes[i] ? '●' : ''}</td>
                              ))}
                              {/* Celdas vacías si el año es actual y no todos los meses */}
                              {selectedYear === new Date().getFullYear() && Array(12 - monthsToCheck.length).fill(0).map((_, i) => <td key={`empty-${i}`} className="px-1 py-1"></td>)}
                              <td className="px-1 py-1 text-center font-bold text-red-700 whitespace-nowrap">{totalMeses}</td>
                              <td className="px-1 py-1 text-center font-bold text-blue-700 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)}</td>
                            </tr>
                          );
                        })}
                        {/* Fila de totales por mes y general */}
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-1 py-1 text-right whitespace-nowrap">Total</td>
                          {MONTHS.filter((m, idx) => idx >= MONTHS.indexOf(selectedMonth) && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth())).map((month, i) => {
                            const startMonthIndex = MONTHS.indexOf(selectedMonth);
                            const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                            if (i >= monthsToCheck.length) return <td key={i} className="px-1 py-1"></td>;
                            const totalMes = paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).reduce((sum, pt) => {
                              const cuotaMensual = pt.cuota_mensual || 0;
                              const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                              return sum + (!paidMonths.includes(month) ? cuotaMensual : 0);
                            }, 0);
                            return <td key={i} className="px-1 py-1 text-center text-blue-900">{totalMes > 0 ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalMes) : ''}</td>;
                          })}
                          <td className="px-1 py-1 text-center text-blue-900 whitespace-nowrap">{paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).reduce((a, pt) => {
                            const cuotaMensual = pt.cuota_mensual || 0;
                            const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                            const startMonthIndex = MONTHS.indexOf(selectedMonth);
                            const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                            return a + monthsToCheck.filter((month, i) => !paidMonths.includes(month)).length;
                          }, 0)}</td>
                          <td className="px-1 py-1 text-center text-blue-900 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).reduce((sum, pt) => {
                            const cuotaMensual = pt.cuota_mensual || 0;
                            const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                            const startMonthIndex = MONTHS.indexOf(selectedMonth);
                            const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                            return sum + monthsToCheck.filter(month => !paidMonths.includes(month)).length * cuotaMensual;
                          }, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Tabla de pagos */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Pagos realizados</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipo de Cuota</th>
                          {MONTHS.filter((m, idx) => idx >= MONTHS.indexOf(selectedMonth) && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth())).map(month => (
                            <th key={month} className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{month}</th>
                          ))}
                          <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Meses</th>
                          <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Monto Pagado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).map(pt => {
                          const cuotaMensual = pt.cuota_mensual || 0;
                          const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                          const startMonthIndex = MONTHS.indexOf(selectedMonth);
                          const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                          const pagosMes = monthsToCheck.map(month => paidMonths.includes(month));
                          const totalMesesPagados = pagosMes.filter(Boolean).length;
                          const montoPagado = totalMesesPagados * cuotaMensual;
                          return (
                            <tr key={pt.id}>
                              <td className="px-1 py-1 whitespace-nowrap text-gray-900">{pt.name}</td>
                              {monthsToCheck.map((month, i) => (
                                <td key={i} className={`px-1 py-1 text-center ${pagosMes[i] ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50 text-gray-400'}`}>{pagosMes[i] ? '✔' : ''}</td>
                              ))}
                              {selectedYear === new Date().getFullYear() && Array(12 - monthsToCheck.length).fill(0).map((_, i) => <td key={`empty-p-${i}`} className="px-1 py-1"></td>)}
                              <td className="px-1 py-1 text-center font-bold text-green-700 whitespace-nowrap">{totalMesesPagados}</td>
                              <td className="px-1 py-1 text-center font-bold text-blue-700 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(montoPagado)}</td>
                            </tr>
                          );
                        })}
                        {/* Fila de totales por mes y general */}
                        <tr className="bg-green-50 font-bold">
                          <td className="px-1 py-1 text-right whitespace-nowrap">Total</td>
                          {MONTHS.filter((m, idx) => idx >= MONTHS.indexOf(selectedMonth) && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth())).map((month, i) => {
                            const startMonthIndex = MONTHS.indexOf(selectedMonth);
                            const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                            if (i >= monthsToCheck.length) return <td key={i} className="px-1 py-1"></td>;
                            const totalMes = paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).reduce((sum, pt) => {
                              const cuotaMensual = pt.cuota_mensual || 0;
                              const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                              return sum + (paidMonths.includes(month) ? cuotaMensual : 0);
                            }, 0);
                            return <td key={i} className="px-1 py-1 text-center text-green-900">{totalMes > 0 ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalMes) : ''}</td>;
                          })}
                          <td className="px-1 py-1 text-center text-green-900 whitespace-nowrap">{paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).reduce((a, pt) => {
                            const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                            const startMonthIndex = MONTHS.indexOf(selectedMonth);
                            const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                            return a + monthsToCheck.filter(month => paidMonths.includes(month)).length;
                          }, 0)}</td>
                          <td className="px-1 py-1 text-center text-green-900 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.resident_id === emailData.resident.id && rpt.payment_type_id === pt.id)).reduce((sum, pt) => {
                            const cuotaMensual = pt.cuota_mensual || 0;
                            const paidMonths = paymentsGlobal.filter(p => p.resident_id === emailData.resident.id && p.payment_type_id === pt.id && p.year === selectedYear).map(p => p.month);
                            const startMonthIndex = MONTHS.indexOf(selectedMonth);
                            const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (selectedYear !== new Date().getFullYear() || idx <= new Date().getMonth()));
                            return sum + monthsToCheck.filter(month => paidMonths.includes(month)).length * cuotaMensual;
                          }, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mb-6 text-gray-700 text-sm">
                  Estimado condómino, nos dirigimos a usted con la intención de informarle que debe cumplir con el pago mensual del mantenimiento.
                </div>
                <div className="flex justify-between mt-10 mb-4">
                  <div className="flex flex-col items-center w-1/3">
                    <div className="border-t border-gray-400 w-32 mb-1"></div>
                    <span className="text-xs text-gray-600">Presidente</span>
                    {selectedCondo?.presidente && <span className="text-xs text-gray-800 font-semibold mt-1">{selectedCondo.presidente}</span>}
                  </div>
                  <div className="flex flex-col items-center w-1/3">
                    <div className="border-t border-gray-400 w-32 mb-1"></div>
                    <span className="text-xs text-gray-600">Tesorero</span>
                    {selectedCondo?.tesorero && <span className="text-xs text-gray-800 font-semibold mt-1">{selectedCondo.tesorero}</span>}
                  </div>
                  <div className="flex flex-col items-center w-1/3">
                    <div className="border-t border-gray-400 w-32 mb-1"></div>
                    <span className="text-xs text-gray-600">Vocal</span>
                    {selectedCondo?.vocal && <span className="text-xs text-gray-800 font-semibold mt-1">{selectedCondo.vocal}</span>}
                  </div>
                </div>
                <div className="text-center text-xs text-gray-500 mt-6">
                  El pago de una cuota de forma puntual es una responsabilidad necesaria para la funcionalidad adecuada de un condominio.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;