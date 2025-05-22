import React, { useState } from 'react';
import { DollarSign, Users, Home, TrendingUp } from 'lucide-react';
import { condominiums, payments, balances } from '../data/mockData';
import { Condominium } from '../types';
import CondoSelect from '../components/CondoSelect';
import StatCard from '../components/Dashboard/StatCard';
import PaymentSummary from '../components/Dashboard/PaymentSummary';

const Dashboard: React.FC = () => {
  const [selectedCondo, setSelectedCondo] = useState<Condominium>(condominiums[0]);
  const year = new Date().getFullYear();
  
  // Filter payments for the selected condominium
  const condoPayments = payments.filter(payment => 
    selectedCondo.residents.some(r => r.id === payment.residentId)
  );
  
  // Calculate total collected this month
  const currentMonth = new Date().toLocaleString('es-ES', { month: 'short' }).toUpperCase();
  const monthlyPayments = condoPayments.filter(p => p.month === currentMonth && p.year === year);
  const totalCollected = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Calculate payment rate
  const paymentRate = Math.round((monthlyPayments.length / selectedCondo.residents.length) * 100);
  
  // Calculate debt
  const totalDebt = balances
    .filter(b => selectedCondo.residents.some(r => r.id === b.residentId) && b.balance < 0)
    .reduce((sum, b) => sum + Math.abs(b.balance), 0);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Dashboard
        </h1>
        <CondoSelect
          condominiums={condominiums}
          selectedCondominium={selectedCondo}
          onSelect={setSelectedCondo}
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Recaudado (Mes)"
          value={`$${totalCollected.toFixed(2)}`}
          icon={<DollarSign size={20} className="text-white" />}
          color="bg-green-500"
          percentChange={2.5}
        />
        <StatCard
          title="Tasa de Pagos"
          value={`${paymentRate}%`}
          icon={<TrendingUp size={20} className="text-white" />}
          color="bg-blue-500"
          percentChange={-1.8}
        />
        <StatCard
          title="Residentes"
          value={selectedCondo.residents.length}
          icon={<Users size={20} className="text-white" />}
          color="bg-purple-500"
        />
        <StatCard
          title="Deuda Total"
          value={`$${totalDebt.toFixed(2)}`}
          icon={<DollarSign size={20} className="text-white" />}
          color="bg-red-500"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PaymentSummary
            payments={condoPayments}
            year={year}
            monthlyFee={selectedCondo.monthlyFee}
            units={selectedCondo.units}
          />
        </div>
        <div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-900">Información del Condominio</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Nombre</h4>
                  <p className="mt-1 text-lg font-medium text-gray-900">{selectedCondo.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Dirección</h4>
                  <p className="mt-1 text-lg font-medium text-gray-900">{selectedCondo.address}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Unidades</h4>
                  <p className="mt-1 text-lg font-medium text-gray-900">{selectedCondo.units}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Cuota Mensual</h4>
                  <p className="mt-1 text-lg font-medium text-gray-900">${selectedCondo.monthlyFee.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Total Estimado Mensual</h4>
                  <p className="mt-1 text-lg font-medium text-gray-900">${(selectedCondo.units * selectedCondo.monthlyFee).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-6">
                <button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Administrar Condominio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;