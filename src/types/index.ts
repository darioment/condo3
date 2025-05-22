export interface Resident {
  id: string;
  condominium_id: string | null;
  name: string;
  unit_number: string;
  contact_info: string | null;
  bank_info: string | null;
  account_number: string | null;
  created_at: string | null;
}

export interface PaymentType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface Payment {
  id: string;
  resident_id: string | null;
  payment_type_id: string;
  amount: number;
  payment_date: string;
  month: string;
  year: number;
  status: string;
  created_at: string | null;
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

export type Month = 
  'ENE' | 'FEB' | 'MAR' | 'ABR' | 'MAY' | 'JUN' | 
  'JUL' | 'AGO' | 'SEP' | 'OCT' | 'NOV' | 'DIC';

export const MONTHS: Month[] = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];