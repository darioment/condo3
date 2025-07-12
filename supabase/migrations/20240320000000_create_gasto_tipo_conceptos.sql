-- Create table for gasto_tipo_conceptos
CREATE TABLE IF NOT EXISTS public.gasto_tipo_conceptos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gasto_tipo_id UUID NOT NULL REFERENCES public.gasto_tipos(id) ON DELETE CASCADE,
    concepto_id UUID NOT NULL REFERENCES public.conceptos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(gasto_tipo_id, concepto_id)
);

-- Add RLS policies
ALTER TABLE public.gasto_tipo_conceptos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.gasto_tipo_conceptos
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.gasto_tipo_conceptos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.gasto_tipo_conceptos
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.gasto_tipo_conceptos
    FOR DELETE USING (auth.role() = 'authenticated'); 