import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MONTHS } from '../../types';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface PaymentSummaryProps {
  condominiumId: string;
  year: number;
  residentCount: number;
}

interface MonthlyPayment {
  month: string;
  total: number;
  expected: number;
  percentage: number;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({ condominiumId, year, residentCount }) => {
  const [loading, setLoading] = useState(true);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalExpected, setTotalExpected] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);

        // Obtener la cuota mensual del condominio
        const { data: condoData, error: condoError } = await supabase
          .from('condominiums')
          .select('monthly_fee')
          .eq('id', condominiumId)
          .single();

        if (condoError) throw condoError;

        const monthlyFee = condoData.monthly_fee;
        const expectedMonthly = monthlyFee * residentCount;

        // Obtener los pagos del año
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, month')
          .eq('condominium_id', condominiumId)
          .eq('year', year)
          .eq('status', 'paid');

        if (paymentsError) throw paymentsError;

        // Calcular totales por mes
        const monthlyData = MONTHS.map(month => {
          const monthPayments = paymentsData?.filter(p => p.month === month) || [];
          const total = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const percentage = (total / expectedMonthly) * 100;

          return {
            month,
            total,
            expected: expectedMonthly,
            percentage
          };
        });

        setMonthlyPayments(monthlyData);
        setTotalCollected(monthlyData.reduce((sum, m) => sum + m.total, 0));
        setTotalExpected(expectedMonthly * 12);

      } catch (error: any) {
        console.error('Error fetching payments:', error);
        toast.error(`Error al cargar los pagos: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [condominiumId, year, residentCount]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">Resumen de Pagos {year}</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-800">Total Recaudado</p>
            <p className="text-2xl font-bold text-green-900">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(totalCollected)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Total Esperado</p>
            <p className="text-2xl font-bold text-blue-900">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN'
              }).format(totalExpected)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recaudado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Esperado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Porcentaje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyPayments.map((payment) => (
                <tr key={payment.month}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN'
                    }).format(payment.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN'
                    }).format(payment.expected)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={`font-medium ${payment.percentage >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {payment.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummary;