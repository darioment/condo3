import { supabase } from '../lib/supabase';
import { MONTHS } from '../types';

export interface MonthlyFinancialSummary {
  month: string;
  year: number;
  ingresos: number;
  egresos: number;
  saldo: number;
}

export interface YearlyFinancialSummary {
  year: number;
  saldoInicial: number;
  saldoFinal: number;
  monthlySummaries: MonthlyFinancialSummary[];
}

export const getFinancialReport = async (condominiumId: string, year: number): Promise<YearlyFinancialSummary> => {
  try {
    // Obtener el saldo inicial (saldo final del año anterior)
    const { data: previousYearData, error: previousYearError } = await supabase
      .from('financial_summaries')
      .select('saldo_final')
      .eq('condominium_id', condominiumId)
      .eq('year', year - 1)
      .maybeSingle();

    if (previousYearError) {
      console.error('Error fetching previous year data:', previousYearError);
      // Si hay error, asumimos saldo inicial 0
    }

    const saldoInicial = previousYearData?.saldo_final || 0;

    // Obtener todos los ingresos del año
    const { data: ingresosData, error: ingresosError } = await supabase
      .from('payments')
      .select('amount, month, year')
      .eq('condominium_id', condominiumId)
      .eq('year', year)
      .eq('status', 'paid');

    if (ingresosError) {
      console.error('Error fetching payments:', ingresosError);
      throw new Error('Error al obtener los pagos');
    }

    // Obtener todos los gastos del año
    const { data: gastosData, error: gastosError } = await supabase
      .from('gastos')
      .select('amount, month, year')
      .eq('condominium_id', condominiumId)
      .eq('year', year)
      .eq('status', 'paid');

    if (gastosError) {
      console.error('Error fetching expenses:', gastosError);
      throw new Error('Error al obtener los gastos');
    }

    // Calcular resumen mensual
    const monthlySummaries: MonthlyFinancialSummary[] = MONTHS.map(month => {
      const ingresosMes = ingresosData
        ?.filter(i => i.month === month)
        .reduce((sum, i) => sum + (i.amount || 0), 0) || 0;

      const egresosMes = gastosData
        ?.filter(g => g.month === month)
        .reduce((sum, g) => sum + (g.amount || 0), 0) || 0;

      return {
        month,
        year,
        ingresos: ingresosMes,
        egresos: egresosMes,
        saldo: ingresosMes - egresosMes
      };
    });

    // Calcular saldo final
    const saldoFinal = monthlySummaries.reduce((sum, month) => sum + month.saldo, saldoInicial);

    // Guardar el resumen anual en la base de datos
    const { error: upsertError } = await supabase
      .from('financial_summaries')
      .upsert({
        condominium_id: condominiumId,
        year,
        saldo_inicial: saldoInicial,
        saldo_final: saldoFinal,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'condominium_id,year'
      });

    if (upsertError) {
      console.error('Error saving financial summary:', upsertError);
      // No lanzamos error aquí para no interrumpir el flujo
    }

    return {
      year,
      saldoInicial,
      saldoFinal,
      monthlySummaries
    };
  } catch (error: any) {
    console.error('Error getting financial report:', error);
    throw new Error(error.message || 'Error al obtener el reporte financiero');
  }
}; 