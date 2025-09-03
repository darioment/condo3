import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Loader2, Download, Upload } from 'lucide-react';
import { Concepto, Condominium } from '../types/index';
import CondoSelect from '../components/CondoSelect';
import ConfirmDialog from '../components/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import ConceptoForm from '../components/ConceptoForm';

import { useAuth } from '../contexts/AuthContext';

const ConceptosPage: React.FC = () => {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';

  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [loading, setLoading] = useState(true);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: 'nombre' | 'descripcion';
    direction: 'asc' | 'desc';
  }>({ key: 'nombre', direction: 'asc' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para gestionar formularios y diálogos
  const [showForm, setShowForm] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState<Concepto | undefined>(undefined);
  const { id: conceptoId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conceptoToDelete, setConceptoToDelete] = useState<Concepto | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
          if (data.length > 0 && !selectedCondo) {
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
  }, []);

  // Fetch conceptos when selected condo changes
  useEffect(() => {
    if (selectedCondo) {
      fetchConceptos();
    }
  }, [selectedCondo]);

  // Handle edit mode when accessed via URL
  useEffect(() => {
    const loadConceptoForEdit = async () => {
      if (conceptoId) {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from('conceptos')
            .select('*')
            .eq('id', conceptoId)
            .single();

          if (error) throw error;
          if (data) {
            setEditingConcepto(data);
            setShowForm(true);
          }
        } catch (error) {
          console.error('Error loading concepto:', error);
          toast.error('No se pudo cargar la información del concepto');
        } finally {
          setLoading(false);
        }
      }
    };

    loadConceptoForEdit();
  }, [conceptoId]);

  // Reset form when closing
  const handleFormClose = () => {
    setShowForm(false);
    setEditingConcepto(undefined);
    navigate('/conceptos');
  };
  
  // Función para obtener conceptos
  const fetchConceptos = async () => {
    if (!selectedCondo) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('conceptos')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .order('nombre');

      if (error) throw error;

      if (data) {
        setConceptos(data);
      }
    } catch (error: any) {
      console.error('Error fetching conceptos:', error);
      toast.error(`Error al cargar los conceptos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para crear o actualizar un concepto
  const saveConcepto = async (conceptoData: Partial<Concepto>) => {
    if (!selectedCondo) {
      toast.error('No hay un condominio seleccionado');
      return;
    }

    try {
      setLoading(true);
      console.log('Guardando concepto con datos:', conceptoData);
      console.log('Condominio seleccionado:', selectedCondo);

      if (editingConcepto) {
        // Actualizar concepto existente
        const { data, error } = await supabase
          .from('conceptos')
          .update({
            ...conceptoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingConcepto.id)
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setConceptos(prev => prev.map(c => c.id === data[0].id ? data[0] : c));
          toast.success('Concepto actualizado correctamente');
        }
      } else {
        // Crear nuevo concepto
        const newConceptoData = {
          ...conceptoData,
          condominium_id: selectedCondo?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Datos a insertar:', newConceptoData);
        
        const { data, error } = await supabase
          .from('conceptos')
          .insert([newConceptoData])
          .select();
          
        if (error) {
          console.error('Error al insertar concepto:', error);
          throw error;
        }
        
        if (data && data[0]) {
          console.log('Concepto creado exitosamente:', data[0]);
          setConceptos(prev => [...prev, data[0]]);
          toast.success('Concepto creado correctamente');
        } else {
          throw new Error('No se pudo crear el concepto');
        }
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingConcepto(undefined);
      setShowForm(false);
    } catch (error: any) {
      console.error('Error guardando concepto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar un concepto
  const deleteConcepto = async () => {
    if (!conceptoToDelete) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('conceptos')
        .delete()
        .eq('id', conceptoToDelete.id);
        
      if (error) throw error;
      
      setConceptos(prev => prev.filter(c => c.id !== conceptoToDelete.id));
      toast.success('Concepto eliminado correctamente');
      
      // Limpiar el estado y cerrar el diálogo
      setConceptoToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error eliminando concepto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Abrir formulario para editar
  const handleEdit = (concepto: Concepto) => {
    if (isViewer) return;
    setEditingConcepto(concepto);
    setShowForm(true);
  };
  
  // Abrir diálogo de confirmación para eliminar
  const handleDelete = (concepto: Concepto) => {
    if (isViewer) return;
    setConceptoToDelete(concepto);
    setShowDeleteConfirm(true);
  };

  // Handle sorting when clicking on column headers
  const requestSort = (key: 'nombre' | 'descripcion') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort indicator for column headers
  const getSortIndicator = (key: 'nombre' | 'descripcion') => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Sort and filter conceptos
  const sortedAndFilteredConceptos = useMemo(() => {
    // Filter first
    const filtered = conceptos.filter(concepto => 
      concepto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      concepto.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Then sort
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
      const bValue = b[sortConfig.key]?.toString().toLowerCase() || '';

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [conceptos, searchTerm, sortConfig]);

  // Exportar a Excel
  const exportToExcel = () => {
    if (!conceptos.length) {
      toast.warning('No hay datos para exportar');
      return;
    }

    try {
      // Preparar datos para exportar
      const dataToExport = conceptos.map(concepto => ({
        'Nombre': concepto.nombre,
        'Descripción': concepto.descripcion,
        'Activo': concepto.is_active ? 'Sí' : 'No'
      }));

      // Crear libro de trabajo y hoja de cálculo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Ajustar el ancho de las columnas
      const wscols = [
        { wch: 30 }, // Nombre
        { wch: 50 }, // Descripción
        { wch: 10 }  // Activo
      ];
      ws['!cols'] = wscols;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Conceptos');
      
      // Generar archivo y descargar
      const fileName = `conceptos_${selectedCondo?.name || 'condominio'}_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      
      // Mapear datos importados al formato de concepto
      const conceptosToImport = jsonData.map((item: any) => {
        const concepto: Partial<Concepto> = {
          condominium_id: selectedCondo.id,
          nombre: item['Nombre']?.toString() || 'SIN NOMBRE',
          descripcion: item['Descripción']?.toString() || '',
          is_active: item['Activo']?.toString().toLowerCase() === 'sí' || 
                    item['Activo']?.toString().toLowerCase() === 'si' ||
                    item['Activo'] === true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        return concepto;
      });
      
      // Confirmar antes de importar
      const confirmImport = window.confirm(
        `¿Desea importar ${conceptosToImport.length} conceptos al condominio ${selectedCondo.name}?`
      );
      
      if (!confirmImport) {
        return;
      }
      
      // Insertar conceptos en lotes para evitar problemas de tamaño
      const BATCH_SIZE = 10;
      let successfulImports = 0;
      
      for (let i = 0; i < conceptosToImport.length; i += BATCH_SIZE) {
        const batch = conceptosToImport.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('conceptos')
          .upsert(batch, { onConflict: 'condominium_id,descripcion' })
          .select();
          
        if (error) throw error;
        successfulImports += data?.length || 0;
      }
      
      // Actualizar la lista de conceptos
      await fetchConceptos();
      
      toast.success(`Se importaron ${successfulImports} conceptos exitosamente`);
      
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

  if (!condominiums || condominiums.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600">No hay condominios disponibles</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {showForm ? (
        <ConceptoForm
          concepto={editingConcepto}
          onSave={saveConcepto}
          onCancel={() => {
            setShowForm(false);
            setEditingConcepto(undefined);
          }}
        />
      ) : (
        <div>
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
              Conceptos
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingConcepto(undefined);
                    setShowForm(true);
                  }}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center ${isViewer ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isViewer}
                >
                  <Plus size={16} className="mr-2" />
                  Nuevo Concepto
                </button>
              </div>
              <CondoSelect
                condominiums={condominiums}
                selectedCondominium={selectedCondo}
                onSelect={setSelectedCondo}
              />
            </div>
          </div>
          
          {!selectedCondo ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-600">Seleccione un condominio</h2>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-blue-900 mb-4 sm:mb-0">
                  {selectedCondo.name} - Conceptos
                </h2>
                
                <div className="flex space-x-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar concepto..."
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
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('nombre')}
                      >
                        <div className="flex items-center">
                          Nombre
                          <span className="ml-1">{getSortIndicator('nombre')}</span>
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => requestSort('descripcion')}
                      >
                        <div className="flex items-center">
                          Descripción
                          <span className="ml-1">{getSortIndicator('descripcion')}</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedAndFilteredConceptos.length > 0 ? (
                      sortedAndFilteredConceptos.map((concepto) => (
                        <tr key={concepto.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {concepto.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {concepto.descripcion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              concepto.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {concepto.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              className="text-blue-600 hover:text-blue-900 mr-3 focus:outline-none"
                              onClick={() => handleEdit(concepto)}
                              disabled={isViewer}
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              className="text-red-600 hover:text-red-900 focus:outline-none"
                              onClick={() => handleDelete(concepto)}
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
                          {conceptos.length === 0 ? 'No hay conceptos registrados' : 'No se encontraron coincidencias'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  Mostrando {sortedAndFilteredConceptos.length} de {conceptos.length} conceptos
                  {searchTerm && ` (filtrados de ${conceptos.length} totales)`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && conceptoToDelete && (
        <ConfirmDialog
          title="Eliminar Concepto"
          message={`¿Está seguro que desea eliminar el concepto "${conceptoToDelete.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={deleteConcepto}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setConceptoToDelete(null);
          }}
          confirmText="Eliminar"
        />
      )}
    </div>
  );
};

export default ConceptosPage; 