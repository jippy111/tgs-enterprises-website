# Cloudinary Image Upload Setup

Use Cloudinary for product and gallery uploads so photos added on mobile appear on desktop and every customer device.

## 1. Create Cloudinary Account

Create or open a Cloudinary account, then copy your Cloud name from the dashboard.

## 2. Create Upload Preset

Go to Settings > Upload > Upload presets.

Create a new preset with:

- Signing mode: Unsigned
- Folder: optional
- Allowed formats: jpg, jpeg, png, webp

Copy the upload preset name.

## 3. Add Vercel Environment Variables

In Vercel, open the project:

Settings > Environment Variables

Add:

```text
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Apply to Production and Preview.

## 4. Redeploy

After saving the variables, redeploy the latest production deployment.

## 5. Test

Open the live website admin panel on mobile, upload a product photo, then open the website on desktop. The same uploaded image should appear because Supabase stores the Cloudinary image URL.

If the upload still says browser-only, the Cloudinary variables are missing or the latest deployment has not finished.
