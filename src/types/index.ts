export interface Resident {
  id: string;
  condominium_id: string | null;
  name: string;
  unit_number: string;
  contact_info: string | null;
  bank_info: string | null;
  account_number: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at?: string | null;
}

export interface PaymentType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
  is_general: boolean;
  cuota_mensual: number | null;
}

export interface Payment {
  id: string;
  resident_id: string | null;
  payment_type_id: string;
  condominium_id: string;
  amount: number;
  payment_date: string;
  month: string;
  year: number;
  status: string;
  created_at: string | null;
  updated_at?: string;
  concepto: string | null;
}

export interface Condominium {
  id: string;
  name: string;
  address: string;
  monthly_fee: number;
  units: number;
  created_at?: string;
}

export interface BalanceRecord {
  resident_id: string;
  balance: number;
  last_payment_date?: Date;
}

export interface MonthlyRecord {
  month: string;
  year: number;
  payments_received: number;
  payments_pending: number;
  total_collected: number;
}

export interface Concepto {
  id: string;
  condominium_id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
  is_active: boolean;
  updated_at: string;
}

export interface Gasto {
  id: string;
  concepto_id: string;
  condominium_id: string;
  year: number;
  month: string;
  amount: number;
  gasto_tipo: string;
  notes?: string;
  is_paid: boolean;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export type Month = 
  'ENE' | 'FEB' | 'MAR' | 'ABR' | 'MAY' | 'JUN' | 
  'JUL' | 'AGO' | 'SEP' | 'OCT' | 'NOV' | 'DIC';

export const MONTHS: Month[] = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];