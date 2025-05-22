import React from 'react';
import { Payment, MonthlyRecord, MONTHS } from '../../types';

interface PaymentSummaryProps {
  payments: Payment[];
  year: number;
  monthlyFee: number;
  units: number;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  payments,
  year,
  monthlyFee,
  units
}) => {
  // Group payments by month
  const paymentsByMonth = MONTHS.map(month => {
    const monthPayments = payments.filter(p => p.month === month && p.year === year);
    return {
      month,
      year,
      paymentsReceived: monthPayments.length,
      paymentsPending: units - monthPayments.length,
      totalCollected: monthPayments.reduce((sum, p) => sum + p.amount, 0)
    };
  });

  const totalReceived = paymentsByMonth.reduce((sum, m) => sum + m.totalCollected, 0);
  const totalPossible = units * monthlyFee * MONTHS.length;
  const collectionRate = totalPossible > 0 ? (totalReceived / totalPossible) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">Resumen de Pagos {year}</h3>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between mb-4">
          <div>
            <span className="block text-sm text-gray-600">Total Recaudado</span>
            <span className="text-xl font-bold text-gray-900">${totalReceived.toFixed(2)}</span>
          </div>
          <div>
            <span className="block text-sm text-gray-600">Tasa de Recaudación</span>
            <span className="text-xl font-bold text-gray-900">{collectionRate.toFixed(1)}%</span>
          </div>
        </div>
        
        <div className="relative pt-1">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${collectionRate}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
            ></div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Pagos por Mes</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mes
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagos
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pendientes
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentsByMonth.map((record) => (
                  <tr key={record.month} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{record.month}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{record.paymentsReceived}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{record.paymentsPending}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      ${record.totalCollected.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummary;