import { Condominium, Payment, Resident, BalanceRecord, MONTHS } from '../types';

// Helper to generate payments based on a pattern
const generatePayments = (
  residentId: string,
  monthlyFee: number,
  pattern: number[]
): Payment[] => {
  const year = new Date().getFullYear();
  return MONTHS.map((month, index) => {
    if (index >= pattern.length) return null;
    if (pattern[index] === 0) return null;
    
    return {
      id: `payment-${residentId}-${month}-${year}`,
      residentId,
      amount: monthlyFee,
      date: new Date(year, index, 15),
      month,
      year,
      status: 'paid'
    };
  }).filter(payment => payment !== null) as Payment[];
};

// Mock residents data based on the image
export const residents: Resident[] = [
  {
    id: '1',
    name: 'Luis Miguel Salinas Urbina',
    unitNumber: '1',
    bankInfo: 'BANCOPEL',
    accountNumber: '***342',
    contactInfo: '835545'
  },
  {
    id: '2',
    name: 'Tania Casas Ochoa',
    unitNumber: '2',
    bankInfo: 'BANCO AZTECA',
    accountNumber: '***1102',
    contactInfo: '596372'
  },
  {
    id: '3',
    name: 'Jaimin Jafet Guerrero Vallejo',
    unitNumber: '3',
    bankInfo: 'BBVAMEXICO',
    accountNumber: '***2588',
    contactInfo: '632686'
  },
  {
    id: '4',
    name: 'AMANDA GASCON MUÑOZ',
    unitNumber: '4',
    bankInfo: 'BBVAMEXICO',
    accountNumber: '***0882 / ***3223',
    contactInfo: '664754'
  },
  {
    id: '5',
    name: 'Graciela Oseca Alcantara',
    unitNumber: '5',
    bankInfo: 'Bwa',
    accountNumber: '***4999',
    contactInfo: '958988'
  },
  {
    id: '7',
    name: 'Felipe Pérez Arzate',
    unitNumber: '7',
    bankInfo: '',
    accountNumber: '',
    contactInfo: '286664'
  },
  {
    id: '9',
    name: 'Roberto Hernandez Garcia',
    unitNumber: '9',
    bankInfo: 'SANTANDER',
    accountNumber: '***5175',
    contactInfo: '269328'
  }
];

// Mock condominiums data
export const condominiums: Condominium[] = [
  {
    id: '1',
    name: 'Fuente Azul',
    address: 'Calle Principal 123',
    monthlyFee: 100,
    units: 24,
    residents: residents
  },
  {
    id: '2',
    name: 'Residencial Las Palmas',
    address: 'Av. Las Palmas 456',
    monthlyFee: 150,
    units: 18,
    residents: []
  },
  {
    id: '3',
    name: 'Torres del Valle',
    address: 'Boulevard Central 789',
    monthlyFee: 200,
    units: 32,
    residents: []
  }
];

// Mock payments data
export const payments: Payment[] = [
  ...generatePayments('1', 100, [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]),
  ...generatePayments('2', 100, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  ...generatePayments('3', 100, [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]),
  ...generatePayments('4', 100, [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]),
  ...generatePayments('5', 100, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  ...generatePayments('7', 100, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
  ...generatePayments('9', 100, [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0])
];

// Mock balances data
export const balances: BalanceRecord[] = [
  { residentId: '1', balance: 0 },
  { residentId: '2', balance: -600 },
  { residentId: '3', balance: -100 },
  { residentId: '4', balance: 0 },
  { residentId: '5', balance: -600 },
  { residentId: '7', balance: 700 },
  { residentId: '9', balance: 0 }
];