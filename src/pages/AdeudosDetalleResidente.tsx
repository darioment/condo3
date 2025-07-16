import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Resident, Payment, PaymentType, Month, Condominium } from '../types';
import { Loader2 } from 'lucide-react';
import { MONTHS } from '../types';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';

const AdeudosDetalleResidente: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(Number(searchParams.get('year')) || currentYear);
  const [month, setMonth] = useState<Month | undefined>(decodeURIComponent(searchParams.get('month') || '') as Month || undefined);
  
  console.log('AdeudosDetalleResidente - searchParams:', searchParams.toString(), 'year:', year, 'month:', month);
  const [resident, setResident] = useState<Resident | null>(null);
  const [condo, setCondo] = useState<Condominium | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [residentPaymentTypes, setResidentPaymentTypes] = useState<{ payment_type_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesesConPagos, setMesesConPagos] = useState<string[]>([...MONTHS]);
  const currentMonthIndex = new Date().getFullYear() === year ? new Date().getMonth() : 11; // 0-indexed
  const [sendingEmail, setSendingEmail] = useState(false);
  const autoSendEmail = searchParams.get('autoSendEmail') === '1';

  useEffect(() => {
    const params: { year: string; month?: string } = { year: String(year) };
    if (month) {
      params.month = month;
    }
    setSearchParams(params);
  }, [year, month, setSearchParams]);

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
        // Obtener asignaciones de tipos de cuota para el residente
        const { data: rptData, error: rptError } = await supabase
          .from('resident_payment_types')
          .select('payment_type_id')
          .eq('resident_id', id);
        if (rptError) throw rptError;
        setResidentPaymentTypes(rptData || []);
        // Obtener pagos del año y filtrar después
        console.log('Fetching payments for:', { residentId: id, year, month });
        
        const { data: payData, error: payError } = await supabase
          .from('payments')
          .select('*')
          .eq('resident_id', id)
          .eq('year', year);
        
        if (payError) {
          console.error('Payment fetch error:', payError);
          throw payError;
        }
        
        // Filtrar pagos desde el mes especificado
        let filteredPayments = payData || [];
        if (month) {
          const startMonthIndex = MONTHS.indexOf(month);
          console.log('Month filtering:', { month, startMonthIndex });
          filteredPayments = (payData || []).filter(payment => {
            const paymentMonthIndex = MONTHS.indexOf(payment.month);
            return paymentMonthIndex >= startMonthIndex;
          });
        }
        
        console.log('Payments found:', { total: payData?.length, filtered: filteredPayments.length });
        setPayments(filteredPayments);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, year, month]);

  useEffect(() => {
    const fetchMesesConPagos = async () => {
      if (!resident) return;
      const { data: pagosCondo, error } = await supabase
        .from('payments')
        .select('month')
        .eq('condominium_id', resident.condominium_id)
        .eq('year', year)
        .eq('status', 'paid');
      if (!error && pagosCondo) {
        let meses = Array.from(new Set(pagosCondo.map((p: any) => p.month)));
        // Filtrar meses futuros si es el año actual
        if (year === currentYear) {
          meses = meses.filter(m => MONTHS.indexOf(m) <= currentMonthIndex);
        }
        setMesesConPagos(meses);
      }
    };
    fetchMesesConPagos();
  }, [resident, year]);

  // Función para generar y descargar el PDF
  const handleDownloadPDF = async () => {
    const pdfElement = document.getElementById('pdf-preview');
    if (!pdfElement) return;
    const canvas = await html2canvas(pdfElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    // Usa el tamaño del canvas para calcular el alto proporcional
    const pdfWidth = pageWidth - 40;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
    pdf.save(`estado_cuenta_${resident?.name || 'residente'}.pdf`);
  };

  // Nueva función para enviar email usando mailto con link al preview
  const handleSendEmailMailto = () => {
    const email = resident?.email || '';
    const subject = encodeURIComponent('Estado de cuenta de mantenimiento');
    const previewUrl = `${window.location.origin}/estado-cuenta/${resident?.id}?year=${year}${month ? `&month=${month}` : ''}`;
    const body = encodeURIComponent(
      `Hola ${resident?.name},\n\nConsulta tu estado de cuenta de mantenimiento en el siguiente enlace:\n${previewUrl}\n\nSaludos,\nAdministración`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-blue-500" /></div>;
  }
  if (!resident) {
    return <div className="text-center py-12 text-gray-500">Residente no encontrado</div>;
  }

  // Calcular los meses con pagos de cualquier residente en el condominio y año
  const startMonthIndex = month ? MONTHS.indexOf(month) : 0;

  // Calcular los meses a mostrar en las tablas
  const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (year !== currentYear || idx <= currentMonthIndex));
  // Filtrar tipos de cuota que aplican al residente
  const paymentTypesAplicables = paymentTypes.filter(pt => pt.is_general || residentPaymentTypes.some(rpt => rpt.payment_type_id === pt.id));
  const detalle = paymentTypesAplicables.map((pt) => {
    const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
    const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
    const adeudosMes = monthsToCheck.map(month => !paidMonths.includes(month));
    const totalMeses = adeudosMes.filter(Boolean).length;
    const monto = totalMeses * cuotaMensual;
    return {
      tipo: pt,
      adeudosMes,
      totalMeses,
      monto
    };
  });

  // Totales por mes (sumando todos los tipos de cuota)
  const totalesPorMes = monthsToCheck.map((month, i) =>
    detalle.reduce((sum, d) => sum + (d.adeudosMes[i] ? ((d.tipo as PaymentType).cuota_mensual || 0) : 0), 0)
  );
  const totalGeneral = detalle.reduce((sum, d) => sum + d.monto, 0);

  // Años disponibles (2021 a actual+1)
  const availableYears = Array.from({ length: currentYear - 2021 + 2 }, (_, i) => 2021 + i);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={`/dashboard?year=${year}`} className="text-blue-600 hover:underline mb-4 inline-block">← Volver al Dashboard</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Detalle Completo de Adeudos</h1>
      <div className="mb-4 text-gray-700">
        <span className="font-semibold">Residente:</span> {resident.name} <br />
        <span className="font-semibold">Unidad:</span> {resident.unit_number} <br />
        {condo && <><span className="font-semibold">Condominio:</span> {condo.name}</>}<br />
      </div>
      <div className="flex items-center space-x-4 mb-6">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Cuota</th>
              {monthsToCheck.map(month => (
                <th key={month} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{month}</th>
              ))}
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Meses</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Adeudado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {detalle.map(({ tipo, adeudosMes, totalMeses, monto }) => (
              <tr key={tipo.id}>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{tipo.name}</td>
                {adeudosMes.map((adeuda, i) => (
                  <td key={i} className={`px-2 py-2 text-center text-sm ${adeuda ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-50 text-green-600'}`}>{adeuda ? '●' : ''}</td>
                ))}
                <td className="px-4 py-2 text-center text-sm font-bold text-red-700">{totalMeses}</td>
                <td className="px-4 py-2 text-center text-sm font-bold text-blue-700">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)}</td>
              </tr>
            ))}
            {/* Fila de totales por mes y general */}
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-2 text-right">Total</td>
              {monthsToCheck.map((_, i) => (
                <td key={i} className="px-2 py-2 text-center text-blue-900">{detalle.reduce((sum, d) => sum + (d.adeudosMes[i] ? ((d.tipo as PaymentType).cuota_mensual || 0) : 0), 0) > 0 ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(detalle.reduce((sum, d) => sum + (d.adeudosMes[i] ? ((d.tipo as PaymentType).cuota_mensual || 0) : 0), 0)) : ''}</td>
              ))}
              <td className="px-4 py-2 text-center text-blue-900">{detalle.reduce((a, d) => a + d.totalMeses, 0)}</td>
              <td className="px-4 py-2 text-center text-blue-900">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalGeneral)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* Tabla de pagos realizados */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-green-700 mb-2">Detalle de Pagos Realizados</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Cuota</th>
                {monthsToCheck.map(month => (
                  <th key={month} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{month}</th>
                ))}
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Meses</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Pagado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentTypesAplicables.map((pt) => {
                const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                const pagosMes = monthsToCheck.map(month => paidMonths.includes(month));
                const totalMesesPagados = pagosMes.filter(Boolean).length;
                const montoPagado = totalMesesPagados * cuotaMensual;
                return (
                  <tr key={pt.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{pt.name}</td>
                    {pagosMes.map((pagado, i) => (
                      <td key={i} className={`px-2 py-2 text-center text-sm ${pagado ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50 text-gray-400'}`}>{pagado ? '✔' : ''}</td>
                    ))}
                    <td className="px-4 py-2 text-center text-sm font-bold text-green-700">{totalMesesPagados}</td>
                    <td className="px-4 py-2 text-center text-sm font-bold text-blue-700">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(montoPagado)}</td>
                  </tr>
                );
              })}
              {/* Fila de totales por mes y general */}
              <tr className="bg-green-50 font-bold">
                <td className="px-4 py-2 text-right">Total</td>
                {monthsToCheck.map((month, i) => (
                  <td key={i} className="px-2 py-2 text-center text-green-900">{
                    paymentTypesAplicables.reduce((sum, pt) => {
                      const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                      const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                      return sum + (paidMonths.includes(month) ? cuotaMensual : 0);
                    }, 0) > 0
                      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
                          paymentTypesAplicables.reduce((sum, pt) => {
                            const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                            const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                            return sum + (paidMonths.includes(month) ? cuotaMensual : 0);
                          }, 0)
                        )
                      : ''
                  }</td>
                ))}
                <td className="px-4 py-2 text-center text-green-900">{paymentTypesAplicables.reduce((a, pt) => {
                  const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                  return a + monthsToCheck.filter(month => paidMonths.includes(month)).length;
                }, 0)}</td>
                <td className="px-4 py-2 text-center text-green-900">{
                  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
                    paymentTypesAplicables.reduce((sum, pt) => {
                      const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                      const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                      return sum + monthsToCheck.filter(month => paidMonths.includes(month)).length * cuotaMensual;
                    }, 0)
                  )
                }</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Estructura visual del PDF */}
      <div className="flex justify-center mt-8">
        <button
          onClick={handleDownloadPDF}
          className="px-6 py-3 bg-blue-700 text-white rounded-lg shadow hover:bg-blue-900 font-semibold text-lg"
        >
          Descargar PDF
        </button>
      </div>
      <div id="pdf-preview" className="mt-6 border-2 border-dashed border-blue-400 rounded-lg bg-white shadow-lg p-8 max-w-3xl mx-auto print:bg-white">
        <div className="flex items-center mb-4">
          <div className="mr-4">
            {condo?.logo ? (
              <img src={condo.logo} alt="Logo condominio" className="h-20 w-auto object-contain rounded" />
            ) : (
              <div className="h-20 w-20 bg-gray-200 flex items-center justify-center rounded text-gray-400">Logo</div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{condo?.name || 'Nombre del condominio'}</h2>
            <div className="text-gray-700 text-sm">{condo?.address}</div>
            <div className="text-gray-500 text-xs">{condo?.description}</div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">Fecha de emisión: {new Date().toLocaleString('es-MX')}</span>
          <span className="text-xs text-gray-500">Año: {year}</span>
        </div>
        <h1 className="text-xl font-bold text-center text-blue-900 mb-2 mt-2">
          Estado de cuenta de mantenimiento<br />
          <span className="text-base font-normal text-gray-800">{resident?.name} (Unidad {resident?.unit_number})</span>
        </h1>
        {/* Tablas de adeudos y pagos */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Adeudos</h3>
          <p className="text-sm text-gray-600 mb-4">Estimado condómino, nos dirigimos a usted con la intención de informarle que debe cumplir con el pago mensual del mantenimiento.</p>
          {/* Tabla de adeudos real */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipo de Cuota</th>
                  {monthsToCheck.map(month => (
                    <th key={month} className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{month}</th>
                  ))}
                  <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Meses</th>
                  <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Monto Adeudado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detalle.map(({ tipo, adeudosMes, totalMeses, monto }) => (
                  <tr key={tipo.id}>
                    <td className="px-1 py-1 whitespace-nowrap text-gray-900">{tipo.name}</td>
                    {adeudosMes.map((adeuda, i) => (
                      <td key={i} className={`px-1 py-1 text-center ${adeuda ? 'bg-red-100 text-red-700 font-bold' : 'bg-green-50 text-green-600'}`}>{adeuda ? '●' : ''}</td>
                    ))}
                    <td className="px-1 py-1 text-center font-bold text-red-700 whitespace-nowrap">{totalMeses}</td>
                    <td className="px-1 py-1 text-center font-bold text-blue-700 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)}</td>
                  </tr>
                ))}
                {/* Fila de totales por mes y general */}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-1 py-1 text-right whitespace-nowrap">Total</td>
                  {monthsToCheck.map((_, i) => (
                    <td key={i} className="px-1 py-1 text-center text-blue-900">{detalle.reduce((sum, d) => sum + (d.adeudosMes[i] ? ((d.tipo as PaymentType).cuota_mensual || 0) : 0), 0) > 0 ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(detalle.reduce((sum, d) => sum + (d.adeudosMes[i] ? ((d.tipo as PaymentType).cuota_mensual || 0) : 0), 0)) : ''}</td>
                  ))}
                  <td className="px-1 py-1 text-center text-blue-900 whitespace-nowrap">{detalle.reduce((a, d) => a + d.totalMeses, 0)}</td>
                  <td className="px-1 py-1 text-center text-blue-900 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalGeneral)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-green-700 mb-2">Pagos realizados</h3>
          <p className="text-sm text-gray-600 mb-4">El pago de una cuota de forma puntual es una responsabilidad necesaria para la funcionalidad adecuada de un condominio.</p>
          {/* Tabla de pagos real */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1 py-1 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipo de Cuota</th>
                  {monthsToCheck.map(month => (
                    <th key={month} className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{month}</th>
                  ))}
                  <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Meses</th>
                  <th className="px-1 py-1 text-center font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Monto Pagado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentTypesAplicables.map((pt) => {
                  const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                  const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                  const pagosMes = monthsToCheck.map(month => paidMonths.includes(month));
                  const totalMesesPagados = pagosMes.filter(Boolean).length;
                  const montoPagado = totalMesesPagados * cuotaMensual;
                  return (
                    <tr key={pt.id}>
                      <td className="px-1 py-1 whitespace-nowrap text-gray-900">{pt.name}</td>
                      {pagosMes.map((pagado, i) => (
                        <td key={i} className={`px-1 py-1 text-center ${pagado ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50 text-gray-400'}`}>{pagado ? '✔' : ''}</td>
                      ))}
                      <td className="px-1 py-1 text-center font-bold text-green-700 whitespace-nowrap">{totalMesesPagados}</td>
                      <td className="px-1 py-1 text-center font-bold text-blue-700 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(montoPagado)}</td>
                    </tr>
                  );
                })}
                {/* Fila de totales por mes y general */}
                <tr className="bg-green-50 font-bold">
                  <td className="px-1 py-1 text-right whitespace-nowrap">Total</td>
                  {monthsToCheck.map((month, i) => (
                    <td key={i} className="px-1 py-1 text-center text-green-900">{
                      paymentTypesAplicables.reduce((sum, pt) => {
                        const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                        const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                        return sum + (paidMonths.includes(month) ? cuotaMensual : 0);
                      }, 0) > 0
                        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
                            paymentTypesAplicables.reduce((sum, pt) => {
                              const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                              const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                              return sum + (paidMonths.includes(month) ? cuotaMensual : 0);
                            }, 0)
                          )
                        : ''
                    }</td>
                  ))}
                  <td className="px-1 py-1 text-center text-green-900 whitespace-nowrap">{paymentTypesAplicables.reduce((a, pt) => {
                    const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                    return a + monthsToCheck.filter(month => paidMonths.includes(month)).length;
                  }, 0)}</td>
                  <td className="px-1 py-1 text-center text-green-900 whitespace-nowrap">{
                    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(
                      paymentTypesAplicables.reduce((sum, pt) => {
                        const cuotaMensual = (pt as PaymentType).cuota_mensual || 0;
                        const paidMonths = payments.filter(p => p.payment_type_id === pt.id).map(p => p.month);
                        return sum + monthsToCheck.filter(month => paidMonths.includes(month)).length * cuotaMensual;
                      }, 0)
                    )
                  }</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Espacio extra antes de las firmas */}
        <div style={{ height: 40 }}></div>
        <div className="flex justify-between mt-10 mb-4">
          <div className="flex flex-col items-center w-1/3">
            <div className="border-t border-gray-400 w-32 mb-1"></div>
            <span className="text-xs text-gray-600">Presidente</span>
            {condo?.presidente && <span className="text-xs text-gray-800 font-semibold mt-1">{condo.presidente}</span>}
          </div>
          <div className="flex flex-col items-center w-1/3">
            <div className="border-t border-gray-400 w-32 mb-1"></div>
            <span className="text-xs text-gray-600">Tesorero</span>
            {condo?.tesorero && <span className="text-xs text-gray-800 font-semibold mt-1">{condo.tesorero}</span>}
          </div>
          <div className="flex flex-col items-center w-1/3">
            <div className="border-t border-gray-400 w-32 mb-1"></div>
            <span className="text-xs text-gray-600">Vocal</span>
            {condo?.vocal && <span className="text-xs text-gray-800 font-semibold mt-1">{condo.vocal}</span>}
          </div>
        </div>
        
      </div>
      <div className="flex justify-center mt-8">
        <button
          onClick={handleDownloadPDF}
          className="px-6 py-3 bg-blue-700 text-white rounded-lg shadow hover:bg-blue-900 font-semibold text-lg"
        >
          Descargar PDF
        </button>
      </div>
      <div className="flex justify-center mt-4">
        <button
          onClick={handleSendEmailMailto}
          className="px-6 py-3 bg-blue-700 text-white rounded-lg shadow hover:bg-blue-900 font-semibold text-lg"
        >
          Enviar por email
        </button>
      </div>
    </div>
  );
};

export default AdeudosDetalleResidente; 