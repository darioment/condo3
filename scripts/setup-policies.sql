-- Primero, eliminar las políticas existentes si las hay
drop policy if exists "Enable read access for all users" on condominiums;
drop policy if exists "Enable insert for authenticated users only" on condominiums;
drop policy if exists "Enable read access for all users" on residents;
drop policy if exists "Enable insert for authenticated users only" on residents;
drop policy if exists "Enable read access for all users" on payments;
drop policy if exists "Enable insert/delete for authenticated users only" on payments;
drop policy if exists "payments_select_policy" on payments;
drop policy if exists "payments_insert_policy" on payments;
drop policy if exists "payments_update_policy" on payments;
drop policy if exists "payments_delete_policy" on payments;
drop policy if exists "residents_select_policy" on residents;
drop policy if exists "residents_insert_policy" on residents;
drop policy if exists "residents_update_policy" on residents;
drop policy if exists "residents_delete_policy" on residents;

-- Enable RLS
alter table condominiums enable row level security;
alter table residents enable row level security;
alter table payments enable row level security;

-- Condominiums policies
create policy "condominiums_select_policy"
on condominiums for select
to anon
using (true);

create policy "condominiums_insert_policy"
on condominiums for insert
to anon
with check (true);

create policy "condominiums_update_policy"
on condominiums for update
to anon
using (true)
with check (true);

create policy "condominiums_delete_policy"
on condominiums for delete
to anon
using (true);

-- Residents policies
create policy "residents_select_policy"
on residents for select
to anon
using (true);

create policy "residents_insert_policy"
on residents for insert
to anon
with check (true);

create policy "residents_update_policy"
on residents for update
to anon
using (true)
with check (true);

create policy "residents_delete_policy"
on residents for delete
to anon
using (true);

-- Payments policies
create policy "payments_select_policy"
on payments for select
to anon
using (true);

create policy "payments_insert_policy"
on payments for insert
to anon
with check (true);

create policy "payments_update_policy"
on payments for update
to anon
using (true)
with check (true);

create policy "payments_delete_policy"
on payments for delete
to anon
using (true);
