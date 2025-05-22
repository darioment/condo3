export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      condominiums: {
        Row: {
          id: string
          name: string
          address: string
          monthly_fee: number
          units: number
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          address: string
          monthly_fee: number
          units: number
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          monthly_fee?: number
          units?: number
          created_at?: string | null
        }
      }
      residents: {
        Row: {
          id: string
          condominium_id: string | null
          name: string
          unit_number: string
          bank_info: string | null
          account_number: string | null
          contact_info: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          condominium_id?: string | null
          name: string
          unit_number: string
          bank_info?: string | null
          account_number?: string | null
          contact_info?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          condominium_id?: string | null
          name?: string
          unit_number?: string
          bank_info?: string | null
          account_number?: string | null
          contact_info?: string | null
          created_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          resident_id: string | null
          amount: number
          payment_date: string
          month: string
          year: number
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          resident_id?: string | null
          amount: number
          payment_date: string
          month: string
          year: number
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          resident_id?: string | null
          amount?: number
          payment_date?: string
          month?: string
          year?: number
          status?: string
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}