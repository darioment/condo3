import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  percentChange?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  percentChange
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 transition-transform hover:scale-[1.02]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-md ${color}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        {percentChange !== undefined && (
          <div className="flex items-center mt-2">
            <span className={`text-xs font-medium ${
              percentChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {percentChange >= 0 ? '+' : ''}{percentChange}%
            </span>
            <span className="text-xs text-gray-500 ml-1">vs mes anterior</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;