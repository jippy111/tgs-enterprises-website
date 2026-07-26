# Launch Checklist for TGS Enterprises Corp.

## Recommended hosting

- Hosting: Vercel
- Database/Auth/Uploads: Supabase
- Domain: tgs-enterprises-corp.net

## Vercel settings

- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install

## Routes

- / = Corporate landing page
- /the-grace-shop = The Grace Shop / TGS Bags
- /little-jessie-studio = Little Jessie Studyo
- /admin = Admin dashboard

## Before public launch

1. Set Vercel environment variables:
   - VITE_ADMIN_PASSWORD_HASH
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
2. Run the Supabase schema:
   - supabase/schema.sql
3. Connect the app to Supabase tables before accepting real customers.
4. Replace any remaining temporary images or missing business details.
5. Test on mobile:
   - corporate landing
   - TGS checkout
   - Little Jessie inquiry
   - Little Jessie rental booking
   - admin login and payment verification

## Current note

The app is ready for deployment preview, but live customer data still needs Supabase connection before real launch.
