# Backend and Admin Security Plan

This project is now prepared for a real backend using Supabase.

## What changed now

- Admin login no longer checks the plain password directly.
- Admin login uses a SHA-256 password hash.
- Failed admin login attempts lock the form for 15 minutes after 5 wrong tries.
- A Supabase database schema is ready in `supabase/schema.sql`.
- A backend REST helper is ready in `src/lib/backend.js`.
- A launch environment template is ready in `.env.example`.

## Current demo admin password

The current demo password still works: `grace2026`.

Before launch, replace `VITE_ADMIN_PASSWORD_HASH` with a new password hash.

## Important launch note

A browser-only admin login is not fully secure because frontend code can be inspected. For the real public website, use Supabase Auth with admin accounts and Row Level Security policies.

## Suggested Supabase launch steps

1. Create a Supabase project.
2. Run `supabase/schema.sql` inside the Supabase SQL editor.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the real environment.
4. Create admin users in Supabase Auth.
5. Enable Row Level Security policies before public launch.
6. Move image uploads to Supabase Storage.

## Tables prepared

- `tgs_products`
- `tgs_orders`
- `little_jessie_products`
- `little_jessie_inquiries`
- `little_jessie_rentals`
- `little_jessie_schedule`
- `little_jessie_gallery`
- `admin_profiles`
