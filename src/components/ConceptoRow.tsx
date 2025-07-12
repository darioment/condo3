import React from 'react';
import { Link } from 'react-router-dom';
import { Concepto, Gasto, MONTHS } from '../types';
import { Trash2, Edit } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface ConceptoRowProps {
  concepto: Concepto;
  gastos: Gasto[];
  year: number;
  onGastoClick: (concepto: Concepto, month: string, isPaid: boolean) => void;
  totalAmount?: number;
  monthlyTotals?: Record<string, number>;
  onDeleteConceptoGastos: (conceptoId: string, conceptoNombre: string) => void;
  onEditConcepto: (concepto: Concepto) => void;
}

const ConceptoRow: React.FC<ConceptoRowProps> = ({
  concepto,
  gastos,
  year,
  onGastoClick,
  totalAmount = 0,
  monthlyTotals = {},
  onDeleteConceptoGastos,
  onEditConcepto
}) => {
  // Create a map of gastos by month for quick lookup
  const gastosByMonth = gastos.reduce((acc, gasto) => {
    if (gasto.year === year) {
      acc[gasto.month] = gasto;
    }
    return acc;
  }, {} as Record<string, Gasto>);

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {concepto.nombre}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span>{concepto.descripcion}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditConcepto(concepto);
            }}
            className="text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Editar concepto ${concepto.nombre}`}
          >
            <Edit size={18} />
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteConceptoGastos(concepto.id, concepto.nombre);
          }}
          className="text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
          title={`Eliminar todos los gastos de ${concepto.nombre} para este año`}
        >
          <Trash2 size={18} />
        </button>
      </td>
      
      {/* Gasto cells for each month */}
      {MONTHS.map((month) => {
        const gasto = gastosByMonth[month];
        const isPaid = !!gasto;
        const monthTotal = monthlyTotals[month] || 0;
        
        return (
          <td 
            key={month} 
            onClick={() => onGastoClick(concepto, month, isPaid)}
            className="px-3 py-4 whitespace-nowrap text-sm text-center cursor-pointer border-l border-gray-100"
          >
            {isPaid ? (
              <div className="text-green-600 font-medium">
                {formatCurrency(gasto.amount)}
              </div>
            ) : (
              <div className="text-gray-400">-</div>
            )}
            {monthTotal > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(monthTotal)}
              </div>
            )}
          </td>
        );
      })}
      <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900 bg-gray-50 border-l border-gray-200">
        {totalAmount > 0 ? formatCurrency(totalAmount) : '-'}
      </td>
    </tr>
  );
};

export default ConceptoRow; 