# Launch Checklist for TGS Enterprices Corp.

## Recommended hosting

- Hosting: Vercel
- Database/Auth/Uploads: Supabase
- Domain: your chosen registrar or Vercel Domains

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

1. Replace `your-domain.com` in:
   - public/robots.txt
   - public/sitemap.xml
2. Set Vercel environment variables:
   - VITE_ADMIN_PASSWORD_HASH
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3. Run the Supabase schema:
   - supabase/schema.sql
4. Connect the app to Supabase tables before accepting real customers.
5. Replace any remaining temporary images or missing business details.
6. Test on mobile:
   - corporate landing
   - TGS checkout
   - Little Jessie inquiry
   - Little Jessie rental booking
   - admin login and payment verification

## Current note

The app is ready for deployment preview, but live customer data still needs Supabase connection before real launch.
