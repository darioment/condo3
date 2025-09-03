import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Condominium, Concepto, GastoTipo, Gasto, MONTHS } from '../types';
import CondoSelect from '../components/CondoSelect';
import ConceptoRow from '../components/ConceptoRow';
import GastoModal from '../components/GastoModal';
import GastoTipoForm from '../components/GastoTipoForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from 'react-toastify';
import { Loader2, Filter, Download, Upload, Plus, Edit, Trash2, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import ConceptoForm from '../components/ConceptoForm';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

const GastosPage: React.FC = () => {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';

  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null);
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [gastoModalOpen, setGastoModalOpen] = useState(false);
  const [selectedConcepto, setSelectedConcepto] = useState<Concepto | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para manejar el ordenamiento
  const [sortConfig, setSortConfig] = useState<{
    key: 'nombre' | 'descripcion' | 'amount';
    direction: 'asc' | 'desc';
  }>({ key: 'nombre', direction: 'asc' });
  
  // Estados para manejar tipos de gasto
  const [gastoTipos, setGastoTipos] = useState<GastoTipo[]>([]);
  const [selectedGastoTipoId, setSelectedGastoTipoId] = useState<string>('');

  // Estados para gestionar tipos de gasto
  const [showGastoTipoForm, setShowGastoTipoForm] = useState(false);
  const [editingGastoTipo, setEditingGastoTipo] = useState<GastoTipo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tipoToDelete, setTipoToDelete] = useState<GastoTipo | null>(null);
  const [allConceptos, setAllConceptos] = useState<Concepto[]>([]);
  const [assignedConceptoIds, setAssignedConceptoIds] = useState<string[]>([]);

  // Estados para gestionar conceptos
  const [showConceptoForm, setShowConceptoForm] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState<Concepto | null>(null);

  const navigate = useNavigate();

  // Fetch condominiums and gasto tipos on mount
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

    const fetchGastoTipos = async () => {
      try {
        const { data, error } = await supabase
          .from('gasto_tipos')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          setGastoTipos(data);
          if (!selectedGastoTipoId) {
            setSelectedGastoTipoId(data[0].id);
          }
        }
      } catch (error: any) {
        console.error('Error fetching gasto tipos:', error);
        toast.error(`Error al cargar los tipos de gasto: ${error.message}`);
      }
    };

    fetchCondominiums();
    fetchGastoTipos();
  }, []);

  // Fetch conceptos and gastos when dependencies change
  useEffect(() => {
    if (selectedCondo && selectedGastoTipoId) {
      fetchConceptosAndGastos();
    }
  }, [selectedCondo, year, selectedGastoTipoId]);

  const fetchConceptosAndGastos = async () => {
    if (!selectedCondo) return;

    try {
      setLoading(true);

      // Obtener el tipo de gasto seleccionado
      const selectedGastoTipo = gastoTipos.find(gt => gt.id === selectedGastoTipoId);
      if (!selectedGastoTipo) {
        throw new Error('Tipo de gasto no encontrado');
      }

      // Fetch conceptos
      let conceptosQuery = supabase
        .from('conceptos')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .eq('is_active', true);

      // Si el tipo de gasto no es general, solo obtener los conceptos asignados
      if (!selectedGastoTipo.is_general) {
        const { data: assignedConceptos, error: assignedError } = await supabase
          .from('gasto_tipo_conceptos')
          .select('concepto_id')
          .eq('gasto_tipo_id', selectedGastoTipoId);

        if (assignedError) throw assignedError;

        const assignedConceptoIds = assignedConceptos?.map(ac => ac.concepto_id) || [];
        if (assignedConceptoIds.length > 0) {
          conceptosQuery = conceptosQuery.in('id', assignedConceptoIds);
        } else {
          // Si no hay conceptos asignados, retornar lista vacía
          setConceptos([]);
          setGastos([]);
          return;
        }
      }

      const { data: conceptosData, error: conceptosError } = await conceptosQuery.order('nombre');
      if (conceptosError) throw conceptosError;

      // Fetch gastos
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos')
        .select('*')
        .eq('condominium_id', selectedCondo.id)
        .eq('year', year)
        .eq('gasto_tipo', selectedGastoTipoId)
        .order('payment_date');

      if (gastosError) throw gastosError;

      console.log('Conceptos cargados:', conceptosData);
      console.log('Gastos cargados:', gastosData);

      setConceptos(conceptosData || []);
      setGastos(gastosData || []);

    } catch (error: any) {
      console.error('Error in fetchConceptosAndGastos:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGasto = async (concepto: Concepto, month: string, isPaid: boolean) => {
    const existingGasto = gastos.find(g => 
      g.concepto_id === concepto.id && 
      g.month === month && 
      g.year === year
    );
    
    setSelectedConcepto(concepto);
    setSelectedMonth(month);
    setSelectedGasto(existingGasto || null);
    setIsPaid(isPaid);
    setGastoModalOpen(true);
  };

  const handleSaveGasto = async (amount: number, date: Date, gastoTipoId: string, notes: string) => {
    if (!selectedConcepto || !selectedMonth) return;

    try {
      setLoading(true);
      
      if (isPaid) {
        // Si isPaid es true, significa que estamos desmarcando un gasto existente (eliminándolo)
        const gastoTipoToDelete = selectedGasto?.gasto_tipo || gastoTipoId;
        
        if (!gastoTipoToDelete) {
          throw new Error('No se pudo determinar el tipo de gasto a eliminar');
        }
        
        // Delete gasto
        const { error } = await supabase
          .from('gastos')
          .delete()
          .match({
            concepto_id: selectedConcepto.id,
            month: selectedMonth,
            year: year,
            gasto_tipo: gastoTipoToDelete
          });

        if (error) throw error;
        
        // Update local state by filtering out the deleted gasto
        setGastos(gastos.filter(g => 
          !(g.concepto_id === selectedConcepto.id && 
            g.month === selectedMonth && 
            g.year === year &&
            g.gasto_tipo === gastoTipoToDelete)
        ));

        toast.success('Gasto eliminado exitosamente');
      } else {
        // Si isPaid es false, estamos creando un nuevo gasto
        const newGasto: Omit<Gasto, 'id' | 'created_at' | 'updated_at'> = {
          concepto_id: selectedConcepto.id,
          amount: amount,
          payment_date: date.toISOString(),
          month: selectedMonth,
          year: year,
          status: 'paid',
          gasto_tipo: gastoTipoId,
          condominium_id: selectedCondo?.id || '',
          is_paid: true,
          notes: notes || null,
          created_by: 'system',
          updated_by: 'system'
        };

        const { error } = await supabase
          .from('gastos')
          .insert([newGasto]);

        if (error) throw error;

        // Update local state by adding the new gasto
        const gastoWithTimestamps: Gasto = {
          ...newGasto,
          id: '', // This will be set by the database
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setGastos([...gastos, gastoWithTimestamps]);
        toast.success('Gasto registrado exitosamente');
      }
    } catch (error: any) {
      console.error('Error saving gasto:', error);
      toast.error(`Error al guardar el gasto: ${error.message}`);
    } finally {
      setLoading(false);
      setGastoModalOpen(false);
    }
  };

  // Función para eliminar todos los gastos de un concepto para el año y tipo de gasto seleccionados
  const handleDeleteConceptoGastos = async (conceptoId: string, conceptoNombre: string) => {
    if (!selectedCondo || !selectedGastoTipoId || !year) {
      toast.error('No se pudo determinar el condominio, tipo de gasto o año');
      return;
    }

    if (!window.confirm(`¿Está seguro de eliminar TODOS los gastos de ${conceptoNombre} (${selectedCondo.name}) para el año ${year} y tipo de gasto ${gastoTipos.find(gt => gt.id === selectedGastoTipoId)?.name || 'seleccionado'}?`)) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('concepto_id', conceptoId)
        .eq('year', year)
        .eq('gasto_tipo', selectedGastoTipoId);

      if (error) {
        console.error('Error al eliminar gastos del concepto:', error);
        throw error;
      }

      await fetchConceptosAndGastos();
      toast.success(`Todos los gastos de ${conceptoNombre} para el año ${year} han sido eliminados.`);

    } catch (error: any) {
      console.error('Error al eliminar gastos del concepto:', error);
      toast.error(`Error al eliminar gastos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get available years (from 2021 to current year + 1)
  const currentYear = new Date().getFullYear();
  const startYear = 2021;
  const availableYears = Array.from(
    { length: currentYear - startYear + 2 },
    (_, i) => startYear + i
  ).filter(year => year <= currentYear + 1);

  // Calculate monthly totals
  const monthlyTotals = MONTHS.reduce((acc, month) => {
    acc[month] = gastos
      .filter(g => g.month === month)
      .reduce((sum, g) => sum + (g.amount || 0), 0);
    return acc;
  }, {} as Record<string, number>);

  // Calculate concepto totals and prepare data for sorting
  const conceptosWithTotals = useMemo(() => {
    return conceptos.map(concepto => {
      const total = gastos
        .filter(g => g.concepto_id === concepto.id)
        .reduce((sum, g) => sum + (g.amount || 0), 0);
      
      return {
        ...concepto,
        total
      };
    });
  }, [conceptos, gastos]);

  // Sort conceptos based on sortConfig
  const sortedConceptos = useMemo(() => {
    const sortableConceptos = [...conceptosWithTotals];
    
    return sortableConceptos.sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'amount') {
        aValue = a.total;
        bValue = b.total;
      } else {
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
  }, [conceptosWithTotals, sortConfig]);

  // Handle sorting when clicking on column headers
  const requestSort = (key: 'nombre' | 'descripcion' | 'amount') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Get sort indicator for column headers
  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Calculate concepto totals for display
  const conceptoTotals = conceptosWithTotals.reduce((acc, concepto) => {
    acc[concepto.id] = concepto.total;
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(monthlyTotals).reduce((sum, total) => sum + total, 0);

  // Exportar a Excel
  const exportToExcel = () => {
    if (!conceptos.length || !gastos.length) {
      toast.warning('No hay datos para exportar');
      return;
    }

    try {
      // Preparar datos para exportar
      const dataToExport = conceptos.map(concepto => {
        const conceptoGastos = gastos.filter(g => g.concepto_id === concepto.id);
        const gastoData: Record<string, any> = {
          'Concepto': concepto.nombre,
          'Descripción': concepto.descripcion,
          'Total': conceptoTotals[concepto.id]?.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) || '$0.00'
        };

        // Agregar columnas para cada mes
        MONTHS.forEach(month => {
          const monthGasto = conceptoGastos.find(g => g.month === month);
          gastoData[month] = monthGasto 
            ? monthGasto.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
            : '-';
        });

        return gastoData;
      });

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Ajustar el ancho de las columnas
      const wscols = [
        { wch: 30 }, // Concepto
        { wch: 40 }, // Descripción
        { wch: 15 }, // Total
        ...MONTHS.map(() => ({ wch: 12 })) // Columnas de meses
      ];
      ws['!cols'] = wscols;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
      
      // Guardar archivo
      XLSX.writeFile(wb, `gastos_${selectedCondo?.name}_${year}.xlsx`);
      
      toast.success('Archivo exportado exitosamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar el archivo');
    }
  };

  // Importar desde Excel
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
            Concepto: string;
            Monto: number;
            Fecha: string;
            Notas?: string;
          }>;

          // Eliminar gastos existentes para el año y tipo seleccionados
          const { error: deleteError } = await supabase
            .from('gastos')
            .delete()
            .eq('year', year)
            .eq('gasto_tipo', selectedGastoTipoId)
            .eq('condominium_id', selectedCondo?.id);

          if (deleteError) {
            console.error('Error al eliminar gastos existentes:', deleteError);
            throw new Error('No se pudieron eliminar los gastos existentes');
          }

          // Mapear datos a la estructura de gastos
          const gastosToImport: Omit<Gasto, 'id' | 'created_at' | 'updated_at'>[] = [];
          
          jsonData.forEach((row) => {
            const concepto = conceptos.find(c => c.nombre === row.Concepto);

            if (concepto) {
              MONTHS.forEach(month => {
                if (row[month] && !isNaN(parseFloat(row[month]))) {
                  const amount = parseFloat(row[month]);
                  if (amount > 0) {
                    gastosToImport.push({
                      concepto_id: concepto.id,
                      condominium_id: selectedCondo!.id,
                      year,
                      month,
                      amount,
                      gasto_tipo: selectedGastoTipoId,
                      notes: `Importado el ${new Date().toLocaleDateString()}`,
                      is_paid: true,
                      payment_date: new Date().toISOString(),
                      status: 'paid'
                    });
                  }
                }
              });
            }
          });

          if (gastosToImport.length === 0) {
            toast.warning('No se encontraron gastos válidos para importar');
            return;
          }

          // Insertar gastos en lotes
          const BATCH_SIZE = 50;
          for (let i = 0; i < gastosToImport.length; i += BATCH_SIZE) {
            const batch = gastosToImport.slice(i, i + BATCH_SIZE);
            const { error } = await supabase
              .from('gastos')
              .insert(batch);

            if (error) throw error;
          }

          // Actualizar la lista de gastos
          await fetchConceptosAndGastos();
          toast.success(`${gastosToImport.length} gastos importados exitosamente`);
        } catch (error) {
          console.error('Error al importar gastos:', error);
          toast.error('Error al importar los gastos');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error al leer el archivo:', error);
      toast.error('Error al leer el archivo');
    } finally {
      setLoading(false);
    }
  };

  // Función para guardar un tipo de gasto
  const saveGastoTipo = async (gastoTipoData: Partial<GastoTipo>, assignedConceptoIds?: string[]) => {
    if (!selectedCondo) {
      toast.error('Debe seleccionar un condominio');
      return;
    }

    try {
      setLoading(true);
      let savedGastoTipo: GastoTipo | null = null;
      
      // Agregar el condominium_id al tipo de gasto
      const gastoTipoWithCondo = {
        ...gastoTipoData,
        condominium_id: selectedCondo.id
      };
      
      // Si estamos editando, actualizamos el tipo existente
      if (editingGastoTipo) {
        const { data, error } = await supabase
          .from('gasto_tipos')
          .update({
            name: gastoTipoWithCondo.name,
            description: gastoTipoWithCondo.description,
            is_active: gastoTipoWithCondo.is_active,
            is_general: gastoTipoWithCondo.is_general,
            condominium_id: gastoTipoWithCondo.condominium_id
          })
          .eq('id', editingGastoTipo.id)
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          savedGastoTipo = data[0];
          // Actualizamos el estado local del tipo de gasto
          setGastoTipos(prev => prev.map(gt => gt.id === savedGastoTipo!.id ? savedGastoTipo! : gt));
          toast.success('Tipo de gasto actualizado correctamente');
        } else {
          throw new Error('No se pudo actualizar el tipo de gasto');
        }
      }
      // Si es un nuevo tipo de gasto
      else {
        const { data, error } = await supabase
          .from('gasto_tipos')
          .insert([gastoTipoWithCondo])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          savedGastoTipo = data[0];
          // Agregamos el nuevo tipo al estado local
          setGastoTipos(prev => [...prev, savedGastoTipo!]);
          toast.success('Tipo de gasto creado correctamente');
        } else {
          throw new Error('No se pudo crear el tipo de gasto');
        }
      }

      // Si el tipo de gasto no es general y hay conceptos asignados
      if (!gastoTipoData.is_general && assignedConceptoIds && assignedConceptoIds.length > 0 && savedGastoTipo) {
        // Primero eliminamos todas las asignaciones existentes
        const { error: deleteError } = await supabase
          .from('gasto_tipo_conceptos')
          .delete()
          .eq('gasto_tipo_id', savedGastoTipo.id);

        if (deleteError) throw deleteError;

        // Luego insertamos las nuevas asignaciones
        const asignaciones = assignedConceptoIds.map(conceptoId => ({
          gasto_tipo_id: savedGastoTipo!.id,
          concepto_id: conceptoId
        }));

        const { error: insertError } = await supabase
          .from('gasto_tipo_conceptos')
          .insert(asignaciones);

        if (insertError) throw insertError;
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingGastoTipo(null);
      setShowGastoTipoForm(false);
      setAssignedConceptoIds([]);
      setAllConceptos([]);

    } catch (error: any) {
      console.error('Error guardando tipo de gasto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para eliminar un tipo de gasto
  const deleteGastoTipo = async () => {
    if (!tipoToDelete) return;

    try {
      setLoading(true);

      // Primero eliminamos las asignaciones de conceptos
      const { error: deleteAsignacionesError } = await supabase
        .from('gasto_tipo_conceptos')
        .delete()
        .eq('gasto_tipo_id', tipoToDelete.id);

      if (deleteAsignacionesError) throw deleteAsignacionesError;

      // Luego eliminamos el tipo de gasto
      const { error: deleteError } = await supabase
        .from('gasto_tipos')
        .delete()
        .eq('id', tipoToDelete.id);

      if (deleteError) throw deleteError;

      // Actualizamos el estado local
      setGastoTipos(prev => prev.filter(gt => gt.id !== tipoToDelete.id));
      toast.success('Tipo de gasto eliminado correctamente');

    } catch (error: any) {
      console.error('Error eliminando tipo de gasto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setTipoToDelete(null);
    }
  };

  // Abrir formulario para editar
  const handleEdit = async (gastoTipo: GastoTipo) => {
    try {
      setLoading(true);
      
      // Primero cargamos los conceptos del condominio
      const { data: conceptosData, error: conceptosError } = await supabase
        .from('conceptos')
        .select('*')
        .eq('condominium_id', selectedCondo?.id)
        .eq('is_active', true)
        .order('nombre');

      if (conceptosError) throw conceptosError;

      if (conceptosData) {
        setAllConceptos(conceptosData);
      }

      // Si el tipo de gasto NO es general, cargar las asignaciones existentes
      if (!gastoTipo.is_general) {
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from('gasto_tipo_conceptos')
          .select('concepto_id')
          .eq('gasto_tipo_id', gastoTipo.id);
        
        if (asignacionesError) throw asignacionesError;
        
        if (asignacionesData) {
          setAssignedConceptoIds(asignacionesData.map(item => item.concepto_id));
        }
      } else {
        setAssignedConceptoIds([]);
      }

      // Finalmente, abrimos el formulario con el tipo de gasto
      setEditingGastoTipo(gastoTipo);
      setShowGastoTipoForm(true);

    } catch (error: any) {
      console.error('Error al cargar datos para edición:', error);
      toast.error(`Error: ${error.message}`);
      setAllConceptos([]);
      setAssignedConceptoIds([]);
    } finally {
      setLoading(false);
    }
  };

  // Abrir diálogo de confirmación para eliminar
  const handleDelete = (gastoTipo: GastoTipo) => {
    setTipoToDelete(gastoTipo);
    setShowDeleteConfirm(true);
  };

  // Función para guardar un concepto
  const saveConcepto = async (conceptoData: Partial<Concepto>) => {
    if (!selectedCondo) {
      toast.error('Debe seleccionar un condominio');
      return;
    }

    try {
      setLoading(true);
      
      // Agregar el condominium_id al concepto
      const conceptoWithCondo = {
        ...conceptoData,
        condominium_id: selectedCondo.id
      };
      
      // Si estamos editando, actualizamos el concepto existente
      if (editingConcepto) {
        const { data, error } = await supabase
          .from('conceptos')
          .update({
            nombre: conceptoWithCondo.nombre,
            descripcion: conceptoWithCondo.descripcion,
            is_active: conceptoWithCondo.is_active,
            condominium_id: conceptoWithCondo.condominium_id
          })
          .eq('id', editingConcepto.id)
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          // Actualizamos el estado local del concepto
          setConceptos(prev => prev.map(c => c.id === data[0].id ? data[0] : c));
          toast.success('Concepto actualizado correctamente');
        } else {
          throw new Error('No se pudo actualizar el concepto');
        }
      }
      // Si es un nuevo concepto
      else {
        const { data, error } = await supabase
          .from('conceptos')
          .insert([conceptoWithCondo])
          .select();
          
        if (error) throw error;
        
        if (data && data[0]) {
          // Agregamos el nuevo concepto al estado local
          setConceptos(prev => [...prev, data[0]]);
          toast.success('Concepto creado correctamente');
        } else {
          throw new Error('No se pudo crear el concepto');
        }
      }
      
      // Limpiar el estado y cerrar el formulario
      setEditingConcepto(null);
      setShowConceptoForm(false);

    } catch (error: any) {
      console.error('Error guardando concepto:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulario para editar concepto
  const handleEditConcepto = (concepto: Concepto) => {
    setEditingConcepto(concepto);
    setShowConceptoForm(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">
          Registro de Gastos
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
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
              onClick={() => navigate('/gasto-tipos')}
              className={`px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center text-sm ${isViewer ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Gestionar tipos de gasto"
              disabled={isViewer}
            >
              <Settings size={16} className="mr-1" />
              <span>Tipos de Gasto</span>
            </button>
            <button
              onClick={() => navigate('/conceptos')}
              className={`px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center text-sm ${isViewer ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Gestionar conceptos"
              disabled={isViewer}
            >
              <Plus size={16} className="mr-1" />
              <span>Conceptos</span>
            </button>
          </div>
          <CondoSelect
            condominiums={condominiums}
            selectedCondominium={selectedCondo}
            onSelect={setSelectedCondo}
          />
        </div>
      </div>
      
      {/* Selector de tipos de gasto */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Filter size={18} className="text-gray-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-700">Tipo de Gasto</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {gastoTipos.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedGastoTipoId(type.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${selectedGastoTipoId === type.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {conceptos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => requestSort('nombre')}
                    >
                      <div className="flex items-center">
                        Concepto
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

                    {MONTHS.map(
                      (month) => (
                        <th
                          key={month}
                          className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {month}
                        </th>
                      )
                    )}
                    <th
                      key="total"
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total
                    </th>
                  </tr>
                  <tr className="bg-gray-100">
                    <th colSpan={2} className="px-6 py-2 text-left text-xs font-medium text-gray-700">
                      Total por Mes
                    </th>
                    {MONTHS.map(month => (
                      <td key={`month-total-${month}`} className="px-3 py-2 text-center text-sm font-medium text-gray-900">
                        {monthlyTotals[month] > 0 ? monthlyTotals[month].toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-sm font-medium text-white bg-blue-600">
                      {grandTotal > 0 ? grandTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '-'}
                    </td>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedConceptos.map((concepto) => (
                    <ConceptoRow
                      key={concepto.id}
                      concepto={concepto}
                      gastos={gastos.filter((g) => g.concepto_id === concepto.id)}
                      year={year}
                      onGastoClick={handleGasto}
                      totalAmount={conceptoTotals[concepto.id] || 0}
                      monthlyTotals={gastos
                        .filter(g => g.concepto_id === concepto.id)
                        .reduce((acc, g) => ({
                          ...acc,
                          [g.month]: (acc[g.month] || 0) + (g.amount || 0)
                        }), {} as Record<string, number>)}
                      onDeleteConceptoGastos={handleDeleteConceptoGastos}
                      onEditConcepto={handleEditConcepto}
                      isViewer={isViewer}
                    />
                  ))}
                </tbody>
              </table>
              
              {!loading && selectedCondo && conceptos.length > 0 && gastoTipos.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4 mx-6 mb-6">
                  <h3 className="font-medium text-blue-800">
                    {gastoTipos.find(gt => gt.id === selectedGastoTipoId)?.name || 'Gastos'} - {year}
                  </h3>
                  <p className="text-sm text-blue-600">
                    Haga clic en una celda para registrar o eliminar un gasto
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay conceptos disponibles</p>
            </div>
          )}
        </div>
      )}

      {gastoModalOpen && selectedConcepto && selectedMonth && (
        <GastoModal
          isOpen={gastoModalOpen}
          onClose={() => setGastoModalOpen(false)}
          concepto={selectedConcepto}
          gasto={selectedGasto}
          gastoTipoId={selectedGastoTipoId}
          condominiumId={selectedCondo?.id || ''}
          year={year}
          month={selectedMonth}
          onSave={handleSaveGasto}
        />
      )}

      {/* Formulario para crear/editar tipos de gasto */}
      {showGastoTipoForm && (
        <GastoTipoForm
          gastoTipo={editingGastoTipo || undefined}
          onSave={saveGastoTipo}
          onCancel={() => {
            setShowGastoTipoForm(false);
            setEditingGastoTipo(null);
            setAssignedConceptoIds([]);
            setAllConceptos([]);
          }}
          allConceptos={allConceptos}
          assignedConceptoIds={assignedConceptoIds}
        />
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      {showDeleteConfirm && tipoToDelete && (
        <ConfirmDialog
          title="Eliminar Tipo de Gasto"
          message={`¿Está seguro que desea eliminar el tipo de gasto "${tipoToDelete.name}"? Esta acción no se puede deshacer.`}
          onConfirm={deleteGastoTipo}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setTipoToDelete(null);
          }}
        />
      )}

      {/* Formulario para crear/editar conceptos */}
      {showConceptoForm && (
        <ConceptoForm
          concepto={editingConcepto || undefined}
          onSave={saveConcepto}
          onCancel={() => {
            setShowConceptoForm(false);
            setEditingConcepto(null);
          }}
        />
      )}
    </div>
  );
};

export default GastosPage; 