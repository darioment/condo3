import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkrmeleuwmfxziylbyud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrcm1lbGV1d21meHppeWxieXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NjExOTQsImV4cCI6MjA2MzQzNzE5NH0.jzpCl2IoM-39EqLMJ98wh4x9tzuTKQjLhih6XHFbx4A'
);

// Agregar un condominio de prueba
const testCondo = {
  name: 'Condominio de Prueba',
  address: 'Calle Principal #123',
  monthly_fee: 100,
  units: 10
};

const addTestData = async () => {
  try {
    // Agregar condominio
    const { data: condo, error: condoError } = await supabase
      .from('condominiums')
      .insert([testCondo])
      .select()
      .single();

    if (condoError) {
      console.error('Error adding condominium:', condoError);
      return;
    }

    console.log('Condominium added:', condo);

    // Agregar residentes
    const residents = [
      {
        name: 'Juan Pérez',
        unit_number: '101',
        condominium_id: condo.id
      },
      {
        name: 'María García',
        unit_number: '102',
        condominium_id: condo.id
      }
    ];

    const { data: residentsData, error: residentsError } = await supabase
      .from('residents')
      .insert(residents)
      .select();

    if (residentsError) {
      console.error('Error adding residents:', residentsError);
      return;
    }

    console.log('Residents added:', residentsData);
  } catch (error) {
    console.error('Error in script:', error);
  }
};

addTestData();
