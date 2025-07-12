import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GastoTipo, Concepto } from '../types';

interface GastoTipoFormProps {
  gastoTipo?: GastoTipo;
  onSave: (gastoTipo: Partial<GastoTipo>, assignedConceptoIds?: string[]) => void;
  onCancel: () => void;
  allConceptos: Concepto[];
  assignedConceptoIds: string[];
}

const GastoTipoForm: React.FC<GastoTipoFormProps> = ({ 
  gastoTipo, 
  onSave, 
  onCancel, 
  allConceptos,
  assignedConceptoIds
}) => {
  const [formData, setFormData] = useState<Partial<GastoTipo>>({
    name: '',
    description: '',
    is_active: true,
    is_general: true,
    ...gastoTipo
  });

  const [selectedConceptos, setSelectedConceptos] = useState<string[]>(assignedConceptoIds);

  useEffect(() => {
    setSelectedConceptos(assignedConceptoIds);
  }, [assignedConceptoIds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleConceptoSelect = (conceptoId: string) => {
    setSelectedConceptos(prevSelected => 
      prevSelected.includes(conceptoId)
        ? prevSelected.filter(id => id !== conceptoId)
        : [...prevSelected, conceptoId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.is_general) {
      onSave(formData, selectedConceptos);
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {gastoTipo ? 'Editar Tipo de Gasto' : 'Nuevo Tipo de Gasto'}
          </h2>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Mantenimiento, Servicios, etc."
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descripción breve del tipo de gasto"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_general"
                checked={formData.is_general ?? true}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Aplica a todos los conceptos</span>
            </label>
          </div>
          
          {formData.is_general === false && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-md font-semibold text-gray-700 mb-3">Conceptos Aplicables</h3>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {allConceptos.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center">No hay conceptos disponibles en este condominio.</p>
                ) : (
                  allConceptos.map(concepto => (
                    <div key={concepto.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`concepto-${concepto.id}`}
                        checked={selectedConceptos.includes(concepto.id)}
                        onChange={() => handleConceptoSelect(concepto.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`concepto-${concepto.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                        {concepto.nombre}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {allConceptos.length > 0 && selectedConceptos.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">Selecciona al menos un concepto para este tipo de gasto.</p>
              )}
            </div>
          )}
          
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Activo</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {gastoTipo ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GastoTipoForm; 