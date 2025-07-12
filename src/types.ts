export interface Concepto {
  id: string;
  condominium_id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
  is_active: boolean;
  updated_at: string;
}

export interface GastoTipo {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
  is_general: boolean;
}

export interface Gasto {
  id: string;
  concepto_id: string;
  condominium_id: string;
  year: number;
  month: string;
  amount: number;
  gasto_tipo: string;
  notes: string | null;
  is_paid: boolean;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface Condominium {
  id: string;
  name: string;
  address: string;
  description?: string;
  monthly_fee: number;
  units: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  logo?: string | null;
  presidente?: string | null;
  tesorero?: string | null;
  vocal?: string | null;
  residents?: { count: number };
}

export const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;
export type Month = typeof MONTHS[number];

export interface GastoData {
  Concepto: string;
  Monto: number;
  Fecha: string;
  Notas?: string;
  [key: string]: any;
}

export interface PaymentType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_general: boolean;
  condominium_id: string;
  created_at?: string;
  updated_at?: string;
  cuota_mensual: number | null;
}

export interface Resident {
  id: string;
  condominium_id: string;
  unit_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_info: string | null;
  bank_info: string | null;
  account_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  resident_id: string;
  payment_type_id: string;
  condominium_id: string;
  amount: number;
  payment_date: string;
  month: Month;
  year: number;
  status: string;
  created_at: string;
  updated_at?: string;
} 