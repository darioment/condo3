import React from 'react';
import { MonthlyFinancialSummary, YearlyFinancialSummary } from '../../services/financialReportService';
import { MONTHS } from '../../types';
import { ArrowUp, ArrowDown, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialSummaryProps {
  data: YearlyFinancialSummary;
  selectedMonth: Month;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ data, selectedMonth }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const startMonthIndex = MONTHS.indexOf(selectedMonth);
  const filteredMonthlySummaries = data.monthlySummaries.filter((_, idx) => idx >= startMonthIndex);

  // Calcular los valores por concepto
  const ingresos = filteredMonthlySummaries.map(m => m.ingresos || 0);
  const egresos = filteredMonthlySummaries.map(m => m.egresos || 0);
  const ahorroNeto = filteredMonthlySummaries.map((m) => m.ingresos - m.egresos);
  // Saldo final acumulado por mes
  let saldoAcumulado = data.saldoInicial;
  const saldosFinales = ahorroNeto.map((ahorro) => {
    saldoAcumulado += ahorro;
    return saldoAcumulado;
  });

  // Totales y promedios
  const totalIngresos = ingresos.reduce((a, b) => a + b, 0);
  const totalEgresos = egresos.reduce((a, b) => a + b, 0);
  const totalAhorro = ahorroNeto.reduce((a, b) => a + b, 0);
  const totalSaldoFinal = saldosFinales[saldosFinales.length - 1];

  const promedioIngresos = totalIngresos / filteredMonthlySummaries.length;
  const promedioEgresos = totalEgresos / filteredMonthlySummaries.length;
  const promedioAhorro = totalAhorro / filteredMonthlySummaries.length;
  const promedioSaldoFinal = saldosFinales.reduce((a, b) => a + b, 0) / filteredMonthlySummaries.length;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">Resumen Financiero {data.year}</h3>
      </div>
      <div className="p-6 overflow-x-auto">
        {/* Gráfica de barras */}
        <div className="w-full h-72 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredMonthlySummaries.map((s) => ({
              mes: s.month,
              Ingresos: s.ingresos,
              Egresos: s.egresos,
              "Ahorro neto": s.ingresos - s.egresos,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="Ingresos" fill="#22c55e" />
              <Bar dataKey="Egresos" fill="#ef4444" />
              <Bar dataKey="Ahorro neto" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-green-700">
            <tr>
              <th className="px-4 py-2 text-left text-white font-bold">Concepto</th>
              {filteredMonthlySummaries.map((s) => (
                <th key={s.month} className="px-4 py-2 text-center text-white font-bold">{s.month.toLowerCase()}</th>
              ))}
              <th className="px-4 py-2 text-center text-white font-bold">Total</th>
              <th className="px-4 py-2 text-center text-white font-bold">Promedio</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr>
              <td className="px-4 py-2 font-medium">Ingresos</td>
              {ingresos.map((val, i) => (
                <td key={i} className="px-4 py-2 text-green-700 text-right">{formatCurrency(val)}</td>
              ))}
              <td className="px-4 py-2 text-green-900 text-right font-bold">{formatCurrency(totalIngresos)}</td>
              <td className="px-4 py-2 text-green-900 text-right">{formatCurrency(promedioIngresos)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium">Gastos</td>
              {egresos.map((val, i) => (
                <td key={i} className="px-4 py-2 text-red-700 text-right">{formatCurrency(val)}</td>
              ))}
              <td className="px-4 py-2 text-red-900 text-right font-bold">{formatCurrency(totalEgresos)}</td>
              <td className="px-4 py-2 text-red-900 text-right">{formatCurrency(promedioEgresos)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium">Ahorro neto</td>
              {ahorroNeto.map((val, i) => (
                <td key={i} className={`px-4 py-2 text-right ${val < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(val)}</td>
              ))}
              <td className={`px-4 py-2 text-right font-bold ${totalAhorro < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(totalAhorro)}</td>
              <td className={`px-4 py-2 text-right ${promedioAhorro < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(promedioAhorro)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-medium">Saldo final</td>
              {saldosFinales.map((val, i) => (
                <td key={i} className="px-4 py-2 text-blue-900 text-right">{formatCurrency(val)}</td>
              ))}
              <td className="px-4 py-2 text-blue-900 text-right font-bold">{formatCurrency(totalSaldoFinal)}</td>
              <td className="px-4 py-2 text-blue-900 text-right">{formatCurrency(promedioSaldoFinal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialSummary;
