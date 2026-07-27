# Firebase Setup for TGS Enterprises

Use Firebase Firestore as the cloud database for product edits, orders, bookings, gallery items, and admin records.

## 1. Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **Add project**.
3. Use a name like **TGS Enterprises Corp**.
4. Google Analytics is optional.

## 2. Create Firestore Database

1. Open the Firebase project.
2. Go to **Build** > **Firestore Database**.
3. Click **Create database**.
4. Choose a nearby region.
5. For quick launch testing, choose test mode.

For a temporary MVP launch, use these rules:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Important: These rules are open for testing. Before heavy public traffic, replace them with locked admin rules.

## 3. Get Web App Keys

1. Go to **Project settings**.
2. Under **Your apps**, click the web icon `</>`.
3. Register the app as **TGS Website**.
4. Copy these values from the Firebase config:

```js
apiKey: "YOUR_API_KEY"
projectId: "YOUR_PROJECT_ID"
```

## 4. Add Vercel Environment Variables

In Vercel, open:

**Project** > **Settings** > **Environment Variables**

Add:

```txt
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
```

Keep the Cloudinary variables too:

```txt
VITE_CLOUDINARY_CLOUD_NAME=st0bvyxy
VITE_CLOUDINARY_UPLOAD_PRESET=tgs_unsigned_upload
```

## 5. Redeploy

After saving the Vercel environment variables, click **Redeploy**.

The website will use Firebase automatically when the Firebase variables are present.

## Collections Created Automatically

The website can create these Firestore collections as needed:

```txt
tgs_products
tgs_orders
little_jessie_products
little_jessie_inquiries
little_jessie_rentals
little_jessie_schedule
little_jessie_gallery
```

