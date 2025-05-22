import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Condominium } from '../types';

interface CondoSelectProps {
  condominiums: Condominium[];
  selectedCondominium: Condominium | null;
  onSelect: (condominium: Condominium) => void;
}

const CondoSelect: React.FC<CondoSelectProps> = ({
  condominiums,
  selectedCondominium,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span>{selectedCondominium ? selectedCondominium.name : 'Seleccionar Condominio'}</span>
        <ChevronDown size={16} className="ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg">
          <ul className="py-1 max-h-60 overflow-auto">
            {condominiums.map((condo) => (
              <li
                key={condo.id}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 cursor-pointer"
                onClick={() => {
                  onSelect(condo);
                  setIsOpen(false);
                }}
              >
                {condo.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CondoSelect;