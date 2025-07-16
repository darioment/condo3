import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Resident, Payment, PaymentType, Month, Condominium } from '../types';
import { MONTHS } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-hot-toast';

const EstadoCuentaPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const year = Number(searchParams.get('year')) || new Date().getFullYear();
  const month = searchParams.get('month') as Month | undefined;
  const [resident, setResident] = useState<Resident | null>(null);
  const [condo, setCondo] = useState<Condominium | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [residentPaymentTypes, setResidentPaymentTypes] = useState<{ payment_type_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesesConPagos, setMesesConPagos] = useState<string[]>([...MONTHS]);
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getFullYear() === year ? new Date().getMonth() : 11;
  const startMonthIndex = month ? MONTHS.indexOf(month) : 0;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: residentData } = await supabase
          .from('residents')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        setResident(residentData);
        if (residentData?.condominium_id) {
          const { data: condoData } = await supabase
            .from('condominiums')
            .select('*')
            .eq('id', residentData.condominium_id)
            .maybeSingle();
          setCondo(condoData);
        }
        const { data: ptData } = await supabase
          .from('payment_types')
          .select('*')
          .eq('is_active', true)
          .eq('condominium_id', residentData.condominium_id);
        setPaymentTypes(ptData || []);
        const { data: rptData } = await supabase
          .from('resident_payment_types')
          .select('payment_type_id')
          .eq('resident_id', id);
        setResidentPaymentTypes(rptData || []);
        // Obtener pagos del año y filtrar después
        console.log('EstadoCuentaPreview - Fetching payments for:', { residentId: id, year, month });
        
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
          console.log('EstadoCuentaPreview - Month filtering:', { month, startMonthIndex });
          filteredPayments = (payData || []).filter(payment => {
            const paymentMonthIndex = MONTHS.indexOf(payment.month);
            return paymentMonthIndex >= startMonthIndex;
          });
        }
        
        console.log('EstadoCuentaPreview - Payments found:', { total: payData?.length, filtered: filteredPayments.length });
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

  // Lógica de generación de PDF
  const handleDownloadPDF = async () => {
    const pdfElement = document.getElementById('pdf-preview');
    if (!pdfElement) return;
    const canvas = await html2canvas(pdfElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pdfWidth = pageWidth - 40;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 20, 20, pdfWidth, pdfHeight);
    pdf.save(`estado_cuenta_${resident?.name || 'residente'}.pdf`);
  };

  if (loading || !resident || !condo) {
    return <div style={{textAlign:'center',marginTop:40}}>Cargando...</div>;
  }

  // Lógica de cálculo igual que en la página de detalle
  const monthsToCheck = MONTHS.filter((m, idx) => idx >= startMonthIndex && (year !== currentYear || idx <= currentMonthIndex));
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
  const totalesPorMes = monthsToCheck.map((month, i) =>
    detalle.reduce((sum, d) => sum + (d.adeudosMes[i] ? ((d.tipo as PaymentType).cuota_mensual || 0) : 0), 0)
  );
  const totalGeneral = detalle.reduce((sum, d) => sum + d.monto, 0);

  // Renderiza solo el bloque HTML del estado de cuenta, sin header ni navbar
  return (
    <div style={{background:'#fff',padding:0,minHeight:'100vh'}}>
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
                      {monthsToCheck.map((month, i) => (
                        <td key={i} className={`px-1 py-1 text-center ${pagosMes[i] ? 'bg-green-100 text-green-700 font-bold' : 'bg-gray-50 text-gray-400'}`}>{pagosMes[i] ? '✔' : ''}</td>
                      ))}
                      <td className="px-1 py-1 text-center font-bold text-green-700 whitespace-nowrap">{totalMesesPagados}</td>
                      <td className="px-1 py-1 text-center font-bold text-blue-700 whitespace-nowrap">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(montoPagado)}</td>
                    </tr>
                  );
                })}
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
    </div>
  );
};

export default EstadoCuentaPreview; 