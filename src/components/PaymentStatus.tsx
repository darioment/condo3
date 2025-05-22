import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PaymentStatusProps {
  isPaid: boolean;
  amount?: number;
}

const PaymentStatus: React.FC<PaymentStatusProps> = ({ isPaid, amount }) => {
  if (isPaid && amount !== undefined) {
    return (
      <div className="flex items-center justify-center space-x-2">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <span className="text-green-700 font-medium">
          ${amount.toFixed(2)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <XCircle className="w-5 h-5 text-gray-300" />
    </div>
  );
};

export default PaymentStatus;