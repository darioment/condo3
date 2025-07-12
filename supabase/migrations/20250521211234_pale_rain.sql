/*
  # Initial Schema Setup for Condominium Management System

  1. New Tables
    - `condominiums`: Stores condominium information
      - `id` (uuid, primary key)
      - `name` (text)
      - `address` (text)
      - `monthly_fee` (numeric)
      - `units` (integer)
      - `created_at` (timestamp)

    - `residents`: Stores resident information
      - `id` (uuid, primary key)
      - `condominium_id` (uuid, foreign key)
      - `name` (text)
      - `unit_number` (text)
      - `bank_info` (text)
      - `account_number` (text)
      - `contact_info` (text)
      - `created_at` (timestamp)

    - `payments`: Stores payment records
      - `id` (uuid, primary key)
      - `resident_id` (uuid, foreign key)
      - `amount` (numeric)
      - `payment_date` (date)
      - `month` (text)
      - `year` (integer)
      - `status` (text)
      - `created_at` (timestamp)

    - `expense_categories`: Represents main categories of expenses
      - `id` (UUID, primary key)
      - `condominium_id` (UUID, foreign key)
      - `name` (TEXT)
      - `order` (INTEGER)
      - `created_at` (TIMESTAMP WITH TIME ZONE)
      - `updated_at` (TIMESTAMP WITH TIME ZONE)

    - `expense_concepts`: Represents concepts within each category
      - `id` (UUID, primary key)
      - `category_id` (UUID, foreign key)
      - `name` (TEXT)
      - `order` (INTEGER)
      - `created_at` (TIMESTAMP WITH TIME ZONE)
      - `updated_at` (TIMESTAMP WITH TIME ZONE)

    - `expenses`: Represents individual expense records
      - `id` (UUID, primary key)
      - `condominium_id` (UUID, foreign key)
      - `concept_id` (UUID, foreign key)
      - `description` (TEXT)
      - `amount` (NUMERIC)
      - `expense_date` (DATE)
      - `year` (INTEGER)
      - `month` (TEXT)
      - `created_at` (TIMESTAMP WITH TIME ZONE)
      - `updated_at` (TIMESTAMP WITH TIME ZONE)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create condominiums table
CREATE TABLE IF NOT EXISTS condominiums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  monthly_fee numeric NOT NULL DEFAULT 0,
  units integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create residents table
CREATE TABLE IF NOT EXISTS residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id uuid REFERENCES condominiums(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_number text NOT NULL,
  bank_info text,
  account_number text,
  contact_info text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(condominium_id, unit_number)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  month text NOT NULL,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz DEFAULT now()
);

-- Create expense_categories table
CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expense_concepts table (formerly expense_subcategories)
CREATE TABLE expense_concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES expense_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominium_id UUID REFERENCES condominiums(id) ON DELETE CASCADE, -- Keeping for direct queries/RLS
  concept_id UUID REFERENCES expense_concepts(id) ON DELETE CASCADE,
  description TEXT,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL,
  year INTEGER NOT NULL,
  month TEXT NOT NULL, -- Using TEXT for month abbreviation (ENE, FEB, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read condominiums"
  ON condominiums
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read residents"
  ON residents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" ON expense_categories USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON expense_concepts USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON expenses USING (auth.role() = 'authenticated');