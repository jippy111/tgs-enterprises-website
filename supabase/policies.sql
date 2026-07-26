-- Safer launch policies for Supabase Auth admin login.
-- Public visitors can browse published products/gallery and submit customer records.
-- Only authenticated admin users can manage products, orders, payments, schedules, and gallery.

alter table tgs_products enable row level security;
alter table tgs_orders enable row level security;
alter table little_jessie_products enable row level security;
alter table little_jessie_inquiries enable row level security;
alter table little_jessie_rentals enable row level security;
alter table little_jessie_schedule enable row level security;
alter table little_jessie_gallery enable row level security;

drop policy if exists "Public read TGS products" on tgs_products;
drop policy if exists "Admin manage TGS products" on tgs_products;
create policy "Public read TGS products"
on tgs_products for select
to anon, authenticated
using (available = true or auth.role() = 'authenticated');
create policy "Admin manage TGS products"
on tgs_products for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public create TGS orders" on tgs_orders;
drop policy if exists "Admin manage TGS orders" on tgs_orders;
create policy "Public create TGS orders"
on tgs_orders for insert
to anon
with check (true);
create policy "Admin manage TGS orders"
on tgs_orders for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public read Little Jessie products" on little_jessie_products;
drop policy if exists "Admin manage Little Jessie products" on little_jessie_products;
create policy "Public read Little Jessie products"
on little_jessie_products for select
to anon, authenticated
using (available = true or auth.role() = 'authenticated');
create policy "Admin manage Little Jessie products"
on little_jessie_products for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public create Little Jessie inquiries" on little_jessie_inquiries;
drop policy if exists "Admin manage Little Jessie inquiries" on little_jessie_inquiries;
create policy "Public create Little Jessie inquiries"
on little_jessie_inquiries for insert
to anon
with check (true);
create policy "Admin manage Little Jessie inquiries"
on little_jessie_inquiries for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public create Little Jessie rentals" on little_jessie_rentals;
drop policy if exists "Admin manage Little Jessie rentals" on little_jessie_rentals;
create policy "Public create Little Jessie rentals"
on little_jessie_rentals for insert
to anon
with check (true);
create policy "Admin manage Little Jessie rentals"
on little_jessie_rentals for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public read Little Jessie schedule" on little_jessie_schedule;
drop policy if exists "Admin manage Little Jessie schedule" on little_jessie_schedule;
create policy "Public read Little Jessie schedule"
on little_jessie_schedule for select
to anon, authenticated
using (true);
create policy "Admin manage Little Jessie schedule"
on little_jessie_schedule for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public read Little Jessie gallery" on little_jessie_gallery;
drop policy if exists "Admin manage Little Jessie gallery" on little_jessie_gallery;
create policy "Public read Little Jessie gallery"
on little_jessie_gallery for select
to anon, authenticated
using (true);
create policy "Admin manage Little Jessie gallery"
on little_jessie_gallery for all
to authenticated
using (true)
with check (true);
