import React, { useState } from 'react';
import { Download, FileText, BarChart2, DollarSign } from 'lucide-react';
import { condominiums, payments, balances } from '../data/mockData';
import { Condominium, MONTHS } from '../types';
import CondoSelect from '../components/CondoSelect';

const ReportCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onDownload: () => void;
}> = ({ title, description, icon, onDownload }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
          {icon}
        </div>
        <button 
          onClick={onDownload}
          className="text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Download size={20} />
        </button>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
};

const ReportsPage: React.FC = () => {
  const [selectedCondo, setSelectedCondo] = useState<Condominium>(condominiums[0]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<string>(new Date().toLocaleString('es-ES', { month: 'short' }).toUpperCase());
  
  // Get available years from payments
  const availableYears = Array.from(
    new Set(payments.map(p => p.year))
  ).sort((a, b) => b - a);
  
  if (availableYears.length === 0) availableYears.push(year);
  
  const handleDownloadReport = (reportType: string) => {
    console.log(`Downloading ${reportType} report for ${selectedCondo.name}, ${month} ${year}`);
    // In a real application, this would generate and download the report
    alert(`Generando reporte: ${reportType}`);
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Reportes
        </h1>
        <div className="flex space-x-4">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-md py-2 px-4 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md py-2 px-4 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <CondoSelect
            condominiums={condominiums}
            selectedCondominium={selectedCondo}
            onSelect={setSelectedCondo}
          />
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Reportes Disponibles</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportCard
            title="Estado de Cuenta"
            description="Genera un reporte detallado de pagos y saldos de cada residente"
            icon={<FileText size={24} />}
            onDownload={() => handleDownloadReport('Estado de Cuenta')}
          />
          
          <ReportCard
            title="Resumen de Pagos"
            description="Muestra un resumen de los pagos recibidos en el periodo seleccionado"
            icon={<DollarSign size={24} />}
            onDownload={() => handleDownloadReport('Resumen de Pagos')}
          />
          
          <ReportCard
            title="Estadísticas Anuales"
            description="Presenta estadísticas y gráficos de pagos y morosidad por año"
            icon={<BarChart2 size={24} />}
            onDownload={() => handleDownloadReport('Estadísticas Anuales')}
          />
          
          <ReportCard
            title="Deudores"
            description="Lista de residentes con pagos pendientes y montos adeudados"
            icon={<FileText size={24} />}
            onDownload={() => handleDownloadReport('Deudores')}
          />
          
          <ReportCard
            title="Reporte Financiero"
            description="Balance general de ingresos y egresos del condominio"
            icon={<DollarSign size={24} />}
            onDownload={() => handleDownloadReport('Reporte Financiero')}
          />
          
          <ReportCard
            title="Comparativa Mensual"
            description="Comparación de pagos y morosidad entre diferentes meses"
            icon={<BarChart2 size={24} />}
            onDownload={() => handleDownloadReport('Comparativa Mensual')}
          />
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <h2 className="text-lg font-semibold text-blue-900">
            Vista Previa: Estado de Cuenta {month} {year}
          </h2>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{selectedCondo.name}</h3>
              <p className="text-gray-600">{selectedCondo.address}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Periodo:</p>
              <p className="font-semibold">{month} {year}</p>
            </div>
          </div>
          
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pagado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saldo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedCondo.residents.map((resident) => {
                  const hasPaid = payments.some(
                    p => p.residentId === resident.id && p.month === month && p.year === year
                  );
                  
                  const balance = balances.find(b => b.residentId === resident.id)?.balance || 0;
                  
                  return (
                    <tr key={resident.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {resident.unitNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {resident.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {hasPaid ? `$${selectedCondo.monthlyFee.toFixed(2)}` : '$0.00'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                        balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        ${Math.abs(balance).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          balance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {balance >= 0 ? 'Al corriente' : 'Con adeudo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => handleDownloadReport('Estado de Cuenta')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <Download size={18} className="mr-2" />
              Descargar Reporte Completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;