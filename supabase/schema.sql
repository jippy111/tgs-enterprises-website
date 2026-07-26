-- TGS ENTERPRICES CORP. Supabase database schema
-- Run this in the Supabase SQL editor before connecting the live app.

create table if not exists admin_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'admin',
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists tgs_products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric not null default 0,
  discount numeric not null default 0,
  stock integer not null default 0,
  color text,
  colors jsonb not null default '[]'::jsonb,
  description text,
  details jsonb not null default '[]'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  image text,
  featured boolean not null default false,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tgs_orders (
  reference text primary key,
  buyer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  total numeric not null default 0,
  payment_method text,
  payment_receipt text,
  payment_checked boolean not null default false,
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists little_jessie_products (
  id text primary key,
  name text not null,
  description text,
  price numeric not null default 0,
  discount numeric not null default 0,
  status text not null default 'Made to Order',
  image text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists little_jessie_inquiries (
  id text primary key,
  customer jsonb not null default '{}'::jsonb,
  order_details jsonb not null default '{}'::jsonb,
  payment_method text,
  payment_receipt text,
  payment_checked boolean not null default false,
  total_due numeric not null default 0,
  status text not null default 'Received',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists little_jessie_rentals (
  id text primary key,
  reservation_code text not null unique,
  customer jsonb not null default '{}'::jsonb,
  rental_details jsonb not null default '{}'::jsonb,
  package_price numeric not null default 0,
  transportation_fee numeric not null default 500,
  total_due numeric not null default 0,
  downpayment_due numeric not null default 0,
  initial_payment_type text,
  initial_payment_due numeric not null default 0,
  payment_method text,
  payment_receipt text,
  full_payment_method text,
  full_payment_receipt text,
  full_payment_requested boolean not null default false,
  full_payment_received boolean not null default false,
  status text not null default 'Reservation Receive',
  cancellation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists little_jessie_schedule (
  date date primary key,
  blocked boolean not null default false,
  next_available_time time,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists little_jessie_gallery (
  id text primary key,
  title text not null,
  detail text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recommended before launch: enable Row Level Security and create policies.
-- Public users should only insert customer-facing orders/inquiries/bookings.
-- Admin users should manage products, orders, schedules, and payment records through Supabase Auth.
