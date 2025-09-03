import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Loader2, Download, Upload } from 'lucide-react';
import { Condominium, Resident } from '../types';
import CondoSelect from '../components/CondoSelect';
import ResidentForm from '../components/ResidentForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

import { useAuth } from '../contexts/AuthContext';

const ResidentsPage: React.FC = () => {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';

  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: 'unit_number' | 'name';
    direction: 'asc' | 'desc';
  }>({ key: 'unit_number', direction: 'asc' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para gestionar formularios y diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const { id: residentId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Obtener el parámetro condo de la URL
  const searchParams = new URLSearchParams(window.location.search);
  const condoId = searchParams.get('condo');

  // Fetch condominiums
  useEffect(() => {
    const fetchCondominiums = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('condominiums')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data) {
          setCondominiums(data);
          // Si hay un condoId en la URL, seleccionar ese condominio
          if (condoId) {
            const condo = data.find(c => c.id === condoId);
            if (condo) {
              setSelectedCondo(condo);
            }
          } else if (data.length > 0 && !selectedCondo) {
            setSelectedCondo(data[0]);
          }
        }
      } catch (error: any) {
        console.error('Error fetching condominiums:', error);
        toast.error(`Error al cargar los condominios: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCondominiums();
  }, [condoId]);

  // Fetch residents when selected condo changes
  useEffect(() => {
    if (selectedCondo) {
      fetchResidents();
    }
  }, [selectedCondo]);

  // Handle edit mode when accessed via URL
  useEffect(() => {
    const loadResidentForEdit = async () => {
      if (residentId) {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from('residents')
            .select('*')
            .eq('id', residentId)
            .single();

          if (error) throw error;
          if (data) {
            setEditingResident(data);
            setShowForm(true);
          }
        } catch (error) {
          console.error('Error loading resident:', error);
          toast.error('No se pudo cargar la información del residente');
        } finally {
          setLoading(false);
        }
      }
    };

    loadResidentForEdit();
  }, [residentId]);

  // Reset form when closing
  const handleFormClose = () => {
    setShowForm(false);
    setEditingResident(null);
    navigate('/residents');
  };
  
  // Función para obtener residentes
  const fetchResidents = async () => {
    if (!selectedCondo) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .order('unit_number');

      if (error) throw error;

      if (data) {
        setResidents(data);
      }
    } catch (error: any) {
      console.error('Error fetching residents:', error);
      toast.error(`Error al cargar los residentes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para crear o actualizar un residente
  const saveResident = async (residentData: Partial<Resident>) => {
    if (!selectedCondo) {
      toast.error('No hay un condominio seleccionado');
      return;
    }

    try {
      setLoading(true);
      
      // Si estamos editando, actualizamos el residente existente
      if (editingResident) {
        console.log('Actualizando residente:', editingResident.id, residentData);
        
        const { data, error } = await supabase
          .from('residents')
          .update({
            name: residentData.name,
            unit_number: residentData.unit_number,
            contact_info: residentData.contact_info,
            bank_info: residentData.bank_info,
            account_number: residentData.account_number,
            email: residentData.email,
            phone: residentData.phone,
            is_active: residentData.is_active,
            updated_at: new Date().toISOString(),
            condominium_id: selectedCondo.id // Asegurarnos de que el condominium_id está actualizado
          })
          .eq('id', editingResident.id)
          .select('*');
          
        if (error) {
          console.error('Error en la actualización:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('No se pudo actualizar el residente');
        }
        
        // Actualizar el estado local con los datos actualizados
          setResidents(prev => prev.map(r => r.id === data[0].id ? data[0] : r));
          toast.success('Residente actualizado correctamente');
        
        // Recargar la lista de residentes para asegurar que tenemos los datos más recientes
        await fetchResidents();
      } 
      // Si es un nuevo residente
      else {
        // Asegurarnos de que el condominium_id está incluido
        const newResidentData = {
          ...residentData,
          condominium_id: selectedCondo?.id
        };
        
        const { data, error } = await supabase
          .from('residents')
          .insert([newResidentData])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          setResidents(prev => [...prev, data[0]]);
          toast.success('Residente creado correctamente');
        }
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingResident(null);
      setShowForm(false);
    } catch (error: any) {
      console.error('Error guardando residente:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar un residente
  const deleteResident = async () => {
    if (!residentToDelete) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('residents')
        .delete()
        .eq('id', residentToDelete.id);
        
      if (error) throw error;
      
      setResidents(prev => prev.filter(r => r.id !== residentToDelete.id));
      toast.success('Residente eliminado correctamente');
      
      // Limpiar el estado y cerrar el diálogo
      setResidentToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error eliminando residente:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir formulario para editar
  const handleEdit = (resident: Resident) => {
    if (isViewer) return;
    setEditingResident(resident);
    setShowForm(true);
  };
  
  // Abrir diálogo de confirmación para eliminar
  const handleDelete = (resident: Resident) => {
    if (isViewer) return;
    setResidentToDelete(resident);
    setShowDeleteConfirm(true);
  };

  // Handle sorting when clicking on column headers
  const requestSort = (key: 'unit_number' | 'name') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort indicator for column headers
  const getSortIndicator = (key: 'unit_number' | 'name') => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Sort and filter residents
  const sortedAndFilteredResidents = useMemo(() => {
    // Filter first
    const filtered = residents.filter(resident => 
      resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (resident.unit_number && resident.unit_number.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Then sort
    return [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'unit_number') {
        // For unit numbers, convert to numbers for proper numeric sorting
        aValue = a.unit_number ? parseInt(a.unit_number.toString(), 10) : 0;
        bValue = b.unit_number ? parseInt(b.unit_number.toString(), 10) : 0;
      } else {
        // For names, use string comparison
        aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
        bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [residents, searchTerm, sortConfig]);

  if (!condominiums || condominiums.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600">No hay condominios disponibles</h2>
        </div>
      </div>
    );
  }

  // Exportar a Excel
  const exportToExcel = () => {
    if (!residents.length) {
      toast.warning('No hay datos para exportar');
      return;
    }

    try {
      // Preparar datos para exportar
      const dataToExport = residents.map(resident => ({
        'Unidad': resident.unit_number,
        'Nombre': resident.name,
        'Correo Electrónico': resident.email || '',
        'Teléfono': resident.phone || '',
        'Información de Contacto': resident.contact_info || '',
        'Banco': resident.bank_info || '',
        'Número de Cuenta': resident.account_number || '',
        'Activo': resident.is_active ? 'Sí' : 'No'
      }));

      // Crear libro de trabajo y hoja de cálculo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Ajustar el ancho de las columnas
      const wscols = [
        { wch: 10 }, // Unidad
        { wch: 30 }, // Nombre
        { wch: 30 }, // Correo
        { wch: 15 }, // Teléfono
        { wch: 30 }, // Contacto
        { wch: 20 }, // Banco
        { wch: 20 }, // Cuenta
        { wch: 10 }  // Activo
      ];
      ws['!cols'] = wscols;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Residentes');
      
      // Generar archivo y descargar
      const fileName = `residentes_${selectedCondo?.name || 'condominio'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('Datos exportados exitosamente');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      toast.error('Error al exportar los datos');
    }
  };

  // Importar desde Excel
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      
      // Leer el archivo
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (!jsonData.length) {
        toast.warning('El archivo está vacío');
        return;
      }
      
      // Validar que se haya seleccionado un condominio
      if (!selectedCondo) {
        toast.error('Por favor, seleccione un condominio primero');
        return;
      }
      
      // Mapear datos importados al formato de residente
      const residentsToImport = jsonData.map((item: any) => {
        const resident: Partial<Resident> = {
          condominium_id: selectedCondo.id,
          unit_number: item['Unidad']?.toString() || '',
          name: item['Nombre']?.toString() || 'SIN NOMBRE',
          email: item['Correo Electrónico']?.toString() || '',
          phone: item['Teléfono']?.toString() || '',
          contact_info: item['Información de Contacto']?.toString() || '',
          bank_info: item['Banco']?.toString() || '',
          account_number: item['Número de Cuenta']?.toString() || '',
          is_active: item['Activo']?.toString().toLowerCase() === 'sí' || 
                    item['Activo']?.toString().toLowerCase() === 'si' ||
                    item['Activo'] === true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        return resident;
      });
      
      // Confirmar antes de importar
      const confirmImport = window.confirm(
        `¿Desea importar ${residentsToImport.length} residentes al condominio ${selectedCondo.name}?`
      );
      
      if (!confirmImport) {
        return;
      }
      
      // Insertar residentes en lotes para evitar problemas de tamaño
      const BATCH_SIZE = 10;
      let successfulImports = 0;
      
      for (let i = 0; i < residentsToImport.length; i += BATCH_SIZE) {
        const batch = residentsToImport.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('residents')
          .upsert(batch, { onConflict: 'unit_number,condominium_id' })
          .select();
          
        if (error) throw error;
        successfulImports += data?.length || 0;
      }
      
      // Actualizar la lista de residentes
      await fetchResidents();
      
      toast.success(`Se importaron ${successfulImports} residentes exitosamente`);
      
    } catch (error: any) {
      console.error('Error al importar desde Excel:', error);
      toast.error(`Error al importar: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsImporting(false);
      // Limpiar el input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Residentes
        </h1>
        <CondoSelect
          condominiums={condominiums}
          selectedCondominium={selectedCondo}
          onSelect={setSelectedCondo}
        />
      </div>
      
      {!selectedCondo ? (
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-600">Seleccione un condominio</h2>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-blue-900 mb-4 sm:mb-0">
              {selectedCondo.name} - Directorio de Residentes
            </h2>
            
            <div className="flex space-x-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar residente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <Search size={18} />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center text-sm"
                  onClick={exportToExcel}
                  title="Exportar a Excel"
                >
                  <Download size={16} className="mr-1" />
                  <span>Exportar</span>
                </button>
                <label 
                  className={`px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center text-sm cursor-pointer ${isViewer ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Importar desde Excel"
                >
                  <Upload size={16} className="mr-1" />
                  <span>Importar</span>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileImport}
                    className="hidden"
                    ref={fileInputRef}
                    disabled={isViewer}
                  />
                </label>
                <button 
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center text-sm"
                  onClick={() => setShowForm(true)}
                  disabled={isViewer}
                >
                  <Plus size={16} className="mr-1" />
                  <span>Nuevo</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('unit_number')}
                  >
                    <div className="flex items-center">
                      Unidad
                      <span className="ml-1">{getSortIndicator('unit_number')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('name')}
                  >
                    <div className="flex items-center">
                      Nombre
                      <span className="ml-1">{getSortIndicator('name')}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndFilteredResidents.length > 0 ? (
                  sortedAndFilteredResidents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {resident.unit_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {resident.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {resident.contact_info || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          className="text-blue-600 hover:text-blue-900 mr-3 focus:outline-none"
                          onClick={() => handleEdit(resident)}
                          disabled={isViewer}
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 focus:outline-none"
                          onClick={() => handleDelete(resident)}
                          disabled={isViewer}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      {residents.length === 0 ? 'No hay residentes registrados' : 'No se encontraron coincidencias'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              Mostrando {sortedAndFilteredResidents.length} de {residents.length} residentes
              {searchTerm && ` (filtrados de ${residents.length} totales)`}
            </span>
          </div>
        </div>
      )}

      {/* Formulario para crear/editar residentes */}
      {showForm && (
        <ResidentForm
          resident={editingResident}
          onSave={saveResident}
          onClose={handleFormClose}
          condominiumId={selectedCondo?.id || ''}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && residentToDelete && (
        <ConfirmDialog
          title="Eliminar Residente"
          message={`¿Está seguro que desea eliminar a ${residentToDelete.name}? Esta acción no se puede deshacer.`}
          onConfirm={deleteResident}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setResidentToDelete(null);
          }}
          confirmText="Eliminar"
        />
      )}
    </div>
  );
};

export default ResidentsPage;
