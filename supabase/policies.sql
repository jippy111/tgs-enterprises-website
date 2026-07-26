-- MVP policies for password-only admin mode.
-- Public visitors can browse products/gallery and submit orders.
-- The browser admin dashboard can manage records after the private staff password unlocks the UI.
-- Upgrade later to Supabase Auth role-based policies before heavy public launch.

alter table tgs_products enable row level security;
alter table tgs_orders enable row level security;
alter table little_jessie_products enable row level security;
alter table little_jessie_inquiries enable row level security;
alter table little_jessie_rentals enable row level security;
alter table little_jessie_schedule enable row level security;
alter table little_jessie_gallery enable row level security;

drop policy if exists "Public read TGS products" on tgs_products;
drop policy if exists "Public manage TGS products for MVP admin" on tgs_products;
create policy "Public read TGS products"
on tgs_products for select
to anon
using (true);
create policy "Public manage TGS products for MVP admin"
on tgs_products for all
to anon
using (true)
with check (true);

drop policy if exists "Public manage TGS orders for MVP checkout" on tgs_orders;
create policy "Public manage TGS orders for MVP checkout"
on tgs_orders for all
to anon
using (true)
with check (true);

drop policy if exists "Public read Little Jessie products" on little_jessie_products;
drop policy if exists "Public manage Little Jessie products for MVP admin" on little_jessie_products;
create policy "Public read Little Jessie products"
on little_jessie_products for select
to anon
using (true);
create policy "Public manage Little Jessie products for MVP admin"
on little_jessie_products for all
to anon
using (true)
with check (true);

drop policy if exists "Public manage Little Jessie inquiries for MVP" on little_jessie_inquiries;
create policy "Public manage Little Jessie inquiries for MVP"
on little_jessie_inquiries for all
to anon
using (true)
with check (true);

drop policy if exists "Public manage Little Jessie rentals for MVP" on little_jessie_rentals;
create policy "Public manage Little Jessie rentals for MVP"
on little_jessie_rentals for all
to anon
using (true)
with check (true);

drop policy if exists "Public manage Little Jessie schedule for MVP" on little_jessie_schedule;
create policy "Public manage Little Jessie schedule for MVP"
on little_jessie_schedule for all
to anon
using (true)
with check (true);

drop policy if exists "Public read Little Jessie gallery" on little_jessie_gallery;
drop policy if exists "Public manage Little Jessie gallery for MVP admin" on little_jessie_gallery;
create policy "Public read Little Jessie gallery"
on little_jessie_gallery for select
to anon
using (true);
create policy "Public manage Little Jessie gallery for MVP admin"
on little_jessie_gallery for all
to anon
using (true)
with check (true);
