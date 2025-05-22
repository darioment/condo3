import React from 'react';
import { Resident, Payment, Month, MONTHS } from '../types';
import PaymentStatus from './PaymentStatus';

interface ResidentRowProps {
  resident: Resident;
  payments: Payment[];
  year: number;
  onPaymentClick: (resident: Resident, month: Month, isPaid: boolean) => void;
}

const ResidentRow: React.FC<ResidentRowProps> = ({
  resident,
  payments,
  year,
  onPaymentClick,
}) => {
  // Create a map of payments by month for quick lookup
  const paymentsByMonth = payments.reduce((acc, payment) => {
    if (payment.year === year) {
      acc[payment.month] = payment;
    }
    return acc;
  }, {} as Record<string, Payment>);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {resident.unit_number}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {resident.name}
      </td>
      
      {/* Payment cells for each month */}
      {MONTHS.map((month) => {
        const payment = paymentsByMonth[month];
        const isPaid = !!payment;
        
        return (
          <td 
            key={month} 
            onClick={() => onPaymentClick(resident, month, isPaid)}
            className="px-3 py-4 whitespace-nowrap text-sm text-center cursor-pointer"
          >
            <PaymentStatus isPaid={isPaid} amount={payment?.amount} />
          </td>
        );
      })}
    </tr>
  );
};

export default ResidentRow;