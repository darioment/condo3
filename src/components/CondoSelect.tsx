import React from 'react';
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
  return (
    <select
      value={selectedCondominium?.id || ''}
      onChange={(e) => {
        const selected = condominiums.find(c => c.id === e.target.value);
        if (selected) {
          onSelect(selected);
        }
      }}
      className="border border-gray-300 rounded-md py-2 px-4 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">Seleccionar condominio</option>
      {condominiums.map(condo => (
        <option key={condo.id} value={condo.id}>
          {condo.name}
        </option>
      ))}
    </select>
  );
};

export default CondoSelect;