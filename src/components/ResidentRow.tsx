import React from 'react';
import { Link } from 'react-router-dom';
import { Resident, Payment, Month, MONTHS } from '../types';
import PaymentStatus from './PaymentStatus';
import { Trash2 } from 'lucide-react';

interface ResidentRowProps {
  resident: Resident;
  payments: Payment[];
  year: number;
  onPaymentClick: (resident: Resident, month: Month, isPaid: boolean) => void;
  totalAmount?: number;
  monthlyTotals?: Record<string, number>;
  onDeleteResidentPayments: (residentId: string, residentName: string) => void;
  isViewer?: boolean;
}

const ResidentRow: React.FC<ResidentRowProps> = ({
  resident,
  payments,
  year,
  onPaymentClick,
  totalAmount = 0,
  monthlyTotals = {},
  onDeleteResidentPayments,
  isViewer
}) => {
  // Create a map of payments by month for quick lookup
  const paymentsByMonth = payments.reduce((acc, payment) => {
    if (payment.year === year) {
      acc[payment.month] = payment;
    }
    return acc;
  }, {} as Record<string, Payment>);

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {resident.unit_number}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center justify-between">
        <Link 
          to={`/residents/editar/${resident.id}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {resident.name}
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteResidentPayments(resident.id, resident.name);
          }}
          className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
          title={`Eliminar todos los pagos de ${resident.name} para este año`}
          disabled={isViewer}
        >
          <Trash2 size={18} />
        </button>
      </td>
      
      {/* Payment cells for each month */}
      {MONTHS.map((month) => {
        const payment = paymentsByMonth[month];
        const isPaid = !!payment;
        const monthTotal = monthlyTotals[month] || 0;
        
        return (
          <td 
            key={month} 
            onClick={() => !isViewer && onPaymentClick(resident, month, isPaid)}
            className={`px-3 py-4 whitespace-nowrap text-sm text-center border-l border-gray-100 ${!isViewer ? 'cursor-pointer' : ''}`}
          >
            <PaymentStatus isPaid={isPaid} amount={payment?.amount} />
            {monthTotal > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {monthTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </div>
            )}
          </td>
        );
      })}
      <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900 bg-gray-50 border-l border-gray-200">
        {totalAmount > 0 ? totalAmount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '-'}
      </td>
    </tr>
  );
};

export default ResidentRow;