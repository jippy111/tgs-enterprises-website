import React, { useEffect, useMemo, useRef, useState } from "react";
import { categories, formatCurrency, products as defaultProducts } from "./data/products";
import { backendEnabled, cloudinaryEnabled, deleteRecord, fetchTable, hasBackendAdminSession, insertRecord, signOutBackendAdmin, updateRecord, uploadCloudinaryImage, uploadCloudinaryImageViaServer, uploadPublicImage, upsertRecords } from "./lib/backend";

const navItems = ["Home", "Shop", "Track", "About", "FAQ", "Contact"];
const logo = "/assets/tgs-logo.jfif";
const corporateLogo = "/assets/tgs-enterprises-corp-logo.svg";
const heroImage = "/assets/tgs-hero-model.png";
const birRegistrationImage = "/assets/registrations/bir-registration.jfif";
const tgsBirRegistrationImage = "/assets/registrations/tgs-bir-registration.jfif";
const tgsSecCertificateImage = "/assets/registrations/tgs-sec-certificate.jfif";
const dtiRegistrationImage = "/assets/registrations/dti-registration.jfif";
const paymentQrImages = {
  GCash: "/assets/payments/gcash-qr.jfif",
  Maya: "/assets/payments/maya-qr.jfif",
  MariBank: "/assets/payments/maribank-qr.jfif",
  GoTyme: "/assets/payments/gotyme-qr.jfif",
};
const littleJessiePaymentMethods = ["GCash (via QR Code)", "Maya (via QR Code)", "MariBank", "GoTyme Bank"];
const deliveryFee = 150;
const cartStorageKey = "tgs-cart-items";
const productStorageKey = "tgs-products-v5";
const orderStorageKey = "tgs-admin-orders";
const littleJessieProductStorageKey = "little-jessie-products";
const littleJessieInquiryStorageKey = "little-jessie-inquiries";
const littleJessieGalleryStorageKey = "little-jessie-gallery";
const littleJessieRentalStorageKey = "little-jessie-rental-bookings";
const littleJessieRentalScheduleStorageKey = "little-jessie-rental-schedule";
const littleJessieCloudErrorStorageKey = "little-jessie-cloud-publish-error";
const littleJessieGalleryCloudErrorStorageKey = "little-jessie-gallery-cloud-publish-error";
const imageUploadBucket = "site-images";
const adminSessionKey = "tgs-admin-session";
const adminLoginLockKey = "tgs-admin-login-lock";
const adminPasswordHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH || "15364102026489391938ac9eed936602c1520742890b410b4ca1a4f541fd1e9f";
const adminMaxLoginAttempts = 5;
const adminLockDurationMs = 15 * 60 * 1000;
const discountOptions = Array.from({ length: 26 }, (_, index) => index * 2);
const orderStatuses = ["Pending", "Paid", "Preparing", "Shipped", "Completed", "Cancelled"];

function getDiscountedPrice(product) {
  const discount = Number(product.discount ?? 0);
  return Math.round(product.price * (1 - discount / 100));
}


const defaultLittleJessieProducts = [
  { id: "ljs-school-label-set", name: "Personalized School Label Set", description: "Coordinated notebook labels, subject labels, and name stickers prepared with your child’s theme and color palette.", price: 99, discount: 0, status: "Made to Order", image: "", available: true },
  { id: "ljs-chunky-letter-keychain", name: "Chunky Letter Keychain", description: "A playful custom keychain with chunky letters, charms, and colors chosen for birthdays, gifts, or everyday bag tags.", price: 120, discount: 0, status: "Made to Order", image: "", available: true },
  { id: "ljs-loop-keychain", name: "Loop Keychain", description: "Personalized loop-style keychain designed with names, beads, charms, and soft color combinations.", price: 120, discount: 0, status: "Made to Order", image: "", available: true },
  { id: "ljs-leather-keychain", name: "Leather Strap Keychain", description: "A neat personalized leather strap keychain for giveaways, bag tags, souvenirs, and polished small gifts.", price: 150, discount: 0, status: "Made to Order", image: "", available: true },
  { id: "ljs-party-souvenir-set", name: "Party Souvenir Set", description: "Customized keepsakes for birthdays, baptisms, school celebrations, and intimate events. Final price depends on quantity and design.", price: 0, discount: 0, status: "Made to Order", image: "", available: true },
  { id: "ljs-name-tag", name: "Custom Name Tag", description: "Cute personalized tags for school bags, lunch kits, tumblers, gifts, and daily essentials.", price: 80, discount: 0, status: "Ready to Ship", image: "", available: true },
];


const defaultLittleJessieGallery = [
  { id: "ljs-gallery-labels", title: "School Label Collections", detail: "Coordinated labels for notebooks, subjects, names, and classroom essentials.", image: "" },
  { id: "ljs-gallery-keychains", title: "Custom Keychain Orders", detail: "Chunky letters, loop styles, leather straps, charms, beads, and color-matched themes.", image: "" },
  { id: "ljs-gallery-souvenirs", title: "Event Souvenir Sets", detail: "Personalized keepsakes for birthdays, baptisms, school events, and small celebrations.", image: "" },
  { id: "ljs-gallery-rentals", title: "Rental Event Setups", detail: "Photobooth and D.I.Y Souvenir On The Spot packages prepared for booked events.", image: "" },
];

function readLittleJessieGallery() {
  try {
    const saved = JSON.parse(localStorage.getItem(littleJessieGalleryStorageKey));
    return Array.isArray(saved) && saved.length ? saved : defaultLittleJessieGallery;
  } catch {
    return defaultLittleJessieGallery;
  }
}

function readLittleJessieProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(littleJessieProductStorageKey));
    return Array.isArray(saved) && saved.length ? saved : defaultLittleJessieProducts;
  } catch {
    return defaultLittleJessieProducts;
  }
}

function getLittleJessiePrice(product) {
  const price = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  return Math.round(price * (1 - discount / 100));
}

function getPriceLabel(product) {
  const salePrice = getLittleJessiePrice(product);
  if (!Number(product.price)) return "Quote-based";
  return "From " + formatCurrency(salePrice);
}

function getAvailabilityText(product) {
  if (product.available === false) return "Unavailable";
  return product.status || "Made to Order";
}

function readSavedProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem(productStorageKey));
    return Array.isArray(saved) && saved.length ? saved : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function toDbTgsProduct(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: Number(product.price || 0),
    discount: Number(product.discount || 0),
    stock: Number(product.stock || 0),
    color: product.color || "",
    colors: getProductColors(product),
    description: product.description || "",
    details: Array.isArray(product.details) ? product.details : [],
    specs: product.specs || {},
    image: String(product.image || "").startsWith("data:") ? "" : product.image || "",
    featured: Boolean(product.featured),
    available: product.available !== false,
    updated_at: new Date().toISOString(),
  };
}

function fromDbTgsProduct(product) {
  return {
    ...product,
    featured: Boolean(product.featured),
    available: product.available !== false,
    price: Number(product.price || 0),
    discount: Number(product.discount || 0),
    stock: Number(product.stock || 0),
    colors: Array.isArray(product.colors) ? product.colors : [],
    details: Array.isArray(product.details) ? product.details : [],
    specs: product.specs || {},
  };
}

function toDbTgsOrder(order) {
  return {
    reference: order.reference,
    buyer: order.buyer || {},
    items: order.items || [],
    subtotal: Number(order.subtotal || 0),
    delivery_fee: Number(order.deliveryFee || 0),
    total: Number(order.total || 0),
    payment_method: order.paymentMethod || "",
    payment_receipt: order.paymentReceipt || "",
    payment_checked: Boolean(order.paymentChecked),
    status: order.status || "Pending",
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: order.updatedAt || new Date().toISOString(),
  };
}

function fromDbTgsOrder(order) {
  return {
    reference: order.reference,
    buyer: order.buyer || {},
    items: Array.isArray(order.items) ? order.items : [],
    subtotal: Number(order.subtotal || 0),
    deliveryFee: Number(order.delivery_fee || 0),
    total: Number(order.total || 0),
    paymentMethod: order.payment_method || "",
    paymentReceipt: order.payment_receipt || "",
    paymentChecked: Boolean(order.payment_checked),
    status: order.status || "Pending",
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

function toDbLittleJessieProduct(product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    price: Number(product.price || 0),
    discount: Number(product.discount || 0),
    status: product.status || "Made to Order",
    image: String(product.image || "").startsWith("data:") ? "" : product.image || "",
    available: product.available !== false,
    updated_at: new Date().toISOString(),
  };
}

function fromDbLittleJessieProduct(product) {
  return {
    ...product,
    price: Number(product.price || 0),
    discount: Number(product.discount || 0),
    available: product.available !== false,
  };
}

function toDbLittleJessieGallery(item) {
  return {
    id: item.id,
    title: item.title,
    detail: item.detail || "",
    image: String(item.image || "").startsWith("data:") ? "" : item.image || "",
    updated_at: new Date().toISOString(),
  };
}

function fromDbLittleJessieGallery(item) {
  return {
    id: item.id,
    title: item.title,
    detail: item.detail || "",
    image: item.image || "",
  };
}

function toDbLittleJessieRental(booking) {
  return {
    id: booking.id,
    reservation_code: booking.reservationCode,
    customer: {
      fullName: booking.fullName || "",
      mobile: booking.mobile || "",
      email: booking.email || "",
    },
    rental_details: {
      rentalType: booking.rentalType || "",
      rentalPackage: booking.rentalPackage || "",
      celebrantName: booking.celebrantName || "",
      referencePhoto: booking.referencePhoto || "",
      eventDate: booking.eventDate || "",
      eventTime: booking.eventTime || "",
      eventType: booking.eventType || "",
      eventLocationArea: booking.eventLocationArea || "",
      venueAddress: booking.venueAddress || "",
      packageNotes: booking.packageNotes || "",
      downpaymentPolicy: booking.downpaymentPolicy || "",
      balanceAfterInitialPayment: Number(booking.balanceAfterInitialPayment || 0),
    },
    package_price: Number(booking.packagePrice || 0),
    transportation_fee: Number(booking.transportationFee || 0),
    total_due: Number(booking.totalDue || 0),
    downpayment_due: Number(booking.downpaymentDue || 0),
    initial_payment_type: booking.initialPaymentType || booking.paymentOption || "50% down payment",
    initial_payment_due: Number(booking.initialPaymentDue || 0),
    payment_method: booking.paymentMethod || "",
    payment_receipt: booking.paymentReceipt || "",
    full_payment_method: booking.fullPaymentMethod || "",
    full_payment_receipt: booking.fullPaymentReceipt || "",
    full_payment_requested: Boolean(booking.fullPaymentRequested),
    full_payment_received: Boolean(booking.fullPaymentReceived),
    status: booking.status || "Reservation Receive",
    cancellation_note: booking.cancellationNote || "",
    created_at: booking.createdAt || new Date().toISOString(),
    updated_at: booking.updatedAt || new Date().toISOString(),
  };
}

function fromDbLittleJessieRental(booking) {
  const customer = booking.customer || {};
  const details = booking.rental_details || {};
  return {
    id: booking.id,
    reservationCode: booking.reservation_code,
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    status: booking.status || "Reservation Receive",
    fullName: customer.fullName || "",
    mobile: customer.mobile || "",
    email: customer.email || "",
    rentalType: details.rentalType || "",
    rentalPackage: details.rentalPackage || "",
    celebrantName: details.celebrantName || "",
    referencePhoto: details.referencePhoto || "",
    eventDate: details.eventDate || "",
    eventTime: details.eventTime || "",
    eventType: details.eventType || "",
    eventLocationArea: details.eventLocationArea || "",
    venueAddress: details.venueAddress || "",
    packageNotes: details.packageNotes || "",
    downpaymentPolicy: details.downpaymentPolicy || "",
    packagePrice: Number(booking.package_price || 0),
    transportationFee: Number(booking.transportation_fee || 0),
    totalDue: Number(booking.total_due || 0),
    downpaymentDue: Number(booking.downpayment_due || 0),
    initialPaymentType: booking.initial_payment_type || "50% down payment",
    initialPaymentDue: Number(booking.initial_payment_due || 0),
    balanceAfterInitialPayment: Number(details.balanceAfterInitialPayment || 0),
    paymentMethod: booking.payment_method || "",
    paymentReceipt: booking.payment_receipt || "",
    fullPaymentMethod: booking.full_payment_method || "",
    fullPaymentReceipt: booking.full_payment_receipt || "",
    fullPaymentRequested: Boolean(booking.full_payment_requested),
    fullPaymentReceived: Boolean(booking.full_payment_received),
    cancellationNote: booking.cancellation_note || "",
  };
}

function getDataUrlBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.ceil(base64.length * 0.75);
}

function dataUrlToBlob(dataUrl) {
  const [metadata, base64] = String(dataUrl || "").split(",");
  const mime = metadata?.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function resizeImageFile(file, maxSize = 1100, quality = 0.78, targetBytes = 420 * 1024) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        let currentMaxSize = maxSize;
        let currentQuality = quality;
        let result = source;

        for (let attempt = 0; attempt < 6; attempt += 1) {
          const scale = Math.min(1, currentMaxSize / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) break;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
          result = canvas.toDataURL("image/jpeg", currentQuality);
          if (getDataUrlBytes(result) <= targetBytes) break;
          currentMaxSize = Math.max(640, Math.round(currentMaxSize * 0.82));
          currentQuality = Math.max(0.62, currentQuality - 0.06);
        }

        resolve(result);
      };
      image.onerror = () => resolve(source);
      image.src = source;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function uploadImageToStorage(folder, file) {
  const optimizedImage = await resizeImageFile(file);
  const blob = dataUrlToBlob(optimizedImage);
  const uploadFile = new File([blob], "upload.jpg", { type: "image/jpeg" });
  const safeFolder = String(folder || "uploads").replace(/[^a-z0-9/_-]/gi, "-").toLowerCase();
  if (cloudinaryEnabled) {
    try {
      return await uploadCloudinaryImageViaServer(optimizedImage, safeFolder);
    } catch (serverError) {
      try {
        return await uploadCloudinaryImage(uploadFile, safeFolder);
      } catch (directError) {
        throw new Error(serverError.message + " Direct upload also failed: " + directError.message);
      }
    }
  }
  if (!backendEnabled) return optimizedImage;
  const path = safeFolder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + ".jpg";
  return uploadPublicImage(imageUploadBucket, path, uploadFile);
}

async function syncBackendCollection(table, primaryKey, items, previousIdsRef, toDb) {
  if (!backendEnabled) return;
  const currentIds = items.map((item) => item[primaryKey]).filter(Boolean);
  const previousIds = previousIdsRef.current || [];
  const removedIds = previousIds.filter((id) => !currentIds.includes(id));
  await Promise.all(removedIds.map((id) => deleteRecord(table, primaryKey, id)));
  if (items.length) await upsertRecords(table, items.map(toDb), primaryKey);
  previousIdsRef.current = currentIds;
}

function getStockLabel(stock) {
  if (stock <= 0) return "Sold Out";
  if (stock <= 3) return "Low Stock";
  return "In Stock";
}

function getStockClasses(stock) {
  if (stock <= 0) return "border-neutral-300 bg-neutral-100 text-neutral-500";
  if (stock <= 3) return "border-[#b78a1f] bg-[#fff8e6] text-[#8a6412]";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getProductColors(product) {
  if (Array.isArray(product.colors) && product.colors.length) return product.colors;
  if (!product.color) return ["Default"];
  return product.color
    .split(/,| and /)
    .map((color) => color.trim())
    .filter(Boolean);
}

function getDefaultColor(product) {
  return getProductColors(product)[0] ?? "Default";
}

function getCartKey(product, selectedColor) {
  return product.id + "::" + selectedColor;
}

function getProductSpecs(product) {
  const fallback = {
    size: "Compact everyday size",
    material: "Premium faux leather",
    strap: "Comfortable hand or shoulder carry",
    closure: "Secure main compartment",
    care: "Wipe gently with a soft dry cloth",
  };
  return { ...fallback, ...(product.specs ?? {}) };
}

const specLabels = {
  size: "Size",
  material: "Material",
  strap: "Strap",
  closure: "Closure",
  care: "Care",
};

function readSavedCart() {
  try {
    return JSON.parse(localStorage.getItem(cartStorageKey)) ?? [];
  } catch {
    return [];
  }
}

function readSavedOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(orderStorageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function readAdminSession() {
  return sessionStorage.getItem(adminSessionKey) === "true";
}

async function hashAdminPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readAdminLoginLock() {
  try {
    const lock = JSON.parse(localStorage.getItem(adminLoginLockKey) || "{}");
    if (lock.lockedUntil && Date.now() < lock.lockedUntil) return lock;
    if (lock.lockedUntil && Date.now() >= lock.lockedUntil) localStorage.removeItem(adminLoginLockKey);
    return { attempts: 0, lockedUntil: 0 };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function saveAdminLoginLock(lock) {
  localStorage.setItem(adminLoginLockKey, JSON.stringify(lock));
}

function formatOrderDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const paymentDetails = {
  GCash: {
    label: "GCash",
    account: "The Grace Shop",
    note: "Scan or save the GCash QR code, then send proof of payment after checkout.",
    qrLabel: "GCASH QR",
    image: paymentQrImages.GCash,
  },
  Maya: {
    label: "Maya / PayMaya",
    account: "The Grace Shop",
    note: "Scan or save the Maya QR code, then send proof of payment after checkout.",
    qrLabel: "MAYA QR",
    image: paymentQrImages.Maya,
  },
  MariBank: {
    label: "MariBank",
    account: "The Grace Shop",
    note: "Scan or save the MariBank QR code, then send proof of transfer after checkout.",
    qrLabel: "MARIBANK QR",
    image: paymentQrImages.MariBank,
  },
  GoTyme: {
    label: "GoTyme Bank",
    account: "The Grace Shop",
    note: "Scan or save the GoTyme Bank QR code, then send proof of transfer after checkout.",
    qrLabel: "GOTYME QR",
    image: paymentQrImages.GoTyme,
  },
  Bank: {
    label: "Bank Transfer",
    account: "The Grace Shop",
    note: "Choose MariBank or GoTyme Bank below, then send proof of transfer after checkout.",
    qrLabel: "BANK QR",
    image: paymentQrImages.MariBank,
  },
};

function PaymentQrBox({ method }) {
  const normalizedMethod = (method === "Maya (via the same QR Code used by TGS Bags)" || method === "Maya (via QR Code)") ? "Maya" : method === "GCash (via QR Code)" ? "GCash" : method === "GoTyme Bank" ? "GoTyme" : method === "Bank Transfer (via the same QR Code/payment details used by TGS Bags)" ? "Bank" : method;
  const details = paymentDetails[normalizedMethod] ?? paymentDetails.GCash;

  return (
    <div className="border border-[#ead9a8]/70 bg-[#fff9ed] p-3 sm:p-4">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className="grid aspect-square place-items-center border border-[#d7bd72] bg-white p-2">
          {details.image ? <img src={details.image} alt={details.qrLabel} className="h-full w-full object-contain" /> : <span className="text-xs font-black uppercase tracking-[0.12em] text-neutral-950">{details.qrLabel}</span>}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b78a1f]">Payment QR</p>
          <h3 className="mt-1 text-lg font-bold">{details.label}</h3>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{details.note}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Account name: {details.account}</p>
          {details.image && <a href={details.image} download className="mt-4 inline-flex border border-neutral-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition hover:bg-neutral-950 hover:text-white">Save QR</a>}
        </div>
      </div>
    </div>
  );
}

function getOrderStatusMessage(order) {
  if (!order) return "";
  if (order.paymentChecked || order.status === "Preparing") return "Payment received. We are preparing to ship your order.";
  if (order.status === "Paid") return "Payment received. Your order is waiting for preparation.";
  if (order.status === "Shipped") return "Your order has been shipped.";
  if (order.status === "Completed") return "Your order has been completed. Thank you for shopping with The Grace Shop.";
  if (order.status === "Cancelled") return "This order has been cancelled. Please contact The Grace Shop for assistance.";
  return "Order received. Please complete payment and send proof so we can prepare your order.";
}

function TrustStrip() {
  const items = [
    ["Quality checked", "Every piece is carefully reviewed before order confirmation."],
    ["Graceful styling", "Polished silhouettes made for everyday elegance."],
    ["Direct order support", "We confirm order details before payment instructions are sent."],
  ];

  return (
    <section className="border-y border-[#ead9a8] bg-[#111111] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-7 sm:px-6 sm:py-8 md:grid-cols-3 lg:px-8">
        {items.map(([title, copy]) => (
          <div key={title} className="border-l border-[#b78a1f] pl-5">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#d8bd6a]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product, onAdd, onView }) {
  const colors = getProductColors(product);
  const [selectedColor, setSelectedColor] = useState(getDefaultColor(product));
  const isSoldOut = product.stock <= 0 || product.available === false;
  const salePrice = getDiscountedPrice(product);
  const hasDiscount = Number(product.discount ?? 0) > 0;

  useEffect(() => {
    setSelectedColor(getDefaultColor(product));
  }, [product.id]);

  return (
    <article className="group overflow-hidden border border-[#ead9a8]/70 bg-white shadow-[0_18px_45px_rgba(17,17,17,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(17,17,17,0.10)]">
      <button type="button" onClick={() => onView(product)} className="block w-full text-left">
        <div className="aspect-[5/6] overflow-hidden bg-[#f7f0df] sm:aspect-[4/5]">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        </div>
        <div className="p-4 pb-0 sm:p-5 sm:pb-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b78a1f]">{product.category}</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold leading-tight">{product.name}</h3>
            {hasDiscount && <span className="shrink-0 bg-[#b78a1f] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">-{product.discount}%</span>}
          </div>
          <p className="mt-1 text-sm text-neutral-500">{product.color}</p>
          <span className={"mt-3 inline-flex border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] " + getStockClasses(product.stock)}>
            {product.available === false ? "Unavailable" : getStockLabel(product.stock)}{product.available !== false && product.stock > 0 ? ` - ${product.stock} left` : ""}
          </span>
        </div>
      </button>
      <div className="p-4 sm:p-5">
        <label className="mb-4 grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
          Choose Color
          <select value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} className="min-w-0 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-neutral-950 outline-none transition focus:border-[#b78a1f]">
            {colors.map((color) => <option key={color} value={color}>{color}</option>)}
          </select>
        </label>
        <div className="flex items-center justify-between gap-4">
          <div>
            {hasDiscount && <p className="text-xs font-semibold text-neutral-400 line-through">{formatCurrency(product.price)}</p>}
            <p className="font-bold">{formatCurrency(salePrice)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" onClick={() => onView(product)} className="border border-neutral-200 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] transition hover:border-[#b78a1f] sm:px-4 sm:py-2 sm:tracking-[0.14em]">
              View
            </button>
            <button type="button" onClick={() => onAdd(product, selectedColor)} disabled={isSoldOut} className="bg-neutral-950 px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#9f7418] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 sm:px-4 sm:py-2 sm:tracking-[0.14em]">
              {product.available === false ? "Unavailable" : isSoldOut ? "Sold" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductModal({ product, onClose, onAdd }) {
  const [selectedColor, setSelectedColor] = useState(product ? getDefaultColor(product) : "Default");

  useEffect(() => {
    if (product) setSelectedColor(getDefaultColor(product));
  }, [product?.id]);

  if (!product) return null;

  const colors = getProductColors(product);
  const salePrice = getDiscountedPrice(product);
  const hasDiscount = Number(product.discount ?? 0) > 0;
  const isUnavailable = product.available === false || product.stock <= 0;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/45 p-2 sm:p-4" onClick={onClose}>
      <div className="mx-auto my-2 grid max-w-5xl bg-white shadow-2xl sm:my-8 md:grid-cols-2" onClick={(event) => event.stopPropagation()}>
        <div className="bg-[#f7f0df]">
          <img src={product.image} alt={product.name} className="h-full max-h-[320px] min-h-[240px] w-full object-cover sm:max-h-[420px] md:max-h-none md:min-h-[360px]" />
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">{product.category}</p>
              <h2 className="mt-3 font-serif text-2xl font-bold leading-tight sm:text-4xl">{product.name}</h2>
            </div>
            <button type="button" onClick={onClose} className="border border-neutral-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] hover:border-neutral-950">
              Close
            </button>
          </div>
          <div className="mt-4">
            {hasDiscount && <p className="text-sm font-semibold text-neutral-400 line-through">{formatCurrency(product.price)}</p>}
            <p className="text-2xl font-bold">{formatCurrency(salePrice)}</p>
            {hasDiscount && <p className="mt-1 text-sm font-bold text-[#b78a1f]">{product.discount}% off</p>}
          </div>
          <label className="mt-4 grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
            Choose Color
            <select value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)} className="min-w-0 border border-neutral-200 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-neutral-950 outline-none transition focus:border-[#b78a1f]">
              {colors.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
          </label>
          <span className={"mt-4 inline-flex border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] " + getStockClasses(product.stock)}>
            {getStockLabel(product.stock)}{product.stock > 0 ? ` - ${product.stock} available` : ""}
          </span>
          <p className="mt-5 text-base leading-7 text-neutral-600">{product.description}</p>
          <div className="mt-7 border-t border-neutral-200 pt-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em]">Product Specs</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {Object.entries(getProductSpecs(product)).map(([key, value]) => (
                <div key={key} className="border border-neutral-100 bg-[#fffdf8] p-3">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b78a1f]">{specLabels[key] ?? key}</dt>
                  <dd className="mt-1 text-neutral-600">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-7 border-t border-neutral-200 pt-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em]">Details</p>
            <ul className="mt-4 grid gap-2 text-sm text-neutral-600">
              {product.details.map((detail) => <li key={detail}>- {detail}</li>)}
            </ul>
          </div>
          <button type="button" disabled={product.stock <= 0} onClick={() => { onAdd(product, selectedColor); onClose(); }} className="mt-8 w-full bg-neutral-950 px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500">
            {product.stock <= 0 ? "Sold Out" : "Add to Bag"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartSection({ cartItems, onIncrease, onDecrease, onRemove }) {
  const subtotal = cartItems.reduce((sum, item) => sum + getDiscountedPrice(item) * item.quantity, 0);
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  return (
    <section id="cart" className="bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Your bag</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Cart summary</h2>
          </div>
          <a href="#shop" className="w-fit border border-neutral-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-neutral-950 hover:text-white">
            Continue Shopping
          </a>
        </div>

        {cartItems.length === 0 ? (
          <div className="border border-neutral-200 bg-[#fff9ed] p-8 text-center">
            <p className="text-lg font-bold">Your bag is empty.</p>
            <p className="mt-2 text-sm text-neutral-600">Add a bag from The Grace Shop collection to begin your order.</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4">
              {cartItems.map((item) => (
                <article key={item.cartKey || item.id} className="grid gap-3 border border-[#ead9a8]/70 bg-white p-3 shadow-[0_18px_45px_rgba(17,17,17,0.06)] sm:grid-cols-[112px_1fr_auto] sm:p-4">
                  <img src={item.image} alt={item.name} className="h-36 w-full object-cover sm:h-28" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b78a1f]">{item.category}</p>
                    <h3 className="mt-2 font-bold">{item.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{formatCurrency(getDiscountedPrice(item))}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-500">Color: {item.selectedColor || getDefaultColor(item)}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-500">Stock available: {item.stock}</p>
                    <div className="mt-4 flex w-fit items-center border border-neutral-200">
                      <button type="button" onClick={() => onDecrease(item.cartKey || item.id)} className="px-4 py-2 text-lg font-bold" aria-label="Decrease quantity">-</button>
                      <span className="w-9 text-center text-sm font-bold">{item.quantity}</span>
                      <button type="button" onClick={() => onIncrease(item.cartKey || item.id)} disabled={item.quantity >= item.stock} className="px-4 py-2 text-lg font-bold disabled:cursor-not-allowed disabled:text-neutral-300" aria-label="Increase quantity">+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-neutral-100 pt-3 sm:grid sm:border-t-0 sm:pt-0 sm:justify-items-end">
                    <p className="font-bold">{formatCurrency(getDiscountedPrice(item) * item.quantity)}</p>
                    <button type="button" onClick={() => onRemove(item.cartKey || item.id)} className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500 transition hover:text-red-600">
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit border border-[#ead9a8] bg-[#fff9ed] p-6">
              <h3 className="text-xl font-bold">Order Total</h3>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Delivery</span><span className="font-semibold">{formatCurrency(deliveryFee)}</span></div>
                <div className="mt-2 flex justify-between border-t border-[#ead9a8] pt-4 text-lg font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
              <a href="#checkout" className="mt-6 flex w-full items-center justify-center bg-neutral-950 px-5 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418]">
                Proceed to Checkout
              </a>
              <p className="mt-3 text-center text-xs leading-5 text-neutral-500 lg:hidden" aria-label="Mobile Checkout">Review your items and address before placing your order.</p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}


function CheckoutSection({ cartItems, onPlaceOrder, orderPlaced }) {
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    houseUnit: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
    landmark: "",
    payment: "GCash",
    paymentReceipt: "",
    notes: "",
  });
  const subtotal = cartItems.reduce((sum, item) => sum + getDiscountedPrice(item) * item.quantity, 0);
  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadPaymentReceipt = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateForm("paymentReceipt", reader.result);
    reader.readAsDataURL(file);
  };

  const submitOrder = (event) => {
    event.preventDefault();
    onPlaceOrder(form);
  };

  if (orderPlaced) {
    return (
      <section id="checkout" className="border-t border-[#ead9a8]/70 bg-[#fff9ed] py-16">
        <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="border border-[#ead9a8] bg-white p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Order received</p>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Thank you, {orderPlaced.fullName}.</h2>
            <p className="mt-3 text-sm font-bold uppercase tracking-[0.16em] text-neutral-500">Reference: {orderPlaced.reference}</p>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-neutral-600">
              The Grace Shop has received your buyer information and complete delivery details. Please use the selected {orderPlaced.payment} QR code for payment, then send proof of payment so we can confirm and prepare your order.
            </p>
            <a href="#shop" className="mt-7 inline-flex bg-neutral-950 px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418]">
              Continue Shopping
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="checkout" className="border-t border-[#ead9a8]/70 bg-[#fff9ed] pb-28 pt-16 lg:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Checkout</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Complete Your Order</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            Choose your preferred payment method below. The matching QR code will appear so you can scan or save it before placing your order.
          </p>
        </div>

        {cartItems.length === 0 ? (
          <div className="border border-[#ead9a8]/70 bg-white shadow-[0_18px_45px_rgba(17,17,17,0.06)] p-8 text-center">
            <p className="text-lg font-bold">Add a bag before checkout.</p>
            <a href="#shop" className="mt-5 inline-flex border border-neutral-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-neutral-950 hover:text-white">
              Shop Bags
            </a>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
            <form onSubmit={submitOrder} className="grid gap-5 border border-[#ead9a8]/70 bg-white p-4 shadow-[0_18px_45px_rgba(17,17,17,0.06)] sm:p-6">
              <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                <span className="border border-[#ead9a8] bg-[#fff9ed] px-3 py-2">1 Buyer</span>
                <span className="border border-[#ead9a8] bg-[#fff9ed] px-3 py-2">2 Address</span>
                <span className="border border-[#ead9a8] bg-[#fff9ed] px-3 py-2">3 Payment</span>
                <span className="border border-[#ead9a8] bg-[#fff9ed] px-3 py-2">4 Review</span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Full name
                  <input required value={form.fullName} onChange={(event) => updateForm("fullName", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Phone number
                  <input required value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold">
                Email
                <input required type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
              </label>
              <div className="border-t border-neutral-100 pt-5">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#b78a1f]">Complete delivery address</p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    House No. / Unit / Floor
                    <input required value={form.houseUnit} onChange={(event) => updateForm("houseUnit", event.target.value)} placeholder="Ex. Unit 2B, Blk 5 Lot 8" className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Street / Subdivision / Building
                    <input required value={form.street} onChange={(event) => updateForm("street", event.target.value)} placeholder="Street, village, building name" className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Barangay
                    <input required value={form.barangay} onChange={(event) => updateForm("barangay", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    City / Municipality
                    <input required value={form.city} onChange={(event) => updateForm("city", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Province
                    <input required value={form.province} onChange={(event) => updateForm("province", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Postal Code
                    <input required value={form.postalCode} onChange={(event) => updateForm("postalCode", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                  </label>
                </div>
                <label className="mt-5 grid gap-2 text-sm font-bold">
                  Landmark / Rider Delivery Notes
                  <input value={form.landmark} onChange={(event) => updateForm("landmark", event.target.value)} placeholder="Nearby landmark, gate color, or delivery instruction" className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold">
                Payment method
                <select value={form.payment} onChange={(event) => updateForm("payment", event.target.value)} className="min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]">
                  <option>GCash</option>
                  <option>MariBank</option><option>GoTyme Bank</option>
                  <option>Maya</option>
                </select>
              </label>
              <PaymentQrBox method={form.payment} />
              <label className="mt-4 grid gap-2 text-sm font-bold">Attach Payment Receipt
                <input type="file" accept="image/*" onChange={(event) => uploadPaymentReceipt(event.target.files?.[0])} className="min-w-0 border border-neutral-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-[#b78a1f]" />
              </label>
              {form.paymentReceipt && <p className="mt-2 text-sm font-semibold text-[#b78a1f]">Receipt attached.</p>}
              <label className="grid gap-2 text-sm font-bold">
                Order notes
                <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Optional order notes" className="min-h-24 min-w-0 border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
              </label>

              <div className="border border-[#ead9a8]/70 bg-[#fff9ed] p-3 sm:p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#b78a1f]">Review before placing order</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">Please confirm your items, selected colors, delivery address, and payment method before submitting.</p>
                <label className="mt-4 flex items-start gap-3 text-sm font-semibold leading-6">
                  <input required type="checkbox" checked={confirmedReview} onChange={(event) => setConfirmedReview(event.target.checked)} className="mt-1 h-4 w-4 accent-neutral-950" />
                  I confirm that my items, colors, address, and payment method are correct.
                </label>
              </div>

              <button type="submit" disabled={!confirmedReview} className="bg-neutral-950 px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500">
                Place Order
              </button>
            </form>

            <aside id="order-summary" className="h-fit border border-[#ead9a8] bg-white p-5 sm:p-6">
              <h3 className="text-xl font-bold">Review Your Order</h3>
              <div className="mt-5 grid gap-4">
                {cartItems.map((item) => (
                  <div key={item.cartKey || item.id} className="grid grid-cols-[64px_1fr] gap-3 border-b border-neutral-100 pb-4 sm:flex">
                    <img src={item.image} alt={item.name} className="h-16 w-16 object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-bold leading-tight">{item.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">Color: {item.selectedColor || getDefaultColor(item)}</p>
                      <p className="mt-1 text-xs text-neutral-500">Qty {item.quantity}</p>
                    </div>
                    <p className="col-span-2 text-sm font-bold sm:col-span-1">{formatCurrency(getDiscountedPrice(item) * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between"><span className="text-neutral-600">Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-600">Delivery</span><span className="font-semibold">{formatCurrency(deliveryFee)}</span></div>
                <div className="mt-2 flex justify-between border-t border-[#ead9a8] pt-4 text-lg font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
            </aside>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead9a8] bg-white/95 px-4 py-3 shadow-[0_-14px_35px_rgba(17,17,17,0.12)] backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">Order Total</p>
                  <p className="text-lg font-bold">{formatCurrency(total)}</p>
                </div>
                <a href="#order-summary" className="bg-neutral-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white">Review</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


function TrackOrderSection({ orders, latestOrder }) {
  const [reference, setReference] = useState(latestOrder?.reference ?? "");
  const normalizedReference = reference.trim().toUpperCase();
  const order = orders.find((item) => item.reference.toUpperCase() === normalizedReference) || (latestOrder?.reference === normalizedReference ? latestOrder : null);
  const statusSteps = ["Order Placed", "Payment Review", "Preparing", "Shipped", "Completed"];
  const getDisplayStatus = (item) => {
    if (!item) return "";
    if (!item.paymentChecked && (item.status === "Pending" || !item.status)) return "Order Placed";
    if (item.paymentChecked && ["Pending", "Paid", "Preparing"].includes(item.status)) return "Preparing";
    if (item.status === "Paid") return "Payment Review";
    return item.status || "Order Placed";
  };
  const activeIndex = order ? Math.max(0, statusSteps.indexOf(getDisplayStatus(order))) : -1;

  useEffect(() => {
    if (latestOrder?.reference) setReference(latestOrder.reference);
  }, [latestOrder?.reference]);

  return (
    <section id="track" className="border-t border-[#ead9a8]/70 bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Track Order</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Check Your Order Update</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">Enter your order reference number to see your order progress from placement to completion.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form className="h-fit border border-[#ead9a8]/70 bg-[#fff9ed] p-5 shadow-[0_18px_45px_rgba(17,17,17,0.06)]" onSubmit={(event) => event.preventDefault()}>
            <label className="grid gap-2 text-sm font-bold">
              Order Reference
              <input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="Ex. TGS-123456" className="min-w-0 border border-neutral-200 bg-white px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f]" />
            </label>
            {latestOrder?.reference && <button type="button" onClick={() => setReference(latestOrder.reference)} className="mt-4 border border-neutral-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition hover:bg-neutral-950 hover:text-white">Use Latest Order</button>}
          </form>

          <div className="border border-[#ead9a8]/70 bg-white p-5 shadow-[0_18px_45px_rgba(17,17,17,0.06)]">
            {!order ? (
              <div className="py-6 text-center">
                <p className="text-lg font-bold">No order found yet.</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">Check the reference number from your order confirmation and try again.</p>
              </div>
            ) : (
              <div>
                <div className="flex flex-col justify-between gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b78a1f]">{order.reference}</p>
                    <h3 className="mt-2 text-xl font-bold">{getOrderStatusMessage(order)}</h3>
                    <p className="mt-2 text-sm text-neutral-500">Placed {formatOrderDate(order.createdAt)}</p>
                  </div>
                  <span className="w-fit border border-[#b78a1f] bg-[#fff8e6] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#8a6412]">{getDisplayStatus(order)}</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-5">
                  {statusSteps.map((step, index) => (
                    <div key={step} className={"border p-3 text-center text-xs font-bold uppercase tracking-[0.12em] " + (index <= activeIndex ? "border-[#b78a1f] bg-[#fff8e6] text-[#8a6412]" : "border-neutral-200 bg-white text-neutral-400")}>
                      {step}
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 text-sm text-neutral-600 sm:grid-cols-2">
                  <p><span className="font-semibold text-neutral-950">Buyer:</span> {order.buyer.fullName}</p>
                  <p><span className="font-semibold text-neutral-950">Payment:</span> {order.paymentMethod}</p>
                  <p><span className="font-semibold text-neutral-950">Total:</span> {formatCurrency(order.total)}</p>
                  <p><span className="font-semibold text-neutral-950">Items:</span> {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p>
                  <p><span className="font-semibold text-neutral-950">Metro Manila estimate:</span> 2-4 days after payment confirmation</p>
                  <p><span className="font-semibold text-neutral-950">Provincial estimate:</span> 4-7 days after payment confirmation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowToOrderSection() {
  const steps = [
    ["Choose your bag", "Browse the collection, select a color, and add your preferred pieces to your bag."],
    ["Complete buyer details", "Enter your contact information, full delivery address, and preferred payment method."],
    ["Wait for confirmation", "The Grace Shop confirms stock and delivery details. Buyers can scan or save the selected payment QR code before placing an order."],
    ["Prepare for delivery", "Once confirmed, your order is packed carefully and scheduled for delivery."],
  ];

  return (
    <section id="how-to-order" className="border-t border-[#ead9a8]/70 bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">How to Order</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Simple, Confirmed, and Personal</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">Every order is reviewed before payment instructions are sent, so buyers know the selected bag, color, stock, and delivery details are correct.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map(([title, copy], index) => (
            <div key={title} className="border border-[#ead9a8]/70 bg-[#fff9ed] p-5">
              <span className="grid h-9 w-9 place-items-center bg-neutral-950 text-sm font-bold text-white">{index + 1}</span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PolicySection() {
  const policies = [
    ["Delivery Estimate", "Metro Manila orders usually take 2-4 days after payment confirmation. Provincial orders usually take 4-7 days depending on courier schedule."],
    ["Returns & Exchange", "Exchange requests are accepted for wrong item, wrong color, or confirmed product concern only. Items must be unused, complete, and reported within 24 hours after delivery."],
    ["Payments", "GCash, Maya, and bank transfer payments are handled through the QR code shown at checkout. Buyers should send proof of payment after placing an order."],
    ["Privacy", "Buyer contact details and delivery addresses are collected only to confirm, process, and deliver orders from The Grace Shop."],
  ];

  return (
    <section id="policies" className="border-t border-[#ead9a8]/70 bg-[#fff9ed] py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Store Policies</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Clear Details Before You Order</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {policies.map(([title, copy]) => (
            <article key={title} className="border border-[#ead9a8]/70 bg-white p-5 shadow-[0_18px_45px_rgba(17,17,17,0.05)]">
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    ["Is online payment connected?", "A real payment gateway is not connected yet. Buyers choose GCash, Bank Transfer, or Maya, then scan or save the matching QR code shown at checkout."],
    ["Can customers search and filter bags?", "Yes. The shop includes search and category filters for tote bags, shoulder bags, sling bags, backpacks, and travel bags."],
    ["Are the bags ready on hand?", "Stock availability is shown on each product. If a bag is sold out, it cannot be added to your order."],
    ["How does delivery work?", "The checkout adds a delivery fee and collects complete address details. Metro Manila delivery is usually 2-4 days and provincial delivery is usually 4-7 days after payment confirmation."],
    ["Can I exchange a bag?", "Exchange requests are reviewed for wrong item, wrong color, or confirmed product concern only. Please report the concern within 24 hours after delivery."],
    ["How do I care for my bag?", "Keep the bag dry, avoid overloading, and wipe gently with a soft dry cloth after use. Store it in a clean, dry place."],
  ];

  return (
    <section id="faq" className="border-t border-[#ead9a8]/70 bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">FAQ</p>
        <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Questions Before Checkout</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map(([question, answer]) => (
            <details key={question} className="border border-neutral-200 bg-[#fff9ed] p-5">
              <summary className="cursor-pointer text-lg font-bold">{question}</summary>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="contact" className="border-t border-[#ead9a8]/70 bg-[#fff9ed] py-16">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Contact</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Let Us Help With Your Next Bag</h2>
          <form className="mt-7 grid gap-4 border border-[#ead9a8]/70 bg-white shadow-[0_18px_45px_rgba(17,17,17,0.06)] p-6" onSubmit={(event) => event.preventDefault()}>
            <input className="border border-neutral-200 px-4 py-3 outline-none transition focus:border-[#b78a1f]" placeholder="Full name" aria-label="Full name" />
            <input className="border border-neutral-200 px-4 py-3 outline-none transition focus:border-[#b78a1f]" placeholder="Email address" aria-label="Email address" />
            <textarea className="min-h-32 min-w-0 border border-neutral-200 px-4 py-3 outline-none transition focus:border-[#b78a1f]" placeholder="Message" aria-label="Message" />
            <button type="submit" className="w-fit bg-neutral-950 px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418]">Send Message</button>
          </form>
        </div>
        <aside className="h-fit border border-[#ead9a8] bg-white p-6">
          <img src={logo} alt="TGS logo" className="h-20 w-20 object-contain" />
          <h3 className="mt-4 text-2xl font-bold">The Grace Shop</h3>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            Email: thegraceshopcainta@gmail.com<br />
            Phone: 09524804413<br />
            Hours: Monday to Sunday, 10 AM to 8 PM
          </p>
        </aside>
      </div>
    </section>
  );
}


function AdminLoginPanel({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [lock, setLock] = useState(readAdminLoginLock);
  const isLocked = lock.lockedUntil && Date.now() < lock.lockedUntil;
  const lockMinutes = isLocked ? Math.ceil((lock.lockedUntil - Date.now()) / 60000) : 0;

  const submitLogin = async (event) => {
    event.preventDefault();
    const currentLock = readAdminLoginLock();
    if (currentLock.lockedUntil && Date.now() < currentLock.lockedUntil) {
      setLock(currentLock);
      setError("Too many failed attempts. Try again in " + Math.ceil((currentLock.lockedUntil - Date.now()) / 60000) + " minute(s).");
      return;
    }

    setIsChecking(true);
    let loginError = "Incorrect admin login.";
    try {
      const enteredHash = await hashAdminPassword(password);
      if (enteredHash !== adminPasswordHash) throw new Error("Incorrect admin password.");
      sessionStorage.setItem(adminSessionKey, "true");

      localStorage.removeItem(adminLoginLockKey);
      setLock({ attempts: 0, lockedUntil: 0 });
      setError("");
      setPassword("");
      onLogin();
      return;
    } catch (error) {
      console.error(error);
      loginError = error.message || loginError;
      setError(loginError);
    }
    setIsChecking(false);

    const attempts = Number(currentLock.attempts || 0) + 1;
    const nextLock = attempts >= adminMaxLoginAttempts ? { attempts, lockedUntil: Date.now() + adminLockDurationMs } : { attempts, lockedUntil: 0 };
    saveAdminLoginLock(nextLock);
    setLock(nextLock);
    setError(attempts >= adminMaxLoginAttempts ? "Too many failed attempts. Admin login is locked for 15 minutes." : loginError + " Attempts left: " + Math.max(adminMaxLoginAttempts - attempts, 0));
  };

  return (
    <section id="admin" className="border-t border-[#ead9a8]/70 bg-[#fff9ed] py-16">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8">
        <form onSubmit={submitLogin} className="border border-[#ead9a8]/70 bg-white p-5 shadow-[0_18px_45px_rgba(17,17,17,0.06)] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Secure Staff Access</p>
          <h2 className="mt-2 font-serif text-3xl font-bold">Admin Login</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">Enter the staff password to manage orders, products, stock, discounts, colors, product details, bookings, and income records.</p>
          <div className="mt-5 border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">Admin access uses a private staff password. Keep this password confidential.</div>
          <label className="mt-6 grid gap-2 text-sm font-bold">
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={Boolean(isLocked) || isChecking} className="border border-neutral-200 px-4 py-3 font-normal outline-none transition focus:border-[#b78a1f] disabled:bg-neutral-100 disabled:text-neutral-400" autoComplete="current-password" />
          </label>
          {isLocked && <p className="mt-3 text-sm font-semibold text-red-600">Admin login is locked. Try again in {lockMinutes} minute(s).</p>}
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          <button type="submit" disabled={Boolean(isLocked) || isChecking} className="mt-5 w-full bg-neutral-950 px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418] disabled:cursor-not-allowed disabled:bg-neutral-300">{isChecking ? "Checking..." : "Unlock Admin"}</button>
        </form>
      </div>
    </section>
  );
}



function LittleJessieRentalScheduleAdminPanel() {
  const emptyDraft = { date: "", blocked: false, nextAvailableTime: "", note: "" };
  const [draft, setDraft] = useState(emptyDraft);
  const [schedules, setSchedules] = useState(() => {
    try { return JSON.parse(localStorage.getItem(littleJessieRentalScheduleStorageKey)) || []; } catch { return []; }
  });

  const saveSchedules = (nextSchedules) => {
    setSchedules(nextSchedules);
    localStorage.setItem(littleJessieRentalScheduleStorageKey, JSON.stringify(nextSchedules));
  };

  const saveSchedule = (event) => {
    event.preventDefault();
    if (!draft.date) return;
    const item = { ...draft, id: draft.date };
    saveSchedules([item, ...schedules.filter((schedule) => schedule.date !== draft.date)]);
    setDraft(emptyDraft);
  };

  const updateSchedule = (date, updates) => {
    saveSchedules(schedules.map((schedule) => schedule.date === date ? { ...schedule, ...updates } : schedule));
  };

  const removeSchedule = (date) => {
    saveSchedules(schedules.filter((schedule) => schedule.date !== date));
  };

  return (
    <section id="little-jessie-rental-schedule-admin" className="border-t border-pink-100 bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Rental Schedule Control</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Block Dates and Set Next Available Time</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Admin controls the calendar manually. Customers will see your note after selecting a date.</p>
        </div>
        <form onSubmit={saveSchedule} className="mb-8 grid gap-4 border border-pink-100 bg-[#fff8fb] p-5 lg:grid-cols-4">
          <input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="border border-stone-200 px-4 py-3 outline-none focus:border-pink-300" />
          <select value={String(draft.blocked)} onChange={(event) => setDraft({ ...draft, blocked: event.target.value === "true" })} className="border border-stone-200 px-4 py-3 outline-none focus:border-pink-300"><option value="false">Available with note</option><option value="true">Block / Fully Booked</option></select>
          <input type="time" value={draft.nextAvailableTime} onChange={(event) => setDraft({ ...draft, nextAvailableTime: event.target.value })} className="border border-stone-200 px-4 py-3 outline-none focus:border-pink-300" />
          <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Admin note shown to client" className="border border-stone-200 px-4 py-3 outline-none focus:border-pink-300" />
          <button type="submit" className="bg-stone-950 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-pink-600">Save Schedule</button>
        </form>
        <div className="grid gap-3">
          {schedules.length === 0 ? <div className="border border-pink-100 bg-[#fff8fb] p-5 text-sm text-stone-600">No schedule controls yet.</div> : schedules.map((schedule) => (
            <article key={schedule.date} className="grid gap-3 border border-pink-100 bg-[#fff8fb] p-4 md:grid-cols-[160px_160px_160px_1fr_auto] md:items-center">
              <input type="date" value={schedule.date} onChange={(event) => updateSchedule(schedule.date, { date: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm" />
              <select value={String(schedule.blocked)} onChange={(event) => updateSchedule(schedule.date, { blocked: event.target.value === "true" })} className="border border-stone-200 px-3 py-2 text-sm"><option value="false">Available</option><option value="true">Blocked</option></select>
              <input type="time" value={schedule.nextAvailableTime || ""} onChange={(event) => updateSchedule(schedule.date, { nextAvailableTime: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm" />
              <input value={schedule.note || ""} onChange={(event) => updateSchedule(schedule.date, { note: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm" />
              <button type="button" onClick={() => removeSchedule(schedule.date)} className="border border-red-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-600 hover:bg-red-600 hover:text-white">Remove</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LittleJessieRentalAdminPanel() {
  const [bookings, setBookings] = useState(() => {
    try {
      const savedBookings = JSON.parse(localStorage.getItem(littleJessieRentalStorageKey)) || [];
      let highestCode = savedBookings.reduce((max, booking) => {
        const match = String(booking.reservationCode || "").match(/LJS-(\d+)/i);
        return Math.max(max, match ? Number(match[1]) : 0);
      }, 0);
      let changed = false;
      const normalizedBookings = savedBookings.map((booking) => {
        if (booking.reservationCode) return booking;
        highestCode += 1;
        changed = true;
        return { ...booking, reservationCode: "LJS-" + String(highestCode).padStart(3, "0") };
      });
      if (changed) localStorage.setItem(littleJessieRentalStorageKey, JSON.stringify(normalizedBookings));
      return normalizedBookings;
    } catch { return []; }
  });

  useEffect(() => {
    if (!backendEnabled) return;
    fetchTable("little_jessie_rentals")
      .then((cloudBookings) => {
        if (!Array.isArray(cloudBookings)) return;
        const nextBookings = cloudBookings.map(fromDbLittleJessieRental).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        setBookings(nextBookings);
        localStorage.setItem(littleJessieRentalStorageKey, JSON.stringify(nextBookings));
      })
      .catch(console.error);
  }, []);

  const updateBooking = (id, updates) => {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.status === "Full Payment Receive") normalizedUpdates.fullPaymentReceived = true;
    if (normalizedUpdates.status === "Reservation Receive") normalizedUpdates.fullPaymentReceived = false;
    const nextBookings = bookings.map((booking) => booking.id === id ? { ...booking, ...normalizedUpdates, updatedAt: new Date().toISOString() } : booking);
    setBookings(nextBookings);
    localStorage.setItem(littleJessieRentalStorageKey, JSON.stringify(nextBookings));
    const updatedBooking = nextBookings.find((booking) => booking.id === id);
    if (backendEnabled && updatedBooking) {
      updateRecord("little_jessie_rentals", "id", id, toDbLittleJessieRental(updatedBooking)).catch(console.error);
    }
  };
  const clearBookings = () => {
    if (!window.confirm("Clear all Little Jessie rental bookings from this browser?")) return;
    setBookings([]);
    localStorage.removeItem(littleJessieRentalStorageKey);
  };
  return (
    <section id="little-jessie-rental-admin" className="border-t border-pink-100 bg-[#fff8fb] py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Little Jessie Rentals</p><h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Rental Booking Calendar</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Review photobooth and D.I.Y Souvenir On The Spot booking requests. Reservation is confirmed only after downpayment.</p></div>
          {bookings.length > 0 && <button type="button" onClick={clearBookings} className="w-fit border border-stone-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-stone-950 hover:text-white">Clear Rental Bookings</button>}
        </div>
        {bookings.length === 0 ? <div className="border border-pink-100 bg-white p-6 text-center text-sm text-stone-600">No rental bookings yet.</div> : (
          <div className="grid gap-4">{bookings.map((booking) => {
            const firstPaymentType = booking.initialPaymentType || booking.paymentOption || "50% down payment";
            const customerSubmittedFullPayment = firstPaymentType === "Full payment" || Boolean(booking.fullPaymentReceipt);
            const paymentStatusLabel = booking.fullPaymentReceived || booking.status === "Full Payment Receive" ? "Full Payment Verified" : customerSubmittedFullPayment ? "Full Payment Submitted - Verify Receipt" : booking.paymentReceipt ? "Down Payment Submitted" : "No Payment Receipt Yet";
            const paymentStatusClass = booking.fullPaymentReceived || booking.status === "Full Payment Receive" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : customerSubmittedFullPayment ? "bg-blue-100 text-blue-800 border-blue-200" : booking.paymentReceipt ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-stone-100 text-stone-600 border-stone-200";
            const paymentReviewMessage = booking.fullPaymentReceived || booking.status === "Full Payment Receive" ? "Admin has verified this as fully paid." : customerSubmittedFullPayment ? "Client submitted proof for full payment. Review the receipt, then set Booking Status to Full Payment Receive." : booking.paymentReceipt ? "Client submitted down payment only. Remaining balance still needs to be settled." : "No payment receipt has been submitted yet.";
            const initialPaymentDue = booking.initialPaymentDue ?? (firstPaymentType === "Full payment" ? booking.totalDue : booking.downpaymentDue);
            const balanceAfterInitialPayment = booking.balanceAfterInitialPayment ?? (firstPaymentType === "Full payment" ? 0 : Math.max(Number(booking.totalDue || 0) - Number(booking.downpaymentDue || 0), 0));
            return (
            <article key={booking.id} className="border border-pink-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">{booking.id}</p><p className="mt-1 text-sm font-bold text-pink-700">Reservation Code: {booking.reservationCode || "Pending"}</p><span className={"mt-3 inline-flex w-fit border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] " + paymentStatusClass}>{paymentStatusLabel}</span><h3 className="mt-2 text-lg font-bold">{booking.rentalType}</h3><p className="mt-1 text-sm text-stone-500">{booking.eventDate} · {booking.eventTime || "Time not set"}</p></div><div className="grid gap-3 md:w-64"><label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Booking Status<select value={booking.status || "Reservation Receive"} onChange={(event) => updateBooking(booking.id, { status: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300"><option>Reservation Receive</option><option>Full Payment Receive</option><option>Cancelled</option></select></label>{booking.status === "Cancelled" && <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Cancellation Note<textarea value={booking.cancellationNote || ""} onChange={(event) => updateBooking(booking.id, { cancellationNote: event.target.value })} className="min-h-20 border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300" placeholder="Reason for cancellation" /></label>}</div></div>
              <div className={"mt-4 border p-4 text-sm font-semibold leading-6 " + paymentStatusClass}>
                <p className="text-base font-bold">Payment Verification: {paymentStatusLabel}</p>
                <p className="mt-1">{paymentReviewMessage}</p>
              </div>
              <div className="mt-4 grid gap-4 text-sm leading-6 text-stone-600 xl:grid-cols-4"><div><p className="font-bold text-stone-950">Customer</p><p>{booking.fullName}</p><p>{booking.mobile}</p><p>{booking.email}</p></div><div><p className="font-bold text-stone-950">Event</p><p>{booking.eventType}</p><p>{booking.eventLocationArea || "Location area not selected"}</p><p>{booking.venueAddress}</p><p>{booking.paymentMethod}</p><p>Package: {booking.rentalPackage}</p><p>Celebrant: {booking.celebrantName}</p></div><div><p className="font-bold text-stone-950">Payment Review</p><p>Package: {booking.rentalPackage}</p><p>Package price: {booking.packagePrice ? formatCurrency(booking.packagePrice) : "Quote-based"}</p><p>Transportation fee: {formatCurrency(booking.transportationFee ?? 500)}</p><p>Total due: {booking.totalDue ? formatCurrency(booking.totalDue) : "For quotation"}</p><p>Customer selected: {firstPaymentType}</p><p>Expected first payment: {initialPaymentDue ? formatCurrency(initialPaymentDue) : "To be confirmed"}</p><p>Remaining balance: {booking.totalDue ? formatCurrency(balanceAfterInitialPayment) : "To be confirmed"}</p><p>Admin full-payment mark: {booking.fullPaymentReceived || booking.status === "Full Payment Receive" ? "Received" : "Not yet marked"}</p><p>Status: {booking.status}</p>{booking.status === "Cancelled" && <p>Cancellation note: {booking.cancellationNote || "No note added"}</p>}</div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {booking.paymentReceipt && <div className="border border-stone-100 bg-stone-50 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-600">{firstPaymentType === "Full payment" ? "Full Payment Receipt" : "Down Payment Receipt"}</p><img src={booking.paymentReceipt} alt={firstPaymentType === "Full payment" ? "Full payment receipt" : "Down payment receipt"} className="h-32 w-32 object-cover" /></div>}
                {booking.fullPaymentReceipt && <div className="border border-blue-100 bg-blue-50 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Full Balance Receipt</p><img src={booking.fullPaymentReceipt} alt="Full payment receipt" className="h-32 w-32 object-cover" /></div>}
                {booking.referencePhoto && <div className="border border-pink-100 bg-[#fff8fb] p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-pink-600">Reference Photo</p><img src={booking.referencePhoto} alt="Rental reference" className="h-32 w-32 object-cover" /></div>}
              </div>
              {booking.packageNotes && <p className="mt-4 border-t border-stone-100 pt-4 text-sm leading-6 text-stone-600"><span className="font-bold text-stone-950">Notes:</span> {booking.packageNotes}</p>}
            </article>
            );
          })}</div>
        )}
      </div>
    </section>
  );
}

function LittleJessieGalleryAdmin({ gallery, setGallery, publishGalleryOnline }) {
  const emptyDraft = { title: "", detail: "", image: "" };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [gallerySaveMessage, setGallerySaveMessage] = useState("");
  const publishTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
    };
  }, []);

  const saveGallery = (nextGallery) => {
    setGallery(nextGallery);
    localStorage.setItem(littleJessieGalleryStorageKey, JSON.stringify(nextGallery));
    if (!publishGalleryOnline) return;
    setGallerySaveMessage("Saving gallery changes online...");
    if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
    publishTimerRef.current = window.setTimeout(async () => {
      const published = await publishGalleryOnline(nextGallery);
      const cloudError = localStorage.getItem(littleJessieGalleryCloudErrorStorageKey);
      setGallerySaveMessage(published ? "Gallery changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
    }, 900);
  };

  const updateItem = (id, updates) => {
    saveGallery(gallery.map((item) => item.id === id ? { ...item, ...updates } : item));
  };

  const uploadImage = async (id, file) => {
    if (!file) return;
    setGallerySaveMessage("Uploading gallery image...");
    try {
      const image = await uploadImageToStorage("little-jessie/gallery", file);
      if (image) updateItem(id, { image });
    } catch (error) {
      console.error(error);
      localStorage.setItem(littleJessieGalleryCloudErrorStorageKey, error.message);
      setGallerySaveMessage("Saved on this browser only. Cloud publish failed: " + error.message);
    }
  };

  const uploadDraftImage = async (file) => {
    if (!file) return;
    setGallerySaveMessage("Uploading gallery image...");
    try {
      const image = await uploadImageToStorage("little-jessie/gallery", file);
      if (image) setDraft((current) => ({ ...current, image }));
      setGallerySaveMessage(image && (cloudinaryEnabled || backendEnabled) ? "Gallery image uploaded online." : "Gallery image ready.");
    } catch (error) {
      console.error(error);
      localStorage.setItem(littleJessieGalleryCloudErrorStorageKey, error.message);
      setGallerySaveMessage("Saved on this browser only. Cloud publish failed: " + error.message);
    }
  };

  const addGalleryItem = (event) => {
    event.preventDefault();
    const item = {
      id: "ljs-gallery-" + Date.now(),
      title: draft.title.trim(),
      detail: draft.detail.trim() || "Custom Little Jessie Studyo past work entry.",
      image: draft.image,
    };
    saveGallery([item, ...gallery]);
    setDraft(emptyDraft);
  };

  const removeItem = (id) => {
    if (!window.confirm("Remove this gallery item?")) return;
    const nextGallery = gallery.filter((item) => item.id !== id);
    saveGallery(nextGallery);
    if (publishGalleryOnline) {
      publishGalleryOnline(nextGallery, { removeMissing: true }).then((published) => {
        const cloudError = localStorage.getItem(littleJessieGalleryCloudErrorStorageKey);
        setGallerySaveMessage(published ? "Gallery changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
      });
    }
    setEditingId(null);
  };

  const resetGallery = () => {
    if (!window.confirm("Reset gallery to starter Little Jessie entries?")) return;
    localStorage.removeItem(littleJessieGalleryStorageKey);
    saveGallery(defaultLittleJessieGallery);
    if (publishGalleryOnline) {
      publishGalleryOnline(defaultLittleJessieGallery, { removeMissing: true }).then((published) => {
        const cloudError = localStorage.getItem(littleJessieGalleryCloudErrorStorageKey);
        setGallerySaveMessage(published ? "Gallery changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
      });
    }
    setEditingId(null);
  };

  return (
    <section id="little-jessie-gallery-admin" className="border-t border-pink-100 bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Little Jessie Gallery</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Past Works Management</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Upload real past-work photos and edit the gallery captions shown on the Little Jessie page.</p>
            {gallerySaveMessage && <p className="mt-3 w-fit border border-pink-100 bg-[#fff8fb] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-pink-700">{gallerySaveMessage}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={async () => {
              if (!publishGalleryOnline) return;
              setGallerySaveMessage("Publishing gallery changes online...");
              const published = await publishGalleryOnline(gallery, { removeMissing: true });
              const cloudError = localStorage.getItem(littleJessieGalleryCloudErrorStorageKey);
              setGallerySaveMessage(published ? "Gallery changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
            }} className="w-fit bg-stone-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-pink-600">Publish Gallery</button>
            <button type="button" onClick={resetGallery} className="w-fit border border-stone-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-stone-950 hover:text-white">Reset Gallery</button>
          </div>
        </div>

        <form onSubmit={addGalleryItem} className="mb-8 grid gap-4 border border-pink-100 bg-[#fff8fb] p-5 shadow-sm lg:grid-cols-4">
          <input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Gallery title" className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300" />
          <input value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} placeholder="Short caption" className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300 lg:col-span-2" />
          <input type="file" accept="image/*" onChange={(event) => uploadDraftImage(event.target.files?.[0])} className="min-w-0 border border-stone-200 bg-white px-4 py-3 text-sm" />
          <button type="submit" className="bg-stone-950 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-pink-600">Add Gallery Item</button>
        </form>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <article key={item.id} className="border border-pink-100 bg-[#fff8fb] p-4 shadow-sm">
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-white text-center text-sm font-semibold text-pink-500">
                  {item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-contain bg-white p-2" /> : "No image yet"}
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p>
                  </div>
                  <button type="button" onClick={() => setEditingId(isEditing ? null : item.id)} className="grid h-9 w-9 shrink-0 place-items-center border border-stone-200 text-base font-bold transition hover:border-pink-300 hover:text-pink-600">{isEditing ? "×" : "✎"}</button>
                </div>
                {isEditing && (
                  <div className="mt-4 grid gap-3 border-t border-pink-100 pt-4">
                    <input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm outline-none focus:border-pink-300" />
                    <textarea value={item.detail} onChange={(event) => updateItem(item.id, { detail: event.target.value })} className="min-h-20 border border-stone-200 px-3 py-2 text-sm outline-none focus:border-pink-300" />
                    <input type="file" accept="image/*" onChange={(event) => uploadImage(item.id, event.target.files?.[0])} className="border border-stone-200 bg-white px-3 py-2 text-sm" />
                    <button type="button" onClick={() => removeItem(item.id)} className="border border-red-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-600 hover:text-white">Remove</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LittleJessieAdminPanel({ products, setProducts, publishProductsOnline }) {
  const emptyDraft = { name: "", description: "", price: "", discount: "0", status: "Made to Order", image: "", available: true };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [productSaveMessage, setProductSaveMessage] = useState("");
  const publishTimerRef = useRef(null);
  const [inquiries, setInquiries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(littleJessieInquiryStorageKey)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    return () => {
      if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
    };
  }, []);

  const saveProducts = (nextProducts) => {
    setProducts(nextProducts);
    localStorage.setItem(littleJessieProductStorageKey, JSON.stringify(nextProducts));
    if (!publishProductsOnline) return;
    setProductSaveMessage("Saving Little Jessie changes online...");
    if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
    publishTimerRef.current = window.setTimeout(async () => {
      const published = await publishProductsOnline(nextProducts);
      const cloudError = localStorage.getItem(littleJessieCloudErrorStorageKey);
      setProductSaveMessage(published ? "Little Jessie changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
    }, 900);
  };

  const updateProduct = (id, updates) => {
    saveProducts(products.map((product) => product.id === id ? { ...product, ...updates } : product));
  };

  const uploadImage = async (id, file) => {
    if (!file) return;
    setProductSaveMessage("Uploading product image...");
    try {
      const image = await uploadImageToStorage("little-jessie/products", file);
      if (image) {
        const nextProducts = products.map((product) => product.id === id ? { ...product, image } : product);
        saveProducts(nextProducts);
        if (publishProductsOnline) {
          setProductSaveMessage("Publishing product image online...");
          const published = await publishProductsOnline(nextProducts);
          const cloudError = localStorage.getItem(littleJessieCloudErrorStorageKey);
          setProductSaveMessage(published ? "Product image is live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
        }
      }
    } catch (error) {
      console.error(error);
      localStorage.setItem(littleJessieCloudErrorStorageKey, error.message);
      setProductSaveMessage("Saved on this browser only. Cloud publish failed: " + error.message);
    }
  };

  const uploadDraftImage = async (file) => {
    if (!file) return;
    setProductSaveMessage("Uploading product image...");
    try {
      const image = await uploadImageToStorage("little-jessie/products", file);
      if (image) setDraft((current) => ({ ...current, image }));
      setProductSaveMessage(image && (cloudinaryEnabled || backendEnabled) ? "Product image uploaded online." : "Product image ready.");
    } catch (error) {
      console.error(error);
      localStorage.setItem(littleJessieCloudErrorStorageKey, error.message);
      setProductSaveMessage("Saved on this browser only. Cloud publish failed: " + error.message);
    }
  };

  const addProduct = (event) => {
    event.preventDefault();
    const product = {
      id: "ljs-" + Date.now(),
      name: draft.name.trim(),
      description: draft.description.trim() || "Personalized Little Jessie Studyo item.",
      price: Number(draft.price || 0),
      discount: Number(draft.discount || 0),
      status: draft.status,
      image: draft.image,
      available: draft.available === true || draft.available === "true",
    };
    saveProducts([product, ...products]);
    setDraft(emptyDraft);
  };

  const removeProduct = (id) => {
    if (!window.confirm("Remove this Little Jessie product?")) return;
    const nextProducts = products.filter((product) => product.id !== id);
    saveProducts(nextProducts);
    if (publishProductsOnline) {
      publishProductsOnline(nextProducts, { removeMissing: true }).then((published) => {
        const cloudError = localStorage.getItem(littleJessieCloudErrorStorageKey);
        setProductSaveMessage(published ? "Little Jessie changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
      });
    }
    setEditingId(null);
  };

  const resetProducts = () => {
    if (!window.confirm("Reset Little Jessie products to the starter menu?")) return;
    localStorage.removeItem(littleJessieProductStorageKey);
    saveProducts(defaultLittleJessieProducts);
    if (publishProductsOnline) {
      publishProductsOnline(defaultLittleJessieProducts, { removeMissing: true }).then((published) => {
        const cloudError = localStorage.getItem(littleJessieCloudErrorStorageKey);
        setProductSaveMessage(published ? "Little Jessie changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
      });
    }
    setEditingId(null);
  };

  const updateInquiry = (id, updates) => {
    const nextInquiries = inquiries.map((inquiry) => inquiry.id === id ? { ...inquiry, ...updates, updatedAt: new Date().toISOString() } : inquiry);
    setInquiries(nextInquiries);
    localStorage.setItem(littleJessieInquiryStorageKey, JSON.stringify(nextInquiries));
  };

  const clearInquiries = () => {
    if (!window.confirm("Clear all Little Jessie inquiries from this browser?")) return;
    setInquiries([]);
    localStorage.removeItem(littleJessieInquiryStorageKey);
  };

  return (
    <section id="little-jessie-admin" className="border-t border-pink-100 bg-[#fff8fb] py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Little Jessie Studyo Admin</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Products and Inquiries</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Manage Little Jessie products, photos, prices, discounts, availability, and customer inquiries.</p>
            {productSaveMessage && <p className="mt-3 w-fit border border-pink-100 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-pink-700">{productSaveMessage}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={async () => {
              if (!publishProductsOnline) return;
              setProductSaveMessage("Publishing Little Jessie changes online...");
              const published = await publishProductsOnline(products, { removeMissing: true });
              const cloudError = localStorage.getItem(littleJessieCloudErrorStorageKey);
              setProductSaveMessage(published ? "Little Jessie changes are live online." : "Saved on this browser only. Cloud publish failed: " + (cloudError || "Please check Supabase setup."));
            }} className="w-fit bg-stone-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-pink-600">Publish Products</button>
            <button type="button" onClick={resetProducts} className="w-fit border border-stone-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-stone-950 hover:text-white">Reset Little Jessie Products</button>
          </div>
        </div>

        <form onSubmit={addProduct} className="mb-8 grid gap-4 border border-pink-100 bg-white p-5 shadow-sm lg:grid-cols-4">
          <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Product name" className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300" />
          <input type="number" min="0" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="Price, 0 for quote" className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300" />
          <select value={draft.discount} onChange={(event) => setDraft({ ...draft, discount: event.target.value })} className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300">
            {discountOptions.map((discount) => <option key={discount} value={discount}>{discount}% discount</option>)}
          </select>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300">
            <option>Made to Order</option>
            <option>Ready to Ship</option>
          </select>
          <select value={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.value })} className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300">
            <option value="true">Visible / Available</option>
            <option value="false">Hidden / Unavailable</option>
          </select>
          <input value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} placeholder="Cloudinary image URL" className="min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300 lg:col-span-2" />
          <input type="file" accept="image/*" onChange={(event) => uploadDraftImage(event.target.files?.[0])} className="min-w-0 border border-stone-200 bg-white px-4 py-3 text-sm" />
          <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Product description" className="min-h-24 min-w-0 border border-stone-200 px-4 py-3 outline-none focus:border-pink-300 lg:col-span-2" />
          <button type="submit" className="bg-stone-950 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-pink-600">Add Product</button>
        </form>

        <div className="grid gap-4">
          {products.map((product) => {
            const isEditing = editingId === product.id;
            const hasDiscount = Number(product.discount || 0) > 0 && Number(product.price || 0) > 0;
            return (
              <article key={product.id} className="border border-pink-100 bg-white p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-[92px_1fr_auto] sm:items-center">
                  <div className="flex h-28 items-center justify-center overflow-hidden bg-[#fff1f6] text-xs font-semibold text-pink-500">{product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain bg-white p-2" /> : "No image"}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-pink-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pink-600">{getAvailabilityText(product)}</span>
                      {product.available === false && <span className="border border-stone-200 bg-stone-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Hidden</span>}
                      {hasDiscount && <span className="bg-pink-500 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">-{product.discount}%</span>}
                    </div>
                    <h3 className="mt-2 text-lg font-bold">{product.name}</h3>
                    <p className="mt-1 text-sm text-stone-500">{getPriceLabel(product)}</p>
                  </div>
                  <button type="button" onClick={() => setEditingId(isEditing ? null : product.id)} className="grid h-11 w-11 place-items-center border border-stone-200 text-lg font-bold transition hover:border-pink-300 hover:text-pink-600">{isEditing ? "×" : "✎"}</button>
                </div>

                {isEditing && (
                  <div className="mt-5 border-t border-stone-100 pt-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Product Name<input value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300" /></label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Price<input type="number" min="0" value={product.price || 0} onChange={(event) => updateProduct(product.id, { price: Number(event.target.value) })} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300" /></label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Discount<select value={product.discount || 0} onChange={(event) => updateProduct(product.id, { discount: Number(event.target.value) })} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300">{discountOptions.map((discount) => <option key={discount} value={discount}>{discount}%</option>)}</select></label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Status<select value={product.status || "Made to Order"} onChange={(event) => updateProduct(product.id, { status: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300"><option>Made to Order</option><option>Ready to Ship</option></select></label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Availability<select value={String(product.available !== false)} onChange={(event) => updateProduct(product.id, { available: event.target.value === "true" })} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300"><option value="true">Visible / Available</option><option value="false">Hidden / Unavailable</option></select></label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500 md:col-span-2">Cloudinary Image URL<input value={String(product.image || "").startsWith("data:") ? "" : product.image || ""} onChange={(event) => updateProduct(product.id, { image: event.target.value })} placeholder="Paste secure_url from Cloudinary" className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300" /></label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500 md:col-span-2">Product Photo<input type="file" accept="image/*" onChange={(event) => uploadImage(product.id, event.target.files?.[0])} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label>
                    </div>
                    <label className="mt-4 grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Product Description<textarea value={product.description || ""} onChange={(event) => updateProduct(product.id, { description: event.target.value })} className="min-h-24 border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300" /></label>
                    <button type="button" onClick={() => removeProduct(product.id)} className="mt-4 border border-red-200 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-600 hover:text-white">Remove Product</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-12">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-pink-500">Customer Inquiries</p>
              <h3 className="mt-2 text-2xl font-bold">Little Jessie Order Requests</h3>
            </div>
            {inquiries.length > 0 && <button type="button" onClick={clearInquiries} className="w-fit border border-stone-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition hover:bg-stone-950 hover:text-white">Clear Inquiries</button>}
          </div>
          {inquiries.length === 0 ? (
            <div className="border border-pink-100 bg-white p-6 text-center text-sm text-stone-600">No Little Jessie inquiries yet.</div>
          ) : (
            <div className="grid gap-4">
              {inquiries.map((inquiry) => (
                <article key={inquiry.id} className="border border-pink-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">{inquiry.id}</p>
                      <h4 className="mt-2 text-lg font-bold">{inquiry.customer?.fullName || inquiry.fullName}</h4>
                      <p className="mt-1 text-sm text-stone-500">{formatOrderDate(inquiry.createdAt)}</p>
                    </div>
                    <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-stone-500 md:w-56">Status<select value={inquiry.status || "New inquiry"} onChange={(event) => updateInquiry(inquiry.id, { status: event.target.value })} className="border border-stone-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-stone-950 outline-none focus:border-pink-300"><option>New inquiry</option><option>For quote</option><option>Confirmed</option><option>In production</option><option>Ready</option><option>Completed</option><option>Cancelled</option></select></label>
                  </div>
                  <div className="mt-4 grid gap-4 text-sm leading-6 text-stone-600 lg:grid-cols-3">
                    <div><p className="font-bold text-stone-950">Customer</p><p>{inquiry.customer?.mobile}</p><p>{inquiry.customer?.email}</p><p>{inquiry.paymentMethod}</p>{inquiry.paymentReceipt && <img src={inquiry.paymentReceipt} alt="Payment receipt" className="mt-3 h-24 w-24 object-cover" />}</div>
                    <div><p className="font-bold text-stone-950">Shipping Address</p><p>{inquiry.address}</p></div>
                    <div><p className="font-bold text-stone-950">Order</p><p>{inquiry.order?.productType} · Qty {inquiry.order?.quantity}</p><p>Needed: {inquiry.order?.neededDate || "Not set"}</p><p>Theme: {inquiry.order?.theme}</p><p>Colors: {inquiry.order?.colorPalette}</p></div>
                  </div>
                  {inquiry.order?.details && <p className="mt-4 border-t border-stone-100 pt-4 text-sm leading-6 text-stone-600"><span className="font-bold text-stone-950">Instructions:</span> {inquiry.order.details}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminPaymentRecords({ orders }) {
  const [littleJessieInquiries, setLittleJessieInquiries] = useState(() => {
    try { return JSON.parse(localStorage.getItem(littleJessieInquiryStorageKey)) || []; } catch { return []; }
  });
  const [rentalBookings, setRentalBookings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(littleJessieRentalStorageKey)) || []; } catch { return []; }
  });
  const [selectedIncomeMonth, setSelectedIncomeMonth] = useState("All");

  const getIncomeMonth = (record) => String(record.paymentReceivedAt || record.fullPaymentSubmittedAt || record.updatedAt || record.createdAt || new Date().toISOString()).slice(0, 7);
  const formatIncomeMonth = (monthKey) => {
    if (monthKey === "All") return "All Months";
    const [year, month] = monthKey.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const paidTgsOrders = orders.filter((order) => order.paymentChecked || order.status === "Paid" || order.status === "Preparing" || order.status === "Completed");
  const tgsTotalIncome = paidTgsOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const paidLittleJessieInquiries = littleJessieInquiries.filter((inquiry) => inquiry.paymentChecked || inquiry.status === "Confirmed" || inquiry.status === "Completed");
  const paidRentalBookings = rentalBookings.filter((booking) => booking.fullPaymentReceived || booking.status === "Full Payment Receive" || booking.status === "Confirmed" || booking.status === "Completed");
  const incomeRecords = [
    ...paidTgsOrders.map((order) => ({ id: order.reference, brand: "TGS Bags", month: getIncomeMonth(order), amount: Number(order.total || 0) })),
    ...paidLittleJessieInquiries.map((inquiry) => ({ id: inquiry.id, brand: "Little Jessie Studyo", month: getIncomeMonth(inquiry), amount: Number(inquiry.totalDue || 0) })),
    ...paidRentalBookings.map((booking) => ({ id: booking.id, brand: "Little Jessie Studyo", month: getIncomeMonth(booking), amount: Number(booking.totalDue || 0) })),
  ];
  const availableIncomeMonths = ["All", ...Array.from(new Set(incomeRecords.map((record) => record.month))).sort().reverse()];
  const visibleIncomeRecords = selectedIncomeMonth === "All" ? incomeRecords : incomeRecords.filter((record) => record.month === selectedIncomeMonth);
  const selectedTgsIncome = visibleIncomeRecords.filter((record) => record.brand === "TGS Bags").reduce((sum, record) => sum + record.amount, 0);
  const selectedLittleJessieIncome = visibleIncomeRecords.filter((record) => record.brand === "Little Jessie Studyo").reduce((sum, record) => sum + record.amount, 0);
  const selectedTotalIncome = selectedTgsIncome + selectedLittleJessieIncome;
  const buildBrandMonthlyBreakdown = (brand) => Array.from(new Set(incomeRecords.filter((record) => record.brand === brand).map((record) => record.month))).sort().reverse().map((month) => {
    const monthRecords = incomeRecords.filter((record) => record.brand === brand && record.month === month);
    return { month, total: monthRecords.reduce((sum, record) => sum + record.amount, 0), count: monthRecords.length };
  });
  const tgsMonthlyBreakdown = buildBrandMonthlyBreakdown("TGS Bags");
  const littleJessieMonthlyBreakdown = buildBrandMonthlyBreakdown("Little Jessie Studyo");
  const weakestTgsMonth = tgsMonthlyBreakdown.length ? tgsMonthlyBreakdown.reduce((weakest, month) => month.total < weakest.total ? month : weakest, tgsMonthlyBreakdown[0]) : null;
  const weakestLittleJessieMonth = littleJessieMonthlyBreakdown.length ? littleJessieMonthlyBreakdown.reduce((weakest, month) => month.total < weakest.total ? month : weakest, littleJessieMonthlyBreakdown[0]) : null;
  const littleJessieInquiryIncome = paidLittleJessieInquiries.reduce((sum, inquiry) => sum + Number(inquiry.totalDue || 0), 0);
  const littleJessieRentalIncome = paidRentalBookings.reduce((sum, booking) => sum + Number(booking.totalDue || 0), 0);
  const littleJessieTotalIncome = littleJessieInquiryIncome + littleJessieRentalIncome;

  const updateInquiryPayment = (id, checked) => {
    const next = littleJessieInquiries.map((inquiry) => inquiry.id === id ? { ...inquiry, paymentChecked: checked, paymentReceivedAt: checked ? new Date().toISOString() : inquiry.paymentReceivedAt, status: checked ? "Confirmed" : inquiry.status } : inquiry);
    setLittleJessieInquiries(next);
    localStorage.setItem(littleJessieInquiryStorageKey, JSON.stringify(next));
  };

  const updateRentalPayment = (id, checked) => {
    const next = rentalBookings.map((booking) => booking.id === id ? { ...booking, fullPaymentReceived: checked, paymentReceivedAt: checked ? new Date().toISOString() : booking.paymentReceivedAt, status: checked ? "Full Payment Receive" : booking.status } : booking);
    setRentalBookings(next);
    localStorage.setItem(littleJessieRentalStorageKey, JSON.stringify(next));
  };

  return (
    <section id="payment-records" className="border-t border-[#ead9a8]/70 bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Admin Only</p>
          <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Payment Records and Income</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Separate payment records for TGS Bags and Little Jessie Studyo. Totals are based on payments marked received or confirmed.</p>
        </div>

        <div className="mb-6 grid gap-4 border border-neutral-200 bg-neutral-50 p-5 lg:grid-cols-[1fr_220px] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Monthly Income View</p>
            <h3 className="mt-2 text-2xl font-bold">{formatIncomeMonth(selectedIncomeMonth)}</h3>
            <p className="mt-2 text-sm text-neutral-600">Use this to check which month is strong or weak across the businesses.</p>
          </div>
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">Choose Month
            <select value={selectedIncomeMonth} onChange={(event) => setSelectedIncomeMonth(event.target.value)} className="border border-neutral-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]">
              {availableIncomeMonths.map((month) => <option key={month} value={month}>{formatIncomeMonth(month)}</option>)}
            </select>
          </label>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="border border-[#ead9a8]/70 bg-[#fff9ed] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b78a1f]">TGS Bags</p><p className="mt-2 text-2xl font-bold">{formatCurrency(selectedTgsIncome)}</p></div>
          <div className="border border-pink-100 bg-[#fff8fb] p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-pink-500">Little Jessie</p><p className="mt-2 text-2xl font-bold">{formatCurrency(selectedLittleJessieIncome)}</p></div>
          <div className="border border-neutral-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Combined Total</p><p className="mt-2 text-2xl font-bold">{formatCurrency(selectedTotalIncome)}</p></div>
        </div>

        <div className="mb-8 grid gap-5 lg:grid-cols-2">
          <div className="border border-[#ead9a8]/70 bg-[#fff9ed] p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b78a1f]">TGS Bags</p><h3 className="mt-2 text-xl font-bold">Monthly Income</h3></div>
              {weakestTgsMonth && <p className="text-sm font-semibold text-red-600">Weakest: {formatIncomeMonth(weakestTgsMonth.month)} ({formatCurrency(weakestTgsMonth.total)})</p>}
            </div>
            <div className="mt-4 grid gap-2">
              {tgsMonthlyBreakdown.length === 0 ? <p className="text-sm text-neutral-600">No paid TGS records yet.</p> : tgsMonthlyBreakdown.map((month) => (
                <div key={month.month} className={(weakestTgsMonth?.month === month.month ? "border-red-200 bg-red-50" : "border-[#ead9a8]/70 bg-white") + " grid gap-2 border p-3 text-sm sm:grid-cols-3 sm:items-center"}>
                  <p className="font-bold">{formatIncomeMonth(month.month)}</p>
                  <p>{month.count} paid order(s)</p>
                  <p className="font-bold">{formatCurrency(month.total)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-pink-100 bg-[#fff8fb] p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Little Jessie</p><h3 className="mt-2 text-xl font-bold">Monthly Income</h3></div>
              {weakestLittleJessieMonth && <p className="text-sm font-semibold text-red-600">Weakest: {formatIncomeMonth(weakestLittleJessieMonth.month)} ({formatCurrency(weakestLittleJessieMonth.total)})</p>}
            </div>
            <div className="mt-4 grid gap-2">
              {littleJessieMonthlyBreakdown.length === 0 ? <p className="text-sm text-stone-600">No paid Little Jessie records yet.</p> : littleJessieMonthlyBreakdown.map((month) => (
                <div key={month.month} className={(weakestLittleJessieMonth?.month === month.month ? "border-red-200 bg-red-50" : "border-pink-100 bg-white") + " grid gap-2 border p-3 text-sm sm:grid-cols-3 sm:items-center"}>
                  <p className="font-bold">{formatIncomeMonth(month.month)}</p>
                  <p>{month.count} paid record(s)</p>
                  <p className="font-bold">{formatCurrency(month.total)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="border border-[#ead9a8]/70 bg-[#fff9ed] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b78a1f]">TGS Bags Income</p>
            <p className="mt-3 text-3xl font-bold">{formatCurrency(tgsTotalIncome)}</p>
            <p className="mt-1 text-sm text-neutral-600">{paidTgsOrders.length} paid order(s)</p>
            <div className="mt-5 grid gap-3">
              {orders.length === 0 ? <p className="text-sm text-neutral-600">No TGS orders yet.</p> : orders.map((order) => (
                <article key={order.reference} className="border border-[#ead9a8]/70 bg-white p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b78a1f]">{order.reference}</p><p className="mt-1 font-bold">{order.buyer?.fullName}</p><p className="text-sm text-neutral-600">{order.paymentMethod} · {formatCurrency(order.total || 0)}</p></div>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">{order.paymentChecked ? "Payment received" : "Awaiting payment"}</span>
                  </div>
                  {order.paymentReceipt && <img src={order.paymentReceipt} alt="TGS payment receipt" className="mt-3 h-24 w-24 object-cover" />}
                </article>
              ))}
            </div>
          </div>

          <div className="border border-pink-100 bg-[#fff8fb] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Little Jessie Income</p>
            <p className="mt-3 text-3xl font-bold">{formatCurrency(littleJessieTotalIncome)}</p>
            <p className="mt-1 text-sm text-stone-600">{paidLittleJessieInquiries.length + paidRentalBookings.length} paid record(s)</p>
            <div className="mt-5 grid gap-3">
              {[...littleJessieInquiries.map((item) => ({ ...item, recordType: "Product Inquiry", amount: item.totalDue || 0 })), ...rentalBookings.map((item) => ({ ...item, recordType: "Rental Booking", amount: item.totalDue || 0 }))].length === 0 ? <p className="text-sm text-stone-600">No Little Jessie payment records yet.</p> : [...littleJessieInquiries.map((item) => ({ ...item, recordType: "Product Inquiry", amount: item.totalDue || 0 })), ...rentalBookings.map((item) => ({ ...item, recordType: "Rental Booking", amount: item.totalDue || 0 }))].map((record) => (
                <article key={record.id} className="border border-pink-100 bg-white p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-pink-500">{record.recordType}</p><p className="mt-1 font-bold">{record.customer?.fullName || record.fullName}</p>{record.reservationCode && <p className="text-sm font-semibold text-pink-700">Reservation Code: {record.reservationCode}</p>}<p className="text-sm text-stone-600">{record.paymentMethod} · {record.amount ? formatCurrency(record.amount) : "For quotation"}</p></div>
                    {record.recordType === "Product Inquiry" ? <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(record.paymentChecked)} onChange={(event) => updateInquiryPayment(record.id, event.target.checked)} /> Payment received</label> : <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(record.fullPaymentReceived)} onChange={(event) => updateRentalPayment(record.id, event.target.checked)} /> Full payment</label>}
                  </div>
                  {(record.paymentReceipt || record.fullPaymentReceipt || record.referencePhoto) && <div className="mt-3 flex flex-wrap gap-3">{record.paymentReceipt && <img src={record.paymentReceipt} alt="Little Jessie payment receipt" className="h-24 w-24 object-cover" />}{record.fullPaymentReceipt && <img src={record.fullPaymentReceipt} alt="Little Jessie full payment receipt" className="h-24 w-24 object-cover" />}{record.referencePhoto && <img src={record.referencePhoto} alt="Reference" className="h-24 w-24 object-cover" />}</div>}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminDashboard({ orders, setOrders, productsCatalog, setProductsCatalog, publishTgsProducts, littleJessieProducts, setLittleJessieProducts, publishLittleJessieProducts, littleJessieGallery, setLittleJessieGallery, publishLittleJessieGallery, onLogout }) {
  return (
    <div id="admin">
      <section className="border-t border-[#ead9a8]/70 bg-neutral-950 py-8 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-4 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8bd6a]">Admin Dashboard</p>
            <h2 className="mt-2 font-serif text-3xl font-bold">The Grace Shop Control Room</h2>
          </div>
          <button type="button" onClick={onLogout} className="w-fit border border-white/30 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-neutral-950">Logout</button>
        </div>
      </section>
      <AdminPaymentRecords orders={orders} />
      <AdminOrdersPanel orders={orders} setOrders={setOrders} />
      <AdminPanel productsCatalog={productsCatalog} setProductsCatalog={setProductsCatalog} publishProductsOnline={publishTgsProducts} />
      <LittleJessieAdminPanel products={littleJessieProducts} setProducts={setLittleJessieProducts} publishProductsOnline={publishLittleJessieProducts} />
      <LittleJessieRentalScheduleAdminPanel />
      <LittleJessieRentalAdminPanel />
      <LittleJessieGalleryAdmin gallery={littleJessieGallery} setGallery={setLittleJessieGallery} publishGalleryOnline={publishLittleJessieGallery} />
    </div>
  );
}

function AdminOrdersPanel({ orders, setOrders }) {
  const [orderFilter, setOrderFilter] = useState("All");
  const filterOptions = ["All", "Awaiting Payment", "Payment Received", "Preparing", "Shipped", "Completed", "Cancelled"];

  const updateOrder = (reference, updates) => {
    setOrders((current) => current.map((order) => order.reference === reference ? { ...order, ...updates, updatedAt: new Date().toISOString() } : order));
  };

  const markPaymentReceived = (reference) => {
    updateOrder(reference, { paymentChecked: true, status: "Preparing" });
  };

  const clearOrders = () => {
    if (!window.confirm("Clear all saved orders from this browser?")) return;
    setOrders([]);
  };

  const visibleOrders = orders.filter((order) => {
    if (orderFilter === "All") return true;
    if (orderFilter === "Awaiting Payment") return !order.paymentChecked && order.status === "Pending";
    if (orderFilter === "Payment Received") return Boolean(order.paymentChecked);
    return order.status === orderFilter;
  });

  return (
    <section id="orders" className="border-t border-[#ead9a8]/70 bg-[#fff9ed] py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Admin Orders</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Customer Orders</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Use the payment tabs to review orders. When payment is received, mark it and the buyer tracking update will show “Preparing to ship.”</p>
          </div>
          {orders.length > 0 && <button type="button" onClick={clearOrders} className="w-fit border border-neutral-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-neutral-950 hover:text-white">Clear Orders</button>}
        </div>

        {orders.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {filterOptions.map((option) => (
              <button key={option} type="button" onClick={() => setOrderFilter(option)} className={"shrink-0 border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition " + (orderFilter === option ? "border-[#b78a1f] bg-[#b78a1f] text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#b78a1f]")}>{option}</button>
            ))}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="border border-[#ead9a8]/70 bg-white p-8 text-center shadow-[0_18px_45px_rgba(17,17,17,0.06)]">
            <p className="text-lg font-bold">No orders yet.</p>
            <p className="mt-2 text-sm text-neutral-600">New checkout orders will appear here with buyer details, items, payment method, and status.</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="border border-[#ead9a8]/70 bg-white p-8 text-center shadow-[0_18px_45px_rgba(17,17,17,0.06)]">
            <p className="text-lg font-bold">No orders in this tab.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {visibleOrders.map((order) => (
              <article key={order.reference} className="border border-[#ead9a8]/70 bg-white p-5 shadow-[0_18px_45px_rgba(17,17,17,0.06)]">
                <div className="flex flex-col justify-between gap-4 border-b border-neutral-100 pb-4 lg:flex-row lg:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b78a1f]">{order.reference}</p>
                    <h3 className="mt-2 text-xl font-bold">{order.buyer.fullName}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{formatOrderDate(order.createdAt)}</p>
                    <p className="mt-2 text-sm font-semibold text-neutral-700">{getOrderStatusMessage(order)}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:w-[460px]">
                    <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                      Status
                      <select value={order.status} onChange={(event) => updateOrder(order.reference, { status: event.target.value })} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]">
                        {orderStatuses.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                    <div className="grid gap-2">
                      <label className="flex items-center gap-3 border border-neutral-200 px-3 py-2 text-sm font-semibold">
                        <input type="checkbox" checked={Boolean(order.paymentChecked)} onChange={(event) => updateOrder(order.reference, { paymentChecked: event.target.checked, status: event.target.checked ? "Preparing" : "Pending" })} />
                        Payment received
                      </label>
                      <button type="button" onClick={() => markPaymentReceived(order.reference)} disabled={Boolean(order.paymentChecked)} className="border border-neutral-950 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition hover:bg-neutral-950 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300">Mark Payment Received</button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_260px]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Buyer Information</p>
                    <div className="mt-3 grid gap-1 text-sm leading-6 text-neutral-600">
                      <p><span className="font-semibold text-neutral-950">Phone:</span> {order.buyer.phone}</p>
                      <p><span className="font-semibold text-neutral-950">Email:</span> {order.buyer.email}</p>
                      <p><span className="font-semibold text-neutral-950">Payment:</span> {order.paymentMethod}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Delivery Address</p>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">{order.address}</p>
                    {order.notes && <p className="mt-2 text-sm leading-6 text-neutral-600"><span className="font-semibold text-neutral-950">Notes:</span> {order.notes}</p>}
                    {order.paymentReceipt && <img src={order.paymentReceipt} alt="Payment receipt" className="mt-3 h-28 w-28 object-cover" />}
                  </div>

                  <div className="border border-[#ead9a8]/70 bg-[#fff9ed] p-3 sm:p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Total</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(order.total)}</p>
                    <p className="mt-1 text-sm text-neutral-600">Subtotal {formatCurrency(order.subtotal)}</p>
                    <p className="text-sm text-neutral-600">Delivery {formatCurrency(order.deliveryFee)}</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-neutral-100 pt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Items Ordered</p>
                  <div className="mt-3 grid gap-3">
                    {order.items.map((item) => (
                      <div key={(item.cartKey || item.id) + item.selectedColor} className="flex items-center gap-3 border border-neutral-100 p-3">
                        <img src={item.image} alt={item.name} className="h-16 w-16 object-cover" />
                        <div className="flex-1">
                          <p className="text-sm font-bold">{item.name}</p>
                          <p className="mt-1 text-xs text-neutral-500">Color: {item.selectedColor || getDefaultColor(item)} · Qty {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold">{formatCurrency(getDiscountedPrice(item) * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AdminColorManager({ product, onAddColor, onRemoveColor }) {
  const [newColor, setNewColor] = useState("");
  const colors = getProductColors(product);

  const submitColor = (event) => {
    event.preventDefault();
    const color = newColor.trim();
    if (!color) return;
    onAddColor(product.id, color);
    setNewColor("");
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <span key={color} className="inline-flex items-center gap-2 border border-[#ead9a8] bg-[#fff9ed] px-3 py-2 text-sm font-semibold text-neutral-800">
            {color}
            <button type="button" onClick={() => onRemoveColor(product.id, color)} disabled={colors.length <= 1} title={colors.length <= 1 ? "Keep at least one color" : "Remove color"} className="grid h-5 w-5 place-items-center border border-neutral-300 text-xs font-bold leading-none transition hover:border-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300">
              ×
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={submitColor} className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input value={newColor} onChange={(event) => setNewColor(event.target.value)} placeholder="Add color, ex. Mocha" className="min-w-0 border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
        <button type="submit" className="border border-neutral-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition hover:bg-neutral-950 hover:text-white">Add Color</button>
      </form>
    </div>
  );
}

function AdminPanel({ productsCatalog, setProductsCatalog, publishProductsOnline }) {
  const emptyDraft = {
    name: "",
    category: "Tote Bags",
    price: "",
    stock: "1",
    discount: "0",
    colors: "",
    description: "",
    details: "",
    size: "",
    material: "",
    strap: "",
    closure: "",
    care: "",
    image: "",
    available: true,
  };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState(null);
  const [productSaveMessage, setProductSaveMessage] = useState("");
  const publishTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
    };
  }, []);

  const parseList = (value) =>
    value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

  const colorsToText = (product) => getProductColors(product).join(", ");
  const detailsToText = (product) => (Array.isArray(product.details) ? product.details : []).join("\n");

  const saveProducts = (nextProducts) => {
    setProductsCatalog(nextProducts);
    localStorage.setItem(productStorageKey, JSON.stringify(nextProducts));
    if (!publishProductsOnline) return;
    setProductSaveMessage("Saving bag changes online...");
    if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
    publishTimerRef.current = window.setTimeout(async () => {
      const published = await publishProductsOnline(nextProducts);
      setProductSaveMessage(published ? "Bag changes are live online." : "Saved on this browser only. Cloud publish needs checking.");
    }, 900);
  };

  const updateProduct = (id, updates) => {
    saveProducts(productsCatalog.map((product) => product.id === id ? { ...product, ...updates } : product));
  };

  const updateProductField = (id, field, value) => {
    if (field === "colors") {
      const colors = parseList(value);
      updateProduct(id, { colors, color: colors.join(", ") || "Custom" });
      return;
    }

    if (field === "details") {
      updateProduct(id, { details: parseList(value) });
      return;
    }

    if (["price", "stock", "discount"].includes(field)) {
      updateProduct(id, { [field]: Number(value) });
      return;
    }

    updateProduct(id, { [field]: value });
  };

  const addColorToProduct = (id, color) => {
    const product = productsCatalog.find((item) => item.id === id);
    if (!product) return;
    const colors = getProductColors(product);
    if (colors.some((item) => item.toLowerCase() === color.toLowerCase())) return;
    const nextColors = [...colors, color];
    updateProduct(id, { colors: nextColors, color: nextColors.join(", ") });
  };

  const removeColorFromProduct = (id, color) => {
    const product = productsCatalog.find((item) => item.id === id);
    if (!product) return;
    const nextColors = getProductColors(product).filter((item) => item !== color);
    if (!nextColors.length) return;
    updateProduct(id, { colors: nextColors, color: nextColors.join(", ") });
  };

  const updateProductSpec = (id, key, value) => {
    const product = productsCatalog.find((item) => item.id === id);
    if (!product) return;
    updateProduct(id, { specs: { ...getProductSpecs(product), [key]: value } });
  };

  const uploadImage = async (id, file) => {
    if (!file) return;
    setProductSaveMessage("Uploading bag image...");
    try {
      const image = await uploadImageToStorage("tgs/products", file);
      if (image) {
        const nextProducts = productsCatalog.map((product) => product.id === id ? { ...product, image } : product);
        saveProducts(nextProducts);
        if (publishProductsOnline) {
          setProductSaveMessage("Publishing bag image online...");
          const published = await publishProductsOnline(nextProducts);
          setProductSaveMessage(published ? "Bag image is live online." : "Saved on this browser only. Cloud publish needs checking.");
        }
      }
    } catch (error) {
      console.error(error);
      setProductSaveMessage("Saved on this browser only. Cloud image upload failed: " + error.message);
    }
  };

  const uploadDraftImage = async (file) => {
    if (!file) return;
    setProductSaveMessage("Uploading bag image...");
    try {
      const image = await uploadImageToStorage("tgs/products", file);
      if (image) setDraft((current) => ({ ...current, image }));
      setProductSaveMessage(image && (cloudinaryEnabled || backendEnabled) ? "Bag image uploaded online." : "Bag image ready.");
    } catch (error) {
      console.error(error);
      setProductSaveMessage("Saved on this browser only. Cloud image upload failed: " + error.message);
    }
  };

  const addProduct = (event) => {
    event.preventDefault();
    const colors = parseList(draft.colors || "Custom");
    const details = parseList(draft.details || "Graceful everyday carry, Stock and discount can be edited, Premium product photo ready for upload");
    const product = {
      id: "tgs-" + Date.now(),
      name: draft.name.trim(),
      category: draft.category,
      price: Number(draft.price),
      stock: Number(draft.stock),
      discount: Number(draft.discount),
      featured: false,
      color: colors.join(", ") || "Custom",
      colors,
      description: draft.description.trim() || "A Grace Shop bag with polished everyday styling.",
      details,
      specs: {
        size: draft.size.trim() || "Compact everyday size",
        material: draft.material.trim() || "Premium faux leather",
        strap: draft.strap.trim() || "Comfortable hand or shoulder carry",
        closure: draft.closure.trim() || "Secure main compartment",
        care: draft.care.trim() || "Wipe gently with a soft dry cloth",
      },
      image: draft.image || "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80",
      available: draft.available === true || draft.available === "true",
    };
    saveProducts([product, ...productsCatalog]);
    setDraft(emptyDraft);
  };

  const removeProduct = (id) => {
    if (!window.confirm("Remove this product from TGS?")) return;
    saveProducts(productsCatalog.filter((product) => product.id !== id));
    setEditingId(null);
  };

  const resetProducts = () => {
    localStorage.removeItem(productStorageKey);
    saveProducts(defaultProducts);
    setEditingId(null);
  };

  return (
    <section id="admin" className="border-t border-[#ead9a8]/70 bg-white py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Admin Panel</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Manage Bag Details</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Add new bags from the form below. To keep this page tidy, each product shows a compact summary first; open Edit when you need to update the full details.</p>
            {productSaveMessage && <p className="mt-3 w-fit border border-[#ead9a8] bg-[#fff9ed] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8a6412]">{productSaveMessage}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={async () => {
              if (!publishProductsOnline) return;
              setProductSaveMessage("Publishing bag changes online...");
              const published = await publishProductsOnline(productsCatalog);
              setProductSaveMessage(published ? "Bag changes are live online." : "Saved on this browser only. Cloud publish needs checking.");
            }} className="w-fit bg-neutral-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#9f7418]">Publish Bag Changes</button>
            <button type="button" onClick={resetProducts} className="w-fit border border-neutral-950 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] transition hover:bg-neutral-950 hover:text-white">Reset TGS Products</button>
          </div>
        </div>

        <form onSubmit={addProduct} className="mb-8 grid gap-4 border border-[#ead9a8]/70 bg-[#fff9ed] p-5 shadow-[0_18px_45px_rgba(17,17,17,0.06)] lg:grid-cols-4">
          <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Bag name" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]">
            {categories.filter((category) => category !== "All").map((category) => <option key={category}>{category}</option>)}
          </select>
          <input required type="number" min="1" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="Price" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <input required type="number" min="0" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} placeholder="Stock" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <select value={draft.discount} onChange={(event) => setDraft({ ...draft, discount: event.target.value })} className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]">
            {discountOptions.map((discount) => <option key={discount} value={discount}>{discount}% discount</option>)}
          </select>
          <input value={draft.colors} onChange={(event) => setDraft({ ...draft, colors: event.target.value })} placeholder="Colors, separated by commas" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <input value={draft.size} onChange={(event) => setDraft({ ...draft, size: event.target.value })} placeholder="Size / dimensions" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <input value={draft.material} onChange={(event) => setDraft({ ...draft, material: event.target.value })} placeholder="Material" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <input value={draft.strap} onChange={(event) => setDraft({ ...draft, strap: event.target.value })} placeholder="Strap type" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <input value={draft.closure} onChange={(event) => setDraft({ ...draft, closure: event.target.value })} placeholder="Closure" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <input value={draft.care} onChange={(event) => setDraft({ ...draft, care: event.target.value })} placeholder="Care instructions" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]" />
          <select value={draft.available} onChange={(event) => setDraft({ ...draft, available: event.target.value })} className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f]"><option value="true">Available</option><option value="false">Unavailable</option></select>
          <input value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} placeholder="Cloudinary image URL" className="min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f] lg:col-span-2" />
          <input type="file" accept="image/*" onChange={(event) => uploadDraftImage(event.target.files?.[0])} className="min-w-0 border border-neutral-200 bg-white px-4 py-3 text-sm" />
          <button type="submit" className="bg-neutral-950 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418]">Add Bag</button>
          <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Short product description" className="min-h-24 min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f] lg:col-span-2" />
          <textarea value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} placeholder="Product details, one per line" className="min-h-24 min-w-0 border border-neutral-200 px-4 py-3 outline-none focus:border-[#b78a1f] lg:col-span-2" />
        </form>

        <div className="grid gap-4">
          {productsCatalog.map((product) => {
            const isEditing = editingId === product.id;
            const hasDiscount = Number(product.discount ?? 0) > 0;
            return (
              <article key={product.id} className="border border-[#ead9a8]/70 bg-white p-4 shadow-[0_18px_45px_rgba(17,17,17,0.06)]">
                <div className="grid gap-4 sm:grid-cols-[92px_1fr_auto] sm:items-center">
                  <img src={product.image} alt={product.name} className="h-28 w-full object-cover sm:h-24" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b78a1f]">{product.category}</p>
                      <span className={"border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] " + (product.available === false ? "border-neutral-300 bg-neutral-100 text-neutral-500" : getStockClasses(product.stock))}>{product.available === false ? "Unavailable" : getStockLabel(product.stock)}</span>
                      {hasDiscount && <span className="bg-[#b78a1f] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">-{product.discount}%</span>}
                    </div>
                    <h3 className="mt-2 truncate text-lg font-bold">{product.name}</h3>
                    <p className="mt-1 text-sm text-neutral-500">{formatCurrency(getDiscountedPrice(product))} · Stock {product.stock ?? 0} · {product.available === false ? "Unavailable" : "Available"} · {colorsToText(product)}</p>
                  </div>
                  <button type="button" onClick={() => setEditingId(isEditing ? null : product.id)} aria-label={(isEditing ? "Close editor for " : "Edit ") + product.name} title={(isEditing ? "Close editor" : "Edit details")} className="grid h-11 w-11 place-items-center border border-neutral-200 text-lg font-bold transition hover:border-[#b78a1f] hover:text-[#9f7418]">
                    {isEditing ? "×" : "✎"}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-5 border-t border-neutral-100 pt-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Bag Name
                        <input value={product.name} onChange={(event) => updateProductField(product.id, "name", event.target.value)} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
                      </label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Category
                        <select value={product.category} onChange={(event) => updateProductField(product.id, "category", event.target.value)} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]">
                          {categories.filter((category) => category !== "All").map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Price
                        <input type="number" min="1" value={product.price ?? 0} onChange={(event) => updateProductField(product.id, "price", event.target.value)} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
                      </label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Stock
                        <input type="number" min="0" value={product.stock ?? 0} onChange={(event) => updateProductField(product.id, "stock", event.target.value)} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[180px_180px_1fr]">
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Availability
                        <select value={String(product.available !== false)} onChange={(event) => updateProductField(product.id, "available", event.target.value === "true")} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]">
                          <option value="true">Available</option>
                          <option value="false">Unavailable</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Discount
                        <select value={product.discount ?? 0} onChange={(event) => updateProductField(product.id, "discount", event.target.value)} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]">
                          {discountOptions.map((discount) => <option key={discount} value={discount}>{discount}%</option>)}
                        </select>
                      </label>
                      <div className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Color Options
                        <AdminColorManager product={product} onAddColor={addColorToProduct} onRemoveColor={removeColorFromProduct} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 border border-neutral-100 bg-[#fffdf8] p-4" aria-label="Product Specs Editor">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b78a1f]">Product Specs</p>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {Object.entries(getProductSpecs(product)).map(([key, value]) => (
                          <label key={key} className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                            {specLabels[key] ?? key}
                            <input value={value} onChange={(event) => updateProductSpec(product.id, key, event.target.value)} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
                          </label>
                        ))}
                      </div>
                    </div>

                    <label className="mt-4 grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                      Cloudinary Image URL
                      <input value={String(product.image || "").startsWith("data:") ? "" : product.image || ""} onChange={(event) => updateProductField(product.id, "image", event.target.value)} placeholder="Paste secure_url from Cloudinary" className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
                    </label>

                    <label className="mt-4 grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                      Product Photo
                      <input type="file" accept="image/*" onChange={(event) => uploadImage(product.id, event.target.files?.[0])} className="border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal" />
                    </label>

                    <label className="mt-4 grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                      Product Description
                      <textarea value={product.description ?? ""} onChange={(event) => updateProductField(product.id, "description", event.target.value)} className="min-h-24 border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
                    </label>

                    <label className="mt-4 grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                      Product Details
                      <textarea value={detailsToText(product)} onChange={(event) => updateProductField(product.id, "details", event.target.value)} placeholder="One detail per line" className="min-h-28 border border-neutral-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-neutral-950 outline-none focus:border-[#b78a1f]" />
                    </label>

                    <button type="button" onClick={() => removeProduct(product.id)} className="mt-4 border border-red-200 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-600 hover:text-white">Remove Product</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}


function LittleJessieStudioPage({ products = defaultLittleJessieProducts, gallery = defaultLittleJessieGallery, onHome }) {
  const [inquiry, setInquiry] = useState({
    fullName: "",
    mobile: "",
    email: "",
    houseUnit: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    postalCode: "",
    landmark: "",
    paymentMethod: "GCash (via QR Code)",
    paymentReceipt: "",
    productType: products[0]?.name || "School Label Set",
    quantity: "",
    neededDate: "",
    theme: "",
    colorPalette: "",
    details: "",
  });
  const [inquirySaved, setInquirySaved] = useState(false);
  const [rentalBooking, setRentalBooking] = useState({
    fullName: "",
    mobile: "",
    email: "",
    rentalType: "Photobooth",
    rentalPackage: "Photo Standee",
    celebrantName: "",
    referencePhoto: "",
    eventDate: "",
    eventTime: "",
    eventType: "",
    eventLocationArea: "Cainta / Taytay",
    venueAddress: "",
    packageNotes: "",
    paymentMethod: "GCash (via QR Code)",
    paymentOption: "50% down payment",
    paymentReceipt: "",
  });
  const [rentalSaved, setRentalSaved] = useState(false);
  const [rentalMessage, setRentalMessage] = useState("");
  const [rentalSubmitting, setRentalSubmitting] = useState(false);
  const [fullPaymentOpen, setFullPaymentOpen] = useState(false);
  const [fullPaymentForm, setFullPaymentForm] = useState({
    celebrantName: "",
    reservationCode: "",
    paymentMethod: "GCash (via QR Code)",
    paymentReceipt: "",
  });
  const [fullPaymentResult, setFullPaymentResult] = useState(null);
  const [fullPaymentMessage, setFullPaymentMessage] = useState("");
  const [fullPaymentConfirmationOpen, setFullPaymentConfirmationOpen] = useState(false);
  const [fullPaymentToastOpen, setFullPaymentToastOpen] = useState(false);
  const [rentalTrackCode, setRentalTrackCode] = useState("");

  useEffect(() => {
    if (!products.some((product) => product.name === inquiry.productType)) {
      setInquiry((current) => ({ ...current, productType: products[0]?.name || "School Label Set" }));
    }
  }, [products, inquiry.productType]);

  const updateInquiry = (field, value) => {
    setInquiry((current) => ({ ...current, [field]: value }));
    setInquirySaved(false);
  };

  const updateRentalBooking = (field, value) => {
    setRentalBooking((current) => {
      const updates = { [field]: value };
      if (field === "rentalType") {
        updates.rentalPackage = value === "Photobooth" ? "Photo Standee" : "Chunky Letter Keychain";
      }
      return { ...current, ...updates };
    });
    setRentalSaved(false);
    setRentalMessage("");
  };

  const uploadInquiryPaymentReceipt = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateInquiry("paymentReceipt", reader.result);
    reader.readAsDataURL(file);
  };

  const uploadRentalReferencePhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateRentalBooking("referencePhoto", reader.result);
    reader.readAsDataURL(file);
  };

  const uploadRentalPaymentReceipt = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateRentalBooking("paymentReceipt", reader.result);
    reader.readAsDataURL(file);
  };

  const updateFullPaymentForm = (field, value) => {
    setFullPaymentForm((current) => ({ ...current, [field]: value }));
    setFullPaymentMessage("");
  };

  const uploadFullPaymentReceipt = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateFullPaymentForm("paymentReceipt", reader.result);
    reader.readAsDataURL(file);
  };

  const getRentalBookings = () => {
    try {
      const savedBookings = JSON.parse(localStorage.getItem(littleJessieRentalStorageKey) || "[]");
      let highestCode = savedBookings.reduce((max, booking) => {
        const match = String(booking.reservationCode || "").match(/LJS-(\d+)/i);
        return Math.max(max, match ? Number(match[1]) : 0);
      }, 0);
      let changed = false;
      const normalizedBookings = savedBookings.map((booking) => {
        if (booking.reservationCode) return booking;
        highestCode += 1;
        changed = true;
        return { ...booking, reservationCode: "LJS-" + String(highestCode).padStart(3, "0") };
      });
      if (changed) localStorage.setItem(littleJessieRentalStorageKey, JSON.stringify(normalizedBookings));
      return normalizedBookings;
    } catch {
      return [];
    }
  };

  const getRentalScheduleSettings = () => {
    try {
      return JSON.parse(localStorage.getItem(littleJessieRentalScheduleStorageKey) || "[]");
    } catch {
      return [];
    }
  };

  const normalizeReservationCode = (value) => String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const normalizePersonName = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

  const findFullPaymentBooking = () => {
    const code = normalizeReservationCode(fullPaymentForm.reservationCode);
    const celebrant = normalizePersonName(fullPaymentForm.celebrantName);
    if (!code) return null;
    const bookings = getRentalBookings();
    const codeMatch = bookings.find((booking) => {
      const possibleCodes = [booking.reservationCode, booking.id].filter(Boolean);
      return possibleCodes.some((possibleCode) => normalizeReservationCode(possibleCode) === code);
    });
    if (codeMatch) return codeMatch;
    if (!celebrant) return null;
    return bookings.find((booking) => {
      const bookingCelebrant = normalizePersonName(booking.celebrantName);
      return bookingCelebrant === celebrant || bookingCelebrant.includes(celebrant) || celebrant.includes(bookingCelebrant);
    }) || null;
  };

  const openFullPaymentModal = () => {
    setFullPaymentOpen(true);
    setFullPaymentResult(null);
    setFullPaymentMessage("");
    setFullPaymentConfirmationOpen(false);
  };

  const lookupFullPaymentBooking = (event) => {
    event.preventDefault();
    const booking = findFullPaymentBooking();
    if (!booking) {
      setFullPaymentResult(null);
      setFullPaymentMessage("We could not find that reservation. Please check the reservation code shown after booking.");
      return;
    }
    if (booking.fullPaymentReceived || booking.status === "Full Payment Receive") {
      setFullPaymentResult(null);
      setFullPaymentMessage("This reservation code is already fully paid. Thank you.");
      return;
    }
    if (booking.fullPaymentRequested || booking.fullPaymentReceipt) {
      setFullPaymentResult(null);
      setFullPaymentMessage("Full payment proof for this reservation is already submitted and waiting for admin confirmation.");
      return;
    }
    const totalDue = Number(booking.totalDue || 0);
    const downpaymentDue = Number(booking.downpaymentDue || Math.ceil(totalDue * 0.5));
    const balanceDue = Math.max(totalDue - downpaymentDue, 0);
    setFullPaymentResult({ ...booking, balanceDue });
    setFullPaymentMessage("");
  };

  const submitFullPaymentProof = () => {
    const booking = findFullPaymentBooking();
    if (!booking) {
      setFullPaymentResult(null);
      setFullPaymentMessage("We could not find that reservation. Please check the reservation code shown after booking.");
      return;
    }
    if (booking.fullPaymentReceived || booking.status === "Full Payment Receive") {
      setFullPaymentResult(null);
      setFullPaymentMessage("This reservation code is already fully paid. Thank you.");
      return;
    }
    if (booking.fullPaymentRequested || booking.fullPaymentReceipt) {
      setFullPaymentResult(null);
      setFullPaymentMessage("Full payment proof for this reservation is already submitted and waiting for admin confirmation.");
      return;
    }
    if (!fullPaymentForm.paymentReceipt) {
      setFullPaymentMessage("Please attach your full payment receipt before submitting.");
      return;
    }
    const nextBookings = getRentalBookings().map((item) => item.id === booking.id ? {
      ...item,
      fullPaymentRequested: true,
      fullPaymentMethod: fullPaymentForm.paymentMethod,
      fullPaymentReceipt: fullPaymentForm.paymentReceipt,
      fullPaymentSubmittedAt: new Date().toISOString(),
      status: item.status === "Cancelled" ? "Cancelled" : "Reservation Receive",
    } : item);
    localStorage.setItem(littleJessieRentalStorageKey, JSON.stringify(nextBookings));
    const updatedBooking = nextBookings.find((item) => item.id === booking.id);
    const totalDue = Number(updatedBooking.totalDue || 0);
    const downpaymentDue = Number(updatedBooking.downpaymentDue || Math.ceil(totalDue * 0.5));
    setFullPaymentResult({ ...updatedBooking, balanceDue: Math.max(totalDue - downpaymentDue, 0) });
    setFullPaymentMessage("");
    setFullPaymentConfirmationOpen(false);
    setFullPaymentOpen(false);
    setFullPaymentToastOpen(true);
    window.setTimeout(() => setFullPaymentToastOpen(false), 1800);
  };

  const getRentalScheduleForDate = (date) => {
    if (!date) return null;
    return getRentalScheduleSettings().find((item) => item.date === date) || null;
  };

  const getRentalDayStatus = (date) => {
    if (!date) return "Select an event date. Admin-managed availability will appear here.";
    const schedule = getRentalScheduleForDate(date);
    if (!schedule) return "Schedule is open unless admin confirms otherwise.";
    if (schedule.blocked) return "Fully booked for this date. " + (schedule.note || "Please choose another date.");
    if (schedule.nextAvailableTime) return "Admin note: Next available time is " + schedule.nextAvailableTime + ". " + (schedule.note || "");
    return schedule.note || "Date is available.";
  };

  const validateRentalBookingTime = () => {
    if (!rentalBooking.eventDate || !rentalBooking.eventTime) return "Please choose your event date and preferred time.";
    const schedule = getRentalScheduleForDate(rentalBooking.eventDate);
    if (schedule?.blocked) return "This date is marked fully booked by admin. Please choose another date.";
    if (schedule?.nextAvailableTime && rentalBooking.eventTime < schedule.nextAvailableTime) {
      return "Our next available schedule for today is " + schedule.nextAvailableTime + ". Please choose that time or later.";
    }
    return "";
  };

  const saveRentalBooking = async (event) => {
    event.preventDefault();
    if (rentalSubmitting) return;
    const validationMessage = validateRentalBookingTime();
    if (validationMessage) {
      setRentalSaved(false);
      setRentalMessage(validationMessage);
      window.setTimeout(() => document.getElementById("rental-submit-status")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }

    setRentalSubmitting(true);
    const savedBookings = getRentalBookings();
    const nextReservationNumber = savedBookings.reduce((max, booking) => {
      const match = String(booking.reservationCode || "").match(/LJS-(\d+)/i);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0) + 1;
    const reservationCode = "LJS-" + String(nextReservationNumber).padStart(3, "0");
    const nextBooking = {
      id: "LJS-RENT-" + Date.now(),
      reservationCode,
      createdAt: new Date().toISOString(),
      status: "Reservation Receive",
      ...rentalBooking,
      downpaymentPolicy: "50% down payment required to reserve, or customer may pay in full",
      packagePrice: rentalPackagePrice,
      transportationFee: rentalTransportationFee,
      totalDue: rentalTotal,
      downpaymentDue: rentalDownpayment,
      initialPaymentType: rentalBooking.paymentOption,
      initialPaymentDue: rentalInitialPaymentDue,
      balanceAfterInitialPayment: rentalBalanceAfterInitialPayment,
      fullPaymentRequested: rentalBooking.paymentOption === "Full payment",
      fullPaymentReceived: false,
    };

    try {
      localStorage.setItem(littleJessieRentalStorageKey, JSON.stringify([nextBooking, ...savedBookings]));
    } catch (error) {
      console.error(error);
    }

    let onlineSaved = false;
    if (backendEnabled) {
      try {
        await insertRecord("little_jessie_rentals", toDbLittleJessieRental(nextBooking));
        onlineSaved = true;
      } catch (error) {
        console.error(error);
      }
    }

    setRentalSaved(true);
    setRentalMessage("SCHEDULE SUBMITTED. Your reservation code is " + reservationCode + ". Please keep this code for payment follow-up. Reservation is confirmed after admin verifies your " + (rentalBooking.paymentOption === "Full payment" ? "full payment" : "50% down payment") + ". Transportation fee is based on your selected event location." + (onlineSaved ? " Your booking was also sent to our online admin records." : " If admin cannot see this immediately, please send your reservation code to Little Jessie Studyo."));
    window.setTimeout(() => document.getElementById("rental-submit-status")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setRentalSubmitting(false);
    setRentalBooking({
      fullName: "",
      mobile: "",
      email: "",
      rentalType: "Photobooth",
      rentalPackage: "Photo Standee",
      celebrantName: "",
      referencePhoto: "",
      eventDate: "",
      eventTime: "",
      eventType: "",
      eventLocationArea: "Cainta / Taytay",
      venueAddress: "",
      packageNotes: "",
      paymentMethod: "GCash (via QR Code)",
      paymentOption: "50% down payment",
      paymentReceipt: "",
    });
  };

  const saveInquiry = (event) => {
    event.preventDefault();
    const savedInquiries = JSON.parse(localStorage.getItem(littleJessieInquiryStorageKey) || "[]");
    const address = [
      inquiry.houseUnit,
      inquiry.street,
      inquiry.barangay,
      inquiry.city,
      inquiry.province,
      inquiry.postalCode,
      inquiry.landmark ? "Landmark: " + inquiry.landmark : "",
    ].filter(Boolean).join(", ");
    const nextInquiry = {
      id: "LJS-" + Date.now(),
      createdAt: new Date().toISOString(),
      status: "New inquiry",
      customer: { fullName: inquiry.fullName, mobile: inquiry.mobile, email: inquiry.email },
      address,
      paymentMethod: inquiry.paymentMethod,
      paymentReceipt: inquiry.paymentReceipt,
      totalDue: 0,
      order: {
        productType: inquiry.productType,
        quantity: inquiry.quantity,
        neededDate: inquiry.neededDate,
        theme: inquiry.theme,
        colorPalette: inquiry.colorPalette,
        details: inquiry.details,
      },
    };

    localStorage.setItem(littleJessieInquiryStorageKey, JSON.stringify([nextInquiry, ...savedInquiries]));
    setInquirySaved(true);
    setInquiry({
      fullName: "",
      mobile: "",
      email: "",
      houseUnit: "",
      street: "",
      barangay: "",
      city: "",
      province: "",
      postalCode: "",
      landmark: "",
      paymentMethod: "GCash (via QR Code)",
      paymentReceipt: "",
      productType: products[0]?.name || "School Label Set",
      quantity: "",
      neededDate: "",
      theme: "",
      colorPalette: "",
      details: "",
    });
  };

  const visibleProducts = products.filter((product) => product.available !== false);
  const rentalDayStatus = getRentalDayStatus(rentalBooking.eventDate);
  const rentalDateFullyBooked = Boolean(getRentalScheduleForDate(rentalBooking.eventDate)?.blocked);
  const rentalPackagePrices = {
    "Photo Standee": 2500,
    "Full Magnetic": 3500,
    "Photo Strip": 2500,
    "Strip Magnet": 3500,
    "Chunky Letter Keychain": 0,
    "Loop Keychain": 0,
    "Leather Keychain": 0,
  };
  const rentalPackageOptions = rentalBooking.rentalType === "Photobooth" ? ["Photo Standee", "Full Magnetic", "Photo Strip", "Strip Magnet"] : ["Chunky Letter Keychain", "Loop Keychain", "Leather Keychain"];
  const rentalPackagePrice = rentalPackagePrices[rentalBooking.rentalPackage] ?? 0;
  const rentalTransportationFees = {
    "Cainta / Taytay": 0,
    "Antipolo / Angono / Pasig / Marikina": 500,
    "Other Metro Manila areas": 700,
    "Outside Metro Manila": 1000,
  };
  const rentalTransportationFee = rentalTransportationFees[rentalBooking.eventLocationArea] ?? 1000;
  const rentalTotal = rentalPackagePrice + rentalTransportationFee;
  const rentalDownpayment = Math.ceil(rentalTotal * 0.5);
  const rentalInitialPaymentDue = rentalBooking.paymentOption === "Full payment" ? rentalTotal : rentalDownpayment;
  const rentalBalanceAfterInitialPayment = rentalBooking.paymentOption === "Full payment" ? 0 : Math.max(rentalTotal - rentalDownpayment, 0);
  const trackedRental = rentalTrackCode.trim() ? getRentalBookings().find((booking) => normalizeReservationCode(booking.reservationCode || booking.id) === normalizeReservationCode(rentalTrackCode)) : null;
  const rentalTrackingSteps = ["Reservation Receive", "Payment Under Review", "Full Payment Receive", "Event Confirmed"];
  const trackedRentalStatus = trackedRental ? (trackedRental.status === "Cancelled" ? "Cancelled" : (trackedRental.fullPaymentReceived || trackedRental.status === "Full Payment Receive") ? "Full Payment Receive" : trackedRental.fullPaymentReceipt || trackedRental.fullPaymentRequested ? "Payment Under Review" : "Reservation Receive") : "";
  const trackedRentalStepIndex = Math.max(0, rentalTrackingSteps.indexOf(trackedRentalStatus));

  return (
    <main className="min-h-screen bg-[#fff8fb] text-stone-950">
      <header className="sticky top-0 z-50 border-b border-pink-100 bg-white/90 shadow-[0_8px_30px_rgba(236,72,153,0.06)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:h-20 sm:px-6 lg:px-8">
          <a href="#little-jessie-top" className="flex min-w-0 items-center gap-3 text-left">
            <img src="/assets/little-jessie-logo-2026.jfif" alt="Little Jessie Studyo" className="h-10 w-10 rounded-full border border-pink-100 object-cover shadow-sm sm:h-14 sm:w-14" />
            <div className="min-w-0 leading-none">
              <p className="truncate text-sm font-black tracking-[0.12em] text-stone-950 sm:text-lg">Little Jessie</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-pink-500 sm:text-[10px]">Studyo</p>
            </div>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <a href="#little-jessie-menu" className="text-stone-600 transition hover:text-pink-500">Menu</a>
            <a href="#little-jessie-rental" className="text-stone-600 transition hover:text-pink-500">Rental</a>
            <a href="#little-jessie-gallery" className="text-stone-600 transition hover:text-pink-500">Gallery</a>
            <a href="#little-jessie-inquiry" className="text-stone-600 transition hover:text-pink-500">Inquiry</a>
          </nav>
          <button type="button" onClick={onHome} className="border border-pink-200 bg-[#fff8fb] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pink-700 transition hover:bg-pink-500 hover:text-white">
            Our Brands
          </button>
        </div>
      </header>

      <section id="little-jessie-top" className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-pink-500">Personalized souvenirs and school labels</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Cute Keepsakes, Made Personal</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-600 md:text-lg">Little Jessie Studyo creates playful custom souvenirs, keychains, labels, and school-themed pieces for birthdays, classrooms, events, and everyday gifting.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#little-jessie-menu" className="bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">View Menu</a>
            <a href="#little-jessie-rental" className="border border-pink-200 bg-white px-5 py-3 text-sm font-semibold text-stone-950 hover:border-pink-300">Rental</a>
            <a href="#little-jessie-inquiry" className="border border-pink-200 bg-white px-5 py-3 text-sm font-semibold text-stone-950 hover:border-pink-300">Send Inquiry</a>
          </div>
        </div>
        <div className="border border-pink-100 bg-white p-8 shadow-sm">
          <img src="/assets/little-jessie-logo-2026.jfif" alt="Little Jessie Studyo logo" className="mx-auto h-72 w-72 max-w-full rounded-full border border-pink-100 object-cover shadow-[0_24px_70px_rgba(236,72,153,0.16)]" />
        </div>
      </section>

      <section id="little-jessie-menu" className="border-y border-pink-100 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-500">Product and pricing menu</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Custom pieces for school, gifting, and events</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">Discounts and availability are managed in the admin panel and update here automatically.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => {
              const hasDiscount = Number(product.discount || 0) > 0 && Number(product.price || 0) > 0;
              return (
                <article key={product.id} className="border border-pink-100 bg-[#fff8fb] p-5 shadow-sm">
                  <div className="flex h-36 items-center justify-center overflow-hidden bg-white text-center text-sm font-semibold text-pink-500">
                    {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-contain p-2" /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-pink-50 via-white to-pink-100 p-6 text-center"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">Little Jessie Studyo</p><p className="mt-3 text-lg font-bold text-stone-900">Custom Made</p><p className="mt-2 text-sm text-stone-500">Photo can be added in admin</p></div></div>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="border border-pink-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-pink-600">{getAvailabilityText(product)}</span>
                    {hasDiscount && <span className="bg-pink-500 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">-{product.discount}%</span>}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{product.name}</h3>
                  <div className="mt-2">
                    {hasDiscount && <p className="text-xs font-semibold text-stone-400 line-through">{formatCurrency(product.price)}</p>}
                    <p className="text-xl font-semibold text-pink-600">{getPriceLabel(product)}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{product.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="little-jessie-gallery" className="bg-[#fff8fb] py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-500">Past Works Gallery</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Past work and custom order ideas</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                A preview of the kind of personalized pieces Little Jessie Studyo can prepare. Real customer photos can be uploaded here before launch.
              </p>
            </div>
            <a href="#little-jessie-inquiry" className="w-fit border border-pink-200 bg-white px-5 py-3 text-sm font-semibold text-stone-950 hover:border-pink-300">
              Request a Custom Design
            </a>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((item, index) => (
              <article key={item.title} className={"border border-pink-100 bg-white p-4 shadow-sm " + (index === 0 ? "sm:col-span-2" : "")}>
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#fff1f6] text-center text-sm font-semibold text-pink-500">
                  {item.image ? <img src={item.image} alt={item.title} className="h-full w-full object-contain bg-white p-2" /> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-pink-50 via-white to-pink-100 p-6 text-center"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">Past Work</p><p className="mt-3 text-lg font-bold text-stone-900">Little Jessie Studyo</p><p className="mt-2 text-sm text-stone-500">Gallery image ready for upload</p></div></div>}
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="little-jessie-client-care" className="border-y border-pink-100 bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-3">
          <div className="border border-pink-100 bg-[#fff8fb] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">Production Timeline</p>
            <h3 className="mt-3 text-xl font-bold">Custom orders need planning time.</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Personalized souvenirs and labels usually need 5-7 working days after payment confirmation and design approval. Larger event orders may need more time depending on quantity.</p>
          </div>
          <div className="border border-pink-100 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">Photo Guidelines</p>
            <h3 className="mt-3 text-xl font-bold">Send clear references.</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Upload bright, clear photos or design references. Avoid blurry, cropped, or dark images so the layout can be reviewed properly before production.</p>
          </div>
          <div className="border border-pink-100 bg-[#fff8fb] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">Rental Confidence</p>
            <h3 className="mt-3 text-xl font-bold">Reservations are verified.</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">Rental dates are manually controlled by admin. A reservation is secured only after payment proof is reviewed and your schedule is confirmed.</p>
          </div>
        </div>
      </section>

      <section id="little-jessie-track" className="bg-[#fff8fb] py-14">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-500">Track Rental</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Check your reservation update.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">Enter your Little Jessie reservation code to see payment review and event confirmation status.</p>
          </div>
          <div className="border border-pink-100 bg-white p-5 shadow-sm">
            <label className="grid gap-2 text-sm font-semibold text-stone-700">Reservation Code
              <input value={rentalTrackCode} onChange={(event) => setRentalTrackCode(event.target.value.toUpperCase())} placeholder="LJS-001" className="border border-pink-100 px-4 py-3 font-normal outline-none focus:border-pink-300" />
            </label>
            {!trackedRental && rentalTrackCode.trim() && <p className="mt-4 border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">No reservation found. Please check the code from your booking confirmation.</p>}
            {trackedRental && (
              <div className="mt-5">
                <div className="flex flex-col justify-between gap-3 border-b border-pink-100 pb-4 sm:flex-row sm:items-start">
                  <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">{trackedRental.reservationCode}</p><h3 className="mt-2 text-xl font-bold">{trackedRental.status === "Cancelled" ? "Reservation cancelled" : trackedRentalStatus === "Full Payment Receive" ? "Fully paid and ready for confirmation" : trackedRentalStatus}</h3><p className="mt-1 text-sm text-stone-500">{trackedRental.eventDate} · {trackedRental.eventTime || "Time pending"}</p></div>
                  <span className="w-fit border border-pink-200 bg-[#fff8fb] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-pink-700">{trackedRental.status}</span>
                </div>
                {trackedRental.status === "Cancelled" ? <p className="mt-4 border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">Reason: {trackedRental.cancellationNote || "Please contact Little Jessie Studyo for details."}</p> : <div className="mt-5 grid gap-3 sm:grid-cols-4">{rentalTrackingSteps.map((step, index) => <div key={step} className={"border p-3 text-center text-xs font-bold uppercase tracking-[0.1em] " + (index <= trackedRentalStepIndex ? "border-pink-300 bg-[#fff8fb] text-pink-700" : "border-stone-200 bg-white text-stone-400")}>{step}</div>)}</div>}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="little-jessie-rental" className="border-y border-pink-100 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-500">Rental Services</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Book Little Jessie rentals for your event.</h2>
              <p className="mt-4 text-sm leading-7 text-stone-600">Choose your rental service, package, event date, and preferred time. Availability is managed by admin and shown once you select a date.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[{ name: "Photobooth", detail: "A fun photo experience for birthdays, parties, and special gatherings." }, { name: "D.I.Y Souvenir On The Spot", detail: "Guests can enjoy personalized souvenir-making during the event." }].map((service) => (
                  <article key={service.name} className="border border-pink-100 bg-[#fff8fb] p-5">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{service.detail}</p>
                    <span className="mt-4 inline-flex border border-pink-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-pink-600">Rental</span>
                  </article>
                ))}
              </div>
              <div className="mt-6 border border-pink-200 bg-[#fff8fb] p-4 text-sm leading-6 text-pink-700">
                <p className="font-semibold">No down payment, no reservation.</p>
                <p>Reservation requires either a 50% down payment or full payment. Transportation fee is calculated based on the event location.</p>
                <p>Cainta and Taytay are free. Antipolo, Angono, Pasig, and Marikina are PHP 500. Other Metro Manila areas are PHP 700. Outside Metro Manila is PHP 1,000.</p>
                <p>Each event is allotted 5 hours.</p>
              </div>
            </div>

            <form onSubmit={saveRentalBooking} className="border border-pink-100 bg-[#fff8fb] p-5 shadow-sm">
              <div className="mb-5 flex flex-col justify-between gap-3 border border-pink-100 bg-white p-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Calendar Slots</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{rentalDayStatus}</p>
                </div>
                <span className="w-fit bg-stone-950 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white">Admin Schedule</span>
              </div>

              {rentalMessage && (<div id="rental-submit-status" role="status" className={"mb-4 border p-4 text-sm font-semibold leading-6 " + (rentalSaved ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}><p className="text-base font-bold">{rentalSaved ? "Schedule Submitted" : "Please adjust your schedule"}</p><p className="mt-1">{rentalMessage}</p></div>)}

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Customer Information</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Full Name<input value={rentalBooking.fullName} onChange={(event) => updateRentalBooking("fullName", event.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
                <label className="text-sm font-semibold">Mobile Number<input value={rentalBooking.mobile} onChange={(event) => updateRentalBooking("mobile", event.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" placeholder="09XXXXXXXXX" /></label>
                <label className="text-sm font-semibold sm:col-span-2">Email Address<input type="email" value={rentalBooking.email} onChange={(event) => updateRentalBooking("email", event.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              </div>

              <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Rental Details</p>
              <label className="mt-3 block text-sm font-semibold">Rental Service<select value={rentalBooking.rentalType} onChange={(event) => updateRentalBooking("rentalType", event.target.value)} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300"><option>Photobooth</option><option>D.I.Y Souvenir On The Spot</option></select></label>
              <label className="mt-4 block text-sm font-semibold">Package Choice<select value={rentalBooking.rentalPackage} onChange={(event) => updateRentalBooking("rentalPackage", event.target.value)} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300">{rentalPackageOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label className="mt-4 block text-sm font-semibold">Name of Celebrant<input value={rentalBooking.celebrantName} onChange={(event) => updateRentalBooking("celebrantName", event.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" placeholder="Celebrant name" /></label>
              <label className="mt-4 block text-sm font-semibold">Attach Reference Photo<input type="file" accept="image/*" onChange={(event) => uploadRentalReferencePhoto(event.target.files?.[0])} className="mt-2 w-full border border-stone-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              {rentalBooking.referencePhoto && <div className="mt-3 border border-pink-100 bg-white p-3 text-sm font-semibold text-pink-600">Reference photo attached.</div>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Event Date<input type="date" value={rentalBooking.eventDate} onChange={(event) => updateRentalBooking("eventDate", event.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
                <label className="text-sm font-semibold">Preferred Event Time<input type="time" value={rentalBooking.eventTime} onChange={(event) => updateRentalBooking("eventTime", event.target.value)} required disabled={rentalDateFullyBooked} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300 disabled:bg-stone-100 disabled:text-stone-400" /></label>
                <label className="text-sm font-semibold">Event Type<input value={rentalBooking.eventType} onChange={(event) => updateRentalBooking("eventType", event.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" placeholder="Birthday, school event, baptism" /></label>
                <label className="text-sm font-semibold">Event Location Area<select value={rentalBooking.eventLocationArea} onChange={(event) => updateRentalBooking("eventLocationArea", event.target.value)} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300"><option>Cainta / Taytay</option><option>Antipolo / Angono / Pasig / Marikina</option><option>Other Metro Manila areas</option><option>Outside Metro Manila</option></select></label>
                <label className="text-sm font-semibold">Payment Method<select value={rentalBooking.paymentMethod} onChange={(event) => updateRentalBooking("paymentMethod", event.target.value)} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300"><option>GCash (via QR Code)</option><option>Maya (via QR Code)</option><option>MariBank</option><option>GoTyme Bank</option></select></label>
                <label className="text-sm font-semibold">Payment Option<select value={rentalBooking.paymentOption} onChange={(event) => updateRentalBooking("paymentOption", event.target.value)} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300"><option>50% down payment</option><option>Full payment</option></select></label>
              </div>
              <div className="mt-4"><PaymentQrBox method={rentalBooking.paymentMethod} /></div>
              <label className="mt-4 block text-sm font-semibold">Attach Payment Receipt<input type="file" accept="image/*" onChange={(event) => uploadRentalPaymentReceipt(event.target.files?.[0])} className="mt-2 w-full border border-stone-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              {rentalBooking.paymentReceipt && <div className="mt-3 border border-pink-100 bg-white p-3 text-sm font-semibold text-pink-600">Receipt attached.</div>}
              <label className="mt-4 block text-sm font-semibold">Event Venue / Address<textarea value={rentalBooking.venueAddress} onChange={(event) => updateRentalBooking("venueAddress", event.target.value)} required className="mt-2 min-h-24 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" placeholder="Complete venue name and address" /></label>
              <label className="mt-4 block text-sm font-semibold">Package Notes / Special Requests<textarea value={rentalBooking.packageNotes} onChange={(event) => updateRentalBooking("packageNotes", event.target.value)} className="mt-2 min-h-24 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" placeholder="Backdrop theme, souvenir style, number of guests, special setup notes" /></label>
              <div className="mt-5 border border-pink-200 bg-white p-4 text-sm leading-6 text-stone-700">
                <p className="font-bold text-pink-700">Rental Checkout Summary</p>
                <div className="mt-3 grid gap-2">
                  <p className="flex justify-between gap-3"><span>Package</span><span className="font-semibold text-stone-950">{rentalBooking.rentalPackage}</span></p>
                  <p className="flex justify-between gap-3"><span>Package price</span><span className="font-semibold text-stone-950">{rentalPackagePrice ? formatCurrency(rentalPackagePrice) : "Quote-based"}</span></p>
                  <p className="flex justify-between gap-3"><span>Event location area</span><span className="text-right font-semibold text-stone-950">{rentalBooking.eventLocationArea}</span></p>
                  <p className="flex justify-between gap-3"><span>Transportation fee</span><span className="font-semibold text-stone-950">{formatCurrency(rentalTransportationFee)}</span></p>
                  <p className="flex justify-between gap-3 border-t border-pink-100 pt-2"><span>Total</span><span className="font-bold text-stone-950">{rentalPackagePrice ? formatCurrency(rentalTotal) : "For quotation"}</span></p>
                  <p className="flex justify-between gap-3"><span>Payment option</span><span className="font-semibold text-stone-950">{rentalBooking.paymentOption}</span></p>
                  <p className="flex justify-between gap-3"><span>Amount to pay now</span><span className="font-bold text-pink-700">{rentalPackagePrice ? formatCurrency(rentalInitialPaymentDue) : "To be confirmed"}</span></p>
                  <p className="flex justify-between gap-3"><span>Remaining balance after verification</span><span className="font-semibold text-stone-950">{rentalPackagePrice ? formatCurrency(rentalBalanceAfterInitialPayment) : "To be confirmed"}</span></p>
                </div>
                <p className="mt-4 font-semibold text-pink-700">No down payment, no reservation. Full payment is also accepted. Payment must be settled on or before the event date.</p>
                <p className="mt-2 text-stone-600">Cancellation of the confirmed event is non-refundable.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="submit" disabled={rentalDateFullyBooked || rentalSubmitting} className="w-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500">{rentalSubmitting ? "Submitting..." : rentalSaved ? "Schedule Submitted" : rentalDateFullyBooked ? "Date Fully Booked" : "Proceed to Checkout"}</button>
                <button type="button" onClick={openFullPaymentModal} className="w-full border border-pink-200 bg-white px-5 py-3 text-sm font-semibold text-stone-950 hover:border-pink-300">Settle Full Payment</button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="bg-stone-950 py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-4">
          {["Send details", "Review design", "Confirm quote", "Prepare order"].map((step, index) => (
            <div key={step}>
              <p className="text-sm text-pink-200">Step {index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{step}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-300">We keep the order simple, clear, and easy to confirm before production.</p>
            </div>
          ))}
        </div>
      </section>

      <section id="little-jessie-inquiry" className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-[.9fr_1.1fr] md:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-500">Customer order form</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Tell us what you want to customize.</h2>
            <p className="mt-4 text-sm leading-7 text-stone-600">This saves the inquiry on this browser for now. QR codes and real online sending can be connected before launch.</p>
            {inquirySaved && <div className="mt-5 border border-pink-200 bg-white p-4 text-sm font-semibold text-pink-700">Inquiry saved. We will connect this to Little Jessie admin tracking next.</div>}
          </div>

          <form onSubmit={saveInquiry} className="border border-pink-100 bg-white p-5 shadow-sm">
            <p className="mb-4 border border-pink-200 bg-[#fff8fb] p-3 text-sm font-semibold leading-6 text-pink-700">We do not accept rush orders. Please ensure your required date allows enough production time before placing your order.</p>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Customer Information</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Full Name<input value={inquiry.fullName} onChange={(e) => updateInquiry("fullName", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">Mobile Number<input value={inquiry.mobile} onChange={(e) => updateInquiry("mobile", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" placeholder="09XXXXXXXXX" /></label>
              <label className="text-sm font-semibold sm:col-span-2">Email Address<input type="email" value={inquiry.email} onChange={(e) => updateInquiry("email", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Shipping Address</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">House No. / Unit / Floor<input value={inquiry.houseUnit} onChange={(e) => updateInquiry("houseUnit", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">Street / Subdivision / Building<input value={inquiry.street} onChange={(e) => updateInquiry("street", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">Barangay<input value={inquiry.barangay} onChange={(e) => updateInquiry("barangay", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">City / Municipality<input value={inquiry.city} onChange={(e) => updateInquiry("city", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">Province<input value={inquiry.province} onChange={(e) => updateInquiry("province", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">Postal Code<input value={inquiry.postalCode} onChange={(e) => updateInquiry("postalCode", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold sm:col-span-2">Landmark (Optional but recommended)<input value={inquiry.landmark} onChange={(e) => updateInquiry("landmark", e.target.value)} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Payment Method</p>
            <select value={inquiry.paymentMethod} onChange={(e) => updateInquiry("paymentMethod", e.target.value)} className="mt-3 w-full border border-stone-200 px-3 py-3 text-sm outline-none focus:border-pink-300">
              <option>GCash (via QR Code)</option>
              <option>Maya (via the same QR Code used by TGS Bags)</option>
              <option>MariBank</option><option>GoTyme Bank</option>
            </select>
            <div className="mt-3"><PaymentQrBox method={inquiry.paymentMethod} /></div>
            <label className="mt-4 block text-sm font-semibold">Attach Payment Receipt<input type="file" accept="image/*" onChange={(event) => uploadInquiryPaymentReceipt(event.target.files?.[0])} className="mt-2 w-full border border-stone-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
            {inquiry.paymentReceipt && <div className="mt-3 border border-pink-100 bg-[#fff8fb] p-3 text-sm font-semibold text-pink-600">Receipt attached.</div>}

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-pink-500">Order Information</p>
            <label className="mt-3 block text-sm font-semibold">Product Type<select value={inquiry.productType} onChange={(e) => updateInquiry("productType", e.target.value)} className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300">{visibleProducts.map((product) => <option key={product.id}>{product.name}</option>)}</select></label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Quantity<input value={inquiry.quantity} onChange={(e) => updateInquiry("quantity", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" placeholder="Example: 20 pcs" /></label>
              <label className="text-sm font-semibold">Needed Date<input type="date" value={inquiry.neededDate} onChange={(e) => updateInquiry("neededDate", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">Theme<input value={inquiry.theme} onChange={(e) => updateInquiry("theme", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
              <label className="text-sm font-semibold">Color Palette<input value={inquiry.colorPalette} onChange={(e) => updateInquiry("colorPalette", e.target.value)} required className="mt-2 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Order Details / Special Instructions<textarea value={inquiry.details} onChange={(e) => updateInquiry("details", e.target.value)} required className="mt-2 min-h-28 w-full border border-stone-200 px-3 py-3 text-sm font-normal outline-none focus:border-pink-300" /></label>
            <button type="submit" className="mt-5 w-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">Submit Inquiry</button>
          </form>
        </div>
      </section>

      <section id="little-jessie-faq" className="border-t border-pink-100 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-500">Little Jessie FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Before placing a custom order.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Do you accept rush orders?", "Rush orders are not accepted. Please choose a needed date that allows enough production time after payment and design approval."],
              ["How long is production?", "Most custom souvenir and label orders need 5-7 working days. Larger quantities or detailed themes may require more time."],
              ["Can I request revisions?", "Minor layout adjustments can be reviewed before production. Changes after production starts may not be possible."],
              ["When is a rental confirmed?", "A rental is confirmed only after payment proof is reviewed and the reservation schedule is accepted by admin."],
            ].map(([question, answer]) => <details key={question} className="border border-pink-100 bg-[#fff8fb] p-5"><summary className="cursor-pointer text-lg font-bold">{question}</summary><p className="mt-3 text-sm leading-6 text-stone-600">{answer}</p></details>)}
          </div>
        </div>
      </section>

      {fullPaymentToastOpen && (
        <div className="fixed inset-x-4 top-5 z-[90] mx-auto max-w-md border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-800 shadow-xl">
          Payment proof received. Thank you for choosing Little Jessie Studyo.
        </div>
      )}

      {fullPaymentOpen && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-stone-950/60 px-4 py-6">
          <div className="mx-auto max-w-2xl border border-pink-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">Settle Balance</p>
                <h3 className="mt-2 font-serif text-2xl font-bold text-stone-950">Find your rental reservation</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">Enter the reservation code from your submitted booking. The celebrant name helps us confirm the correct event.</p>
              </div>
              <button type="button" onClick={() => setFullPaymentOpen(false)} className="border border-stone-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-stone-600 hover:border-stone-950 hover:text-stone-950">Close</button>
            </div>

            <form onSubmit={lookupFullPaymentBooking} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-stone-700">Name of Celebrant
                <input required value={fullPaymentForm.celebrantName} onChange={(event) => updateFullPaymentForm("celebrantName", event.target.value)} className="border border-pink-100 bg-white px-3 py-3 text-stone-950 outline-none focus:border-pink-300" placeholder="Example: Jessie" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-stone-700">Reservation Code
                <input required value={fullPaymentForm.reservationCode} onChange={(event) => updateFullPaymentForm("reservationCode", event.target.value.toUpperCase())} className="border border-pink-100 bg-white px-3 py-3 text-stone-950 outline-none focus:border-pink-300" placeholder="LJS-001" />
              </label>
              <button type="submit" className="sm:col-span-2 bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">Find Reservation</button>
            </form>

            {fullPaymentMessage && <div className="mt-4 border border-pink-100 bg-[#fff4f8] px-4 py-3 text-sm font-semibold text-pink-800">{fullPaymentMessage}</div>}

            {fullPaymentConfirmationOpen && (
              <div className="mt-4 border border-emerald-200 bg-emerald-50 p-5 text-stone-800 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Payment Proof Received</p>
                <h4 className="mt-2 text-xl font-bold text-stone-950">Thank you for choosing Little Jessie Studyo.</h4>
                <p className="mt-2 text-sm leading-6 text-stone-700">Your full-payment receipt has been submitted successfully. Our team will review the payment details and update your booking once verified.</p>
                <button type="button" onClick={() => { setFullPaymentConfirmationOpen(false); setFullPaymentOpen(false); }} className="mt-4 bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">Done</button>
              </div>
            )}

            {fullPaymentResult && (
              <div className="mt-5 grid gap-5 border border-pink-100 bg-[#fff8fb] p-4">
                <div className="grid gap-2 text-sm text-stone-700">
                  <p className="font-bold text-stone-950">Reservation Code: {fullPaymentResult.reservationCode || fullPaymentResult.id}</p>
                  <p>Package: <span className="font-semibold text-stone-950">{fullPaymentResult.rentalPackage}</span></p>
                  <p>Total amount: <span className="font-semibold text-stone-950">{fullPaymentResult.totalDue ? formatCurrency(fullPaymentResult.totalDue) : "For quotation"}</span></p>
                  <p>Down payment: <span className="font-semibold text-stone-950">{fullPaymentResult.downpaymentDue ? formatCurrency(fullPaymentResult.downpaymentDue) : "To be confirmed"}</span></p>
                  <p>Remaining balance: <span className="font-bold text-pink-700">{fullPaymentResult.totalDue ? formatCurrency(fullPaymentResult.balanceDue) : "To be confirmed by admin"}</span></p>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-stone-700">Payment Method
                  <select value={fullPaymentForm.paymentMethod} onChange={(event) => updateFullPaymentForm("paymentMethod", event.target.value)} className="border border-pink-100 bg-white px-3 py-3 text-stone-950 outline-none focus:border-pink-300">
                    {littleJessiePaymentMethods.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </label>
                <PaymentQrBox method={fullPaymentForm.paymentMethod} tone="pink" />
                <label className="grid gap-2 text-sm font-semibold text-stone-700">Upload Full Payment Receipt
                  <input type="file" accept="image/*" onChange={(event) => uploadFullPaymentReceipt(event.target.files?.[0])} className="border border-pink-100 bg-white px-3 py-3 text-sm text-stone-700" />
                </label>
                {fullPaymentForm.paymentReceipt && <img src={fullPaymentForm.paymentReceipt} alt="Full payment receipt preview" className="h-28 w-28 object-cover" />}
                <button type="button" onClick={submitFullPaymentProof} className="bg-pink-600 px-5 py-3 text-sm font-semibold text-white hover:bg-pink-700">Submit Full Payment Proof</button>
                <p className="text-xs leading-5 text-stone-500">Payment must be settled on or before the event date. Cancellation of a confirmed event is non-refundable.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function CorporateLandingPage({ onNavigate }) {
  const brandCards = [
    {
      name: "The Grace Shop",
      shortName: "TGS Bags",
      path: "/the-grace-shop",
      description: "Own-brand fashion bags created for graceful everyday style, practical carry, and polished boutique presentation.",
      details: ["Fashion bags", "Customer checkout", "Order tracking", "Admin-managed products"],
      accent: "#b78a1f",
      bg: "#fff9ed",
    },
    {
      name: "Little Jessie Studyo",
      shortName: "Souvenirs and Rentals",
      path: "/little-jessie-studio",
      description: "Personalized souvenirs, school labels, keychains, photobooth rentals, and D.I.Y souvenir event services.",
      details: ["Custom orders", "Rental booking", "Payment proof", "Admin schedule control"],
      accent: "#ec4899",
      bg: "#fff8fb",
    },
  ];

  const companyHighlights = [
    "Registered business documents are available for customer reference.",
    "Order and booking updates are managed through the admin dashboard.",
    "Payment proofs are recorded per business for clearer tracking.",
    "Customer inquiries are reviewed before production or delivery confirmation.",
    "Product, stock, discount, and schedule details can be updated anytime.",
    "Built for The Grace Shop and Little Jessie Studyo as one growing company.",
  ];

  return (
    <main className="min-h-screen bg-[#fffdf8] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <button type="button" onClick={() => onNavigate("/")} className="text-left">
            <img src={corporateLogo} alt="TGS Enterprises Corp." className="h-12 w-auto object-contain" />
          </button>
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <a href="#brands" className="text-neutral-600 hover:text-neutral-950">Brands</a>
            <a href="#leadership" className="text-neutral-600 hover:text-neutral-950">Leadership</a>
            <a href="#information" className="text-neutral-600 hover:text-neutral-950">Company Info</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_.85fr] md:items-center lg:px-8 lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b78a1f]">Fashion bags, personalized souvenirs, and event services</p>
          <h1 className="mt-5 font-serif text-4xl font-bold leading-tight sm:text-6xl">TGS ENTERPRISES CORP.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-neutral-600 sm:text-lg">We provide stylish bags and creative personalized souvenirs designed to bring value, convenience, and joy to customers across everyday life and special occasions.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => onNavigate("/the-grace-shop")} className="bg-neutral-950 px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white hover:bg-[#9f7418]">Visit The Grace Shop</button>
            <button type="button" onClick={() => onNavigate("/little-jessie-studio")} className="border border-neutral-950 bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-neutral-950 hover:bg-neutral-950 hover:text-white">Visit Little Jessie</button>
          </div>
        </div>
        <div className="border border-[#ead9a8]/70 bg-white p-6 shadow-[0_30px_80px_rgba(17,17,17,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Business Snapshot</p>
          <div className="mt-6 grid gap-4">
            <div className="border border-neutral-100 bg-[#fff9ed] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b78a1f]">Fashion Retail</p><p className="mt-2 text-xl font-bold">The Grace Shop Bags</p></div>
            <div className="border border-neutral-100 bg-[#fff8fb] p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-pink-500">Creative Services</p><p className="mt-2 text-xl font-bold">Little Jessie Studyo</p></div>
            <div className="border border-neutral-100 bg-neutral-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Customer Support</p><p className="mt-2 text-xl font-bold">Online Orders and Bookings</p></div>
          </div>
        </div>
      </section>

      <section id="mission-vision" className="border-y border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b78a1f]">About TGS Enterprises Corp.</p>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Built on quality, service, creativity, and continuous improvement.</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="border border-[#ead9a8]/70 bg-[#fff9ed] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b78a1f]">Mission</p>
              <p className="mt-4 text-sm leading-7 text-neutral-700">To provide high-quality, stylish bags and creative personalized souvenirs that bring value, convenience, and joy to our customers. We are committed to delivering excellent products, exceptional customer service, and innovative solutions while building lasting relationships with our community through integrity, creativity, and continuous improvement.</p>
            </article>
            <article className="border border-pink-100 bg-[#fff8fb] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-500">Vision</p>
              <p className="mt-4 text-sm leading-7 text-neutral-700">To become a trusted and leading brand in the Philippines, recognized for fashionable, affordable bags and high-quality personalized souvenirs. We aspire to expand our presence nationwide through innovation, outstanding service, and a commitment to making every customer's everyday life and special occasions more meaningful.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="brands" className="border-b border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-neutral-500">Our Brands</p>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Two focused businesses under one growing company.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {brandCards.map((brand) => (
              <article key={brand.name} className="border border-neutral-200 p-6" style={{ backgroundColor: brand.bg }}>
                <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: brand.accent }}>{brand.shortName}</p>
                <h3 className="mt-3 text-2xl font-bold">{brand.name}</h3>
                <p className="mt-3 min-h-20 text-sm leading-7 text-neutral-600">{brand.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {brand.details.map((detail) => <span key={detail} className="border border-white bg-white px-3 py-2 text-xs font-semibold text-neutral-700">{detail}</span>)}
                </div>
                <button type="button" onClick={() => onNavigate(brand.path)} className="mt-6 border border-neutral-950 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] hover:bg-neutral-950 hover:text-white">Open Brand</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="leadership" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b78a1f]">Leadership</p>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Built with family leadership and clear operations.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-neutral-200 bg-white p-5"><p className="text-sm font-bold text-neutral-500">President</p><h3 className="mt-2 text-2xl font-bold">Executive Leadership</h3><p className="mt-3 text-sm leading-6 text-neutral-600">Oversees business direction, brand growth, customer experience, and operational planning.</p></div>
            <div className="border border-neutral-200 bg-white p-5"><p className="text-sm font-bold text-neutral-500">Secretary</p><h3 className="mt-2 text-2xl font-bold">Corporate Administration</h3><p className="mt-3 text-sm leading-6 text-neutral-600">Supports documentation, coordination, customer records, and organized administrative workflows.</p></div>
          </div>
        </div>
      </section>

      <section id="registration" className="border-t border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#b78a1f]">Registration and Compliance</p>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">Official business registration details.</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-600">These records help customers identify the registered businesses behind TGS Enterprises Corp., The Grace Shop, and Little Jessie Studyo, supporting a more transparent and trustworthy buying experience.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <article className="border border-emerald-100 bg-emerald-50 p-6">
              <div className="grid h-72 place-items-center border border-emerald-100 bg-white p-6 text-center shadow-[0_18px_45px_rgba(17,17,17,0.08)]">
                <p className="max-w-xs text-sm font-semibold leading-6 text-neutral-600">Official document available for verification upon request.</p>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">SEC Certificate of Incorporation</p>
              <h3 className="mt-3 text-2xl font-bold">TGS Enterprises Corp.</h3>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-neutral-700">
                <p><span className="font-semibold text-neutral-950">Registration:</span> Verified corporate registration</p>
                <p><span className="font-semibold text-neutral-950">Doing business as:</span> The Grace Shop and TGS Bar & Restaurant</p>
                <p><span className="font-semibold text-neutral-950">Incorporation date:</span> October 21, 2024</p>
                <p><span className="font-semibold text-neutral-950">Registered with:</span> Securities and Exchange Commission</p>
              </div>
            </article>
            <article className="border border-neutral-200 bg-white p-6">
              <div className="grid h-72 place-items-center border border-neutral-200 bg-white p-6 text-center shadow-[0_18px_45px_rgba(17,17,17,0.08)]">
                <p className="max-w-xs text-sm font-semibold leading-6 text-neutral-600">Tax registration document available for verification upon request.</p>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">BIR Certificate of Registration</p>
              <h3 className="mt-3 text-2xl font-bold">TGS Enterprises Corp.</h3>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-neutral-700">
                <p><span className="font-semibold text-neutral-950">Tax registration:</span> Verified BIR registration</p>
                <p><span className="font-semibold text-neutral-950">Taxpayer type:</span> Domestic corporation</p>
                <p><span className="font-semibold text-neutral-950">Registered area:</span> Taytay, Rizal</p>
                <p><span className="font-semibold text-neutral-950">Registration date:</span> October 22, 2024</p>
                <p><span className="font-semibold text-neutral-950">Trade name:</span> The Grace Shop</p>
              </div>
            </article>
            <article className="border border-pink-100 bg-[#fff8fb] p-6">
              <div className="grid h-72 place-items-center border border-pink-100 bg-white p-6 text-center">
                <p className="max-w-xs text-sm font-semibold leading-6 text-neutral-600">DTI registration document available for verification upon request.</p>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-pink-500">DTI Business Name Registration</p>
              <h3 className="mt-3 text-2xl font-bold">Little Jessie Studyo Souvenir Shop</h3>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-neutral-700">
                <p><span className="font-semibold text-neutral-950">Ownership:</span> Registered sole proprietor</p>
                <p><span className="font-semibold text-neutral-950">Business registration:</span> Verified DTI registration</p>
                <p><span className="font-semibold text-neutral-950">Validity:</span> March 16, 2024 to March 16, 2029</p>
                <p><span className="font-semibold text-neutral-950">Scope:</span> National</p>
              </div>
            </article>
            <article className="border border-[#ead9a8]/70 bg-[#fff9ed] p-6">
              <div className="grid h-72 place-items-center border border-[#ead9a8]/70 bg-white p-6 text-center shadow-[0_18px_45px_rgba(17,17,17,0.08)]">
                <p className="max-w-xs text-sm font-semibold leading-6 text-neutral-600">Tax registration document available for verification upon request.</p>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#b78a1f]">BIR Certificate of Registration</p>
              <h3 className="mt-3 text-2xl font-bold">Little Jessie Studyo Souvenir Shop</h3>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-neutral-700">
                <p><span className="font-semibold text-neutral-950">Taxpayer:</span> Registered business owner</p>
                <p><span className="font-semibold text-neutral-950">Tax registration:</span> Verified BIR registration</p>
                <p><span className="font-semibold text-neutral-950">Registered office:</span> Revenue District Office No. 046, Cainta-Taytay</p>
                <p><span className="font-semibold text-neutral-950">Registration date:</span> March 27, 2024</p>
                <p><span className="font-semibold text-neutral-950">Line of business:</span> Online shop</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="information" className="border-t border-neutral-200 bg-neutral-950 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d8bd6a]">Customer Confidence</p>
            <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">A transparent company built for everyday orders and special occasions.</h2>
            <p className="mt-4 text-sm leading-7 text-white/65">TGS Enterprises Corp. brings together fashion retail, personalized souvenirs, and event services with organized order handling, clear payment records, and customer-focused support.</p>
            <div className="mt-6 grid gap-2 text-sm text-white/70">
              <p><span className="font-semibold text-white">Email:</span> thegraceshopcainta@gmail.com</p>
              <p><span className="font-semibold text-white">Mobile:</span> 09524804413</p>
              <p><span className="font-semibold text-white">Business Hours:</span> Monday to Sunday, 10:00 AM to 8:00 PM</p>
            </div>
          </div>
          <div className="grid gap-3">
            {companyHighlights.map((item) => (
              <div key={item} className="border border-white/10 bg-white/5 p-4 text-sm font-semibold text-white/85">{item}</div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="bg-neutral-950 py-10 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>
          <p className="text-xl font-black tracking-[0.24em]">TGS</p>
          <p className="mt-2 text-sm text-white/60">Style with Grace</p>
        </div>
        <p className="text-sm text-white/60">Own-brand fashion bags for graceful everyday style.</p>
      </div>
    </footer>
  );
}

export default function App() {
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [productsCatalog, setProductsCatalog] = useState(readSavedProducts);
  const [littleJessieProducts, setLittleJessieProducts] = useState(readLittleJessieProducts);
  const [littleJessieGallery, setLittleJessieGallery] = useState(readLittleJessieGallery);
  const [cartItems, setCartItems] = useState(readSavedCart);
  const [orders, setOrders] = useState(readSavedOrders);
  const [adminUnlocked, setAdminUnlocked] = useState(readAdminSession);
  const [notice, setNotice] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cloudReady, setCloudReady] = useState(!backendEnabled);
  const tgsProductIdsRef = useRef([]);
  const tgsOrderIdsRef = useRef([]);
  const littleJessieProductIdsRef = useRef([]);
  const littleJessieGalleryIdsRef = useRef([]);

  useEffect(() => {
    const syncRoute = () => setRoutePath(window.location.pathname);
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    if (!backendEnabled) return;

    let cancelled = false;
    async function loadCloudData() {
      try {
        const [cloudTgsProducts, cloudTgsOrders, cloudLittleJessieProducts, cloudLittleJessieGallery] = await Promise.all([
          fetchTable("tgs_products"),
          hasBackendAdminSession() ? fetchTable("tgs_orders") : Promise.resolve([]),
          fetchTable("little_jessie_products"),
          fetchTable("little_jessie_gallery"),
        ]);

        if (cancelled) return;

        const nextTgsProducts = Array.isArray(cloudTgsProducts) && cloudTgsProducts.length ? cloudTgsProducts.map(fromDbTgsProduct) : defaultProducts;
        const nextLittleJessieProducts = Array.isArray(cloudLittleJessieProducts) && cloudLittleJessieProducts.length ? cloudLittleJessieProducts.map(fromDbLittleJessieProduct) : defaultLittleJessieProducts;
        const nextLittleJessieGallery = Array.isArray(cloudLittleJessieGallery) && cloudLittleJessieGallery.length ? cloudLittleJessieGallery.map(fromDbLittleJessieGallery) : defaultLittleJessieGallery;
        const nextOrders = Array.isArray(cloudTgsOrders) ? cloudTgsOrders.map(fromDbTgsOrder) : [];

        setProductsCatalog(nextTgsProducts);
        setLittleJessieProducts(nextLittleJessieProducts);
        setLittleJessieGallery(nextLittleJessieGallery);
        setOrders(nextOrders);
        tgsProductIdsRef.current = nextTgsProducts.map((product) => product.id);
        tgsOrderIdsRef.current = nextOrders.map((order) => order.reference);
        littleJessieProductIdsRef.current = nextLittleJessieProducts.map((product) => product.id);
        littleJessieGalleryIdsRef.current = nextLittleJessieGallery.map((item) => item.id);

        if (!Array.isArray(cloudTgsProducts) || cloudTgsProducts.length === 0) await upsertRecords("tgs_products", defaultProducts.map(toDbTgsProduct), "id");
        if (!Array.isArray(cloudLittleJessieProducts) || cloudLittleJessieProducts.length === 0) await upsertRecords("little_jessie_products", defaultLittleJessieProducts.map(toDbLittleJessieProduct), "id");
        if (!Array.isArray(cloudLittleJessieGallery) || cloudLittleJessieGallery.length === 0) await upsertRecords("little_jessie_gallery", defaultLittleJessieGallery.map(toDbLittleJessieGallery), "id");
      } catch (error) {
        console.error(error);
        setNotice("Cloud database is not ready yet. Using browser records for now.");
        window.setTimeout(() => setNotice(""), 3200);
      } finally {
        if (!cancelled) setCloudReady(true);
      }
    }

    loadCloudData();
    return () => { cancelled = true; };
  }, []);

  const isAdminRoute = routePath === "/admin";
  const isLittleJessieRoute = routePath === "/little-jessie-studio";
  const isTheGraceShopRoute = routePath === "/the-grace-shop" || routePath === "/home";
  const isCorporateRoute = routePath === "/";

  const navigatePath = (path) => {
    window.history.pushState({}, "", path);
    setRoutePath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(orderStorageKey, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (!backendEnabled || !adminUnlocked) return;
    fetchTable("tgs_orders")
      .then((cloudOrders) => {
        if (!Array.isArray(cloudOrders)) return;
        const nextOrders = cloudOrders.map(fromDbTgsOrder);
        setOrders(nextOrders);
        tgsOrderIdsRef.current = nextOrders.map((order) => order.reference);
      })
      .catch(console.error);
  }, [adminUnlocked]);

  useEffect(() => {
    if (!cloudReady || !backendEnabled || !adminUnlocked) return;
    syncBackendCollection("tgs_products", "id", productsCatalog, tgsProductIdsRef, toDbTgsProduct).catch(console.error);
  }, [productsCatalog, cloudReady, adminUnlocked]);

  useEffect(() => {
    if (!cloudReady || !backendEnabled || !adminUnlocked) return;
    syncBackendCollection("tgs_orders", "reference", orders, tgsOrderIdsRef, toDbTgsOrder).catch(console.error);
  }, [orders, cloudReady, adminUnlocked]);

  useEffect(() => {
    if (!cloudReady || !backendEnabled || !adminUnlocked) return;
    syncBackendCollection("little_jessie_products", "id", littleJessieProducts, littleJessieProductIdsRef, toDbLittleJessieProduct).catch(console.error);
  }, [littleJessieProducts, cloudReady, adminUnlocked]);

  useEffect(() => {
    if (!cloudReady || !backendEnabled || !adminUnlocked) return;
    syncBackendCollection("little_jessie_gallery", "id", littleJessieGallery, littleJessieGalleryIdsRef, toDbLittleJessieGallery).catch(console.error);
  }, [littleJessieGallery, cloudReady, adminUnlocked]);

  const publishTgsProducts = async (nextProducts = productsCatalog) => {
    localStorage.setItem(productStorageKey, JSON.stringify(nextProducts));

    if (!backendEnabled) {
      setNotice("Bag changes were saved on this browser. Supabase is not configured yet.");
      window.setTimeout(() => setNotice(""), 3200);
      return false;
    }

    try {
      const cloudProducts = await fetchTable("tgs_products");
      const nextIds = nextProducts.map((product) => product.id).filter(Boolean);
      const cloudIds = Array.isArray(cloudProducts) ? cloudProducts.map((product) => product.id).filter(Boolean) : [];
      const removedIds = cloudIds.filter((id) => !nextIds.includes(id));
      await Promise.all(removedIds.map((id) => deleteRecord("tgs_products", "id", id)));
      if (nextProducts.length) await upsertRecords("tgs_products", nextProducts.map(toDbTgsProduct), "id");
      tgsProductIdsRef.current = nextIds;
      setNotice("Bag changes are now live online.");
      window.setTimeout(() => setNotice(""), 3200);
      return true;
    } catch (error) {
      console.error(error);
      setNotice("Bag changes were saved on this browser, but the online database did not accept the update.");
      window.setTimeout(() => setNotice(""), 4200);
      return false;
    }
  };

  const publishLittleJessieProducts = async (nextProducts = littleJessieProducts, options = {}) => {
    localStorage.setItem(littleJessieProductStorageKey, JSON.stringify(nextProducts));

    if (!backendEnabled) {
      localStorage.setItem(littleJessieCloudErrorStorageKey, "Supabase is not configured in Vercel.");
      setNotice("Little Jessie product changes were saved on this browser. Supabase is not configured yet.");
      window.setTimeout(() => setNotice(""), 3200);
      return false;
    }

    try {
      const nextIds = nextProducts.map((product) => product.id).filter(Boolean);
      if (options.removeMissing) {
        const cloudProducts = await fetchTable("little_jessie_products");
        const cloudIds = Array.isArray(cloudProducts) ? cloudProducts.map((product) => product.id).filter(Boolean) : [];
        const removedIds = cloudIds.filter((id) => !nextIds.includes(id));
        await Promise.all(removedIds.map((id) => deleteRecord("little_jessie_products", "id", id)));
      }
      if (nextProducts.length) await upsertRecords("little_jessie_products", nextProducts.map(toDbLittleJessieProduct), "id");
      littleJessieProductIdsRef.current = nextIds;
      localStorage.removeItem(littleJessieCloudErrorStorageKey);
      setNotice("Little Jessie product changes are now live online.");
      window.setTimeout(() => setNotice(""), 3200);
      return true;
    } catch (error) {
      console.error(error);
      localStorage.setItem(littleJessieCloudErrorStorageKey, error.message);
      setNotice("Little Jessie product changes were saved on this browser, but Supabase rejected the online update: " + error.message + ". Check Supabase policies and Vercel environment variables.");
      window.setTimeout(() => setNotice(""), 7000);
      return false;
    }
  };

  const publishLittleJessieGallery = async (nextGallery = littleJessieGallery, options = {}) => {
    localStorage.setItem(littleJessieGalleryStorageKey, JSON.stringify(nextGallery));

    if (!backendEnabled) {
      localStorage.setItem(littleJessieGalleryCloudErrorStorageKey, "Supabase is not configured in Vercel.");
      setNotice("Little Jessie gallery changes were saved on this browser. Supabase is not configured yet.");
      window.setTimeout(() => setNotice(""), 3200);
      return false;
    }

    try {
      const nextIds = nextGallery.map((item) => item.id).filter(Boolean);
      if (options.removeMissing) {
        const cloudGallery = await fetchTable("little_jessie_gallery");
        const cloudIds = Array.isArray(cloudGallery) ? cloudGallery.map((item) => item.id).filter(Boolean) : [];
        const removedIds = cloudIds.filter((id) => !nextIds.includes(id));
        await Promise.all(removedIds.map((id) => deleteRecord("little_jessie_gallery", "id", id)));
      }
      if (nextGallery.length) await upsertRecords("little_jessie_gallery", nextGallery.map(toDbLittleJessieGallery), "id");
      littleJessieGalleryIdsRef.current = nextIds;
      localStorage.removeItem(littleJessieGalleryCloudErrorStorageKey);
      setNotice("Little Jessie gallery changes are now live online.");
      window.setTimeout(() => setNotice(""), 3200);
      return true;
    } catch (error) {
      console.error(error);
      localStorage.setItem(littleJessieGalleryCloudErrorStorageKey, error.message);
      setNotice("Little Jessie gallery changes were saved on this browser, but Supabase rejected the online update: " + error.message + ". Check Supabase policies and Vercel environment variables.");
      window.setTimeout(() => setNotice(""), 7000);
      return false;
    }
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const filteredProducts = useMemo(() => {
    return productsCatalog.filter((product) => {
      const searchText = (product.name + " " + product.category + " " + product.color).toLowerCase();
      const matchesSearch = searchText.includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [productsCatalog, search, selectedCategory]);

  const addToCart = (product, selectedColor = getDefaultColor(product)) => {
    if (product.available === false) {
      setNotice(product.name + " is currently unavailable");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }

    if (product.stock <= 0) {
      setNotice(product.name + " is currently sold out");
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }

    const colorChoice = selectedColor || getDefaultColor(product);
    const cartKey = getCartKey(product, colorChoice);
    let didAdd = false;
    setCartItems((items) => {
      const existing = items.find((item) => (item.cartKey || getCartKey(item, item.selectedColor || getDefaultColor(item))) === cartKey);
      if (existing) {
        if (existing.quantity >= product.stock) return items;
        didAdd = true;
        return items.map((item) => (item.cartKey || getCartKey(item, item.selectedColor || getDefaultColor(item))) === cartKey ? { ...item, quantity: item.quantity + 1 } : item);
      }
      didAdd = true;
      return [...items, { ...product, cartKey, selectedColor: colorChoice, quantity: 1 }];
    });
    setNotice(didAdd ? product.name + " in " + colorChoice + " added to bag" : "Only " + product.stock + " available for " + product.name);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const increaseItem = (cartKey) => {
    setCartItems((items) => items.map((item) => (item.cartKey || item.id) === cartKey ? { ...item, quantity: Math.min(item.stock, item.quantity + 1) } : item));
  };

  const decreaseItem = (cartKey) => {
    setCartItems((items) => items.map((item) => (item.cartKey || item.id) === cartKey ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item));
  };

  const removeItem = (cartKey) => {
    setCartItems((items) => items.filter((item) => (item.cartKey || item.id) !== cartKey));
  };


  const logoutAdmin = () => {
    sessionStorage.removeItem(adminSessionKey);
    signOutBackendAdmin();
    setAdminUnlocked(false);
  };

  const placeOrder = (form) => {
    const stockIssues = cartItems.filter((item) => {
      const catalogProduct = productsCatalog.find((product) => product.id === item.id);
      const availableStock = catalogProduct?.stock ?? item.stock ?? 0;
      return item.quantity > availableStock;
    });

    if (stockIssues.length > 0) {
      const firstIssue = stockIssues[0];
      const availableStock = productsCatalog.find((product) => product.id === firstIssue.id)?.stock ?? 0;
      setNotice(firstIssue.name + " has only " + availableStock + " left. Please update your cart.");
      window.setTimeout(() => setNotice(""), 2600);
      document.getElementById("cart")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const reference = "TGS-" + Date.now().toString().slice(-6);
    const subtotal = cartItems.reduce((sum, item) => sum + getDiscountedPrice(item) * item.quantity, 0);
    const total = subtotal > 0 ? subtotal + deliveryFee : 0;
    const address = [
      form.houseUnit,
      form.street,
      form.barangay,
      form.city,
      form.province,
      form.postalCode,
      form.landmark ? "Landmark: " + form.landmark : "",
    ].filter(Boolean).join(", ");
    const order = {
      reference,
      createdAt: new Date().toISOString(),
      status: "Pending",
      paymentChecked: false,
      paymentMethod: form.payment,
      paymentReceipt: form.paymentReceipt,
      buyer: {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
      },
      address,
      notes: form.notes,
      items: cartItems,
      subtotal,
      deliveryFee,
      total,
    };
    const nextProducts = productsCatalog.map((product) => {
      const orderedQuantity = cartItems
        .filter((item) => item.id === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (!orderedQuantity) return product;
      return { ...product, stock: Math.max(0, (product.stock ?? 0) - orderedQuantity) };
    });
    setProductsCatalog(nextProducts);
    localStorage.setItem(productStorageKey, JSON.stringify(nextProducts));
    setOrders((current) => [order, ...current]);
    if (backendEnabled) insertRecord("tgs_orders", toDbTgsOrder(order)).catch(console.error);
    setOrderPlaced({ fullName: form.fullName, payment: form.payment, reference, createdAt: order.createdAt });
    setCartItems([]);
    localStorage.removeItem(cartStorageKey);
    setNotice("Order placed successfully. Stock updated.");
    window.setTimeout(() => setNotice(""), 2400);
    window.setTimeout(() => {
      document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  if (isCorporateRoute) {
    return <CorporateLandingPage onNavigate={navigatePath} />;
  }

  if (isLittleJessieRoute) {
    return <LittleJessieStudioPage products={littleJessieProducts} gallery={littleJessieGallery} onHome={() => navigatePath("/")} />;
  }

  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-[#fffdf8] text-neutral-950">
        {adminUnlocked ? (
          <AdminDashboard orders={orders} setOrders={setOrders} productsCatalog={productsCatalog} setProductsCatalog={setProductsCatalog} publishTgsProducts={publishTgsProducts} littleJessieProducts={littleJessieProducts} setLittleJessieProducts={setLittleJessieProducts} publishLittleJessieProducts={publishLittleJessieProducts} littleJessieGallery={littleJessieGallery} setLittleJessieGallery={setLittleJessieGallery} publishLittleJessieGallery={publishLittleJessieGallery} onLogout={logoutAdmin} />
        ) : (
          <AdminLoginPanel onLogin={() => setAdminUnlocked(true)} />
        )}
      </div>
    );
  }

  if (!isTheGraceShopRoute) {
    return <CorporateLandingPage onNavigate={navigatePath} />;
  }

  return (
    <div className="min-h-screen bg-[#fffdf8] text-neutral-950">
      <header className="sticky top-0 z-50 border-b border-[#ead9a8]/70 bg-white/90 shadow-[0_8px_30px_rgba(17,17,17,0.04)] backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3 sm:h-20 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigatePath("/the-grace-shop")} className="flex items-center gap-3 text-left" aria-label="TGS home">
            <img src={logo} alt="TGS logo" className="h-10 w-10 object-contain drop-shadow-sm sm:h-14 sm:w-14" />
            <div className="leading-none">
              <p className="text-base font-black tracking-[0.18em] sm:text-xl sm:tracking-[0.22em]">TGS</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#b78a1f] sm:text-[10px] sm:tracking-[0.24em]">Style with Grace</p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <a key={item} href={"#" + item.toLowerCase()} className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-600 transition hover:text-[#b78a1f]">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigatePath("/")} className="hidden border border-[#ead9a8] bg-[#fff9ed] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[#8a6412] transition hover:bg-[#b78a1f] hover:text-white sm:inline-flex">
              Our Brands
            </button>
            <a href="#cart" className="relative grid h-10 min-w-10 place-items-center border border-neutral-200 px-2 text-[11px] font-bold tracking-[0.12em] transition hover:border-[#b78a1f] sm:h-11 sm:min-w-11 sm:px-3 sm:text-xs sm:tracking-[0.16em]" aria-label="Cart">
              BAG
              {cartCount > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#b78a1f] px-1 text-[11px] text-white">{cartCount}</span>}
            </a>
            <button className="grid h-10 w-12 place-items-center border border-neutral-200 text-[11px] font-bold uppercase tracking-[0.08em] md:hidden" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              Menu
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="ml-auto flex h-full w-72 flex-col bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-8 flex items-center justify-between">
              <img src={logo} alt="TGS logo" className="h-14 w-14 object-contain" />
              <button className="grid h-10 w-16 place-items-center border border-neutral-200 text-xs font-bold uppercase tracking-[0.1em]" type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">Close</button>
            </div>
            <nav className="grid gap-1" aria-label="Mobile navigation">
              <button type="button" onClick={() => { setMenuOpen(false); navigatePath("/"); }} className="border-b border-neutral-100 py-4 text-left text-base font-semibold text-[#8a6412]">Our Brands</button>
              {navItems.map((item) => (
                <a key={item} href={"#" + item.toLowerCase()} onClick={() => setMenuOpen(false)} className="border-b border-neutral-100 py-4 text-base font-semibold">{item}</a>
              ))}
              <a href="#cart" onClick={() => setMenuOpen(false)} className="border-b border-neutral-100 py-4 text-base font-semibold">Cart</a>
            </nav>
          </aside>
        </div>
      )}

      {notice && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-2xl">{notice}</div>}

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={addToCart} />

      <main id="home">
        <section className="mx-auto grid w-full max-w-7xl items-center gap-7 px-4 py-6 sm:px-6 sm:py-10 lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-8">
          <div className="max-w-xl pt-4 lg:pt-0">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b78a1f]">Own-brand fashion bags</p>
            <h1 className="mt-5 font-serif text-[2.6rem] font-bold leading-[0.95] text-neutral-950 sm:text-6xl sm:leading-[0.92] lg:text-7xl">TGS Bags</h1>
            <p className="mt-5 text-base leading-7 text-neutral-600 sm:mt-6 sm:text-xl sm:leading-8">Style with Grace. Elegant bags for women who carry confidence beautifully.</p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <a href="#shop" className="inline-flex items-center justify-center bg-neutral-950 px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#9f7418]">Explore Bags</a>
              <a href="#about" className="inline-flex items-center justify-center border border-[#d7bd72] bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-neutral-950 transition hover:bg-[#fff8e6]">Our Story</a>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden border border-[#ead9a8] bg-[#f7f0df] shadow-[0_30px_80px_rgba(17,17,17,0.12)] sm:min-h-[560px]">
            <img src={heroImage} alt="TGS model carrying a blue crocodile-texture handbag" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-3 bottom-3 border border-white/70 bg-white p-4 shadow-xl sm:bottom-4 sm:left-6 sm:right-auto sm:w-80 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b78a1f]">New collection preview</p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">A graceful first look at The Grace Shop collection: polished details, refined shapes, and boutique confidence.</p>
            </div>
          </div>
        </section>

        <TrustStrip />

        <section id="shop" className="border-y border-[#ead9a8]/70 bg-[#fff9ed] py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">Shop The Grace Shop</p>
                <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">A Graceful Collection, Ready to Carry</h2>
              </div>
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border border-[#ead9a8]/70 bg-white shadow-[0_18px_45px_rgba(17,17,17,0.06)] px-4 py-3 text-sm outline-none transition focus:border-[#b78a1f] md:w-72" placeholder="Search bags" aria-label="Search products" />
            </div>

            <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button key={category} type="button" onClick={() => setSelectedCategory(category)} className={"shrink-0 border px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition " + (selectedCategory === category ? "border-[#b78a1f] bg-[#b78a1f] text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#b78a1f]")}>{category}</button>
              ))}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
              {filteredProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={addToCart} onView={setSelectedProduct} />)}
            </div>
            {filteredProducts.length === 0 && <div className="border border-[#ead9a8]/70 bg-white shadow-[0_18px_45px_rgba(17,17,17,0.06)] p-8 text-center text-neutral-600">No bags matched your search.</div>}
          </div>
        </section>

        <CartSection cartItems={cartItems} onIncrease={increaseItem} onDecrease={decreaseItem} onRemove={removeItem} />

        <CheckoutSection cartItems={cartItems} onPlaceOrder={placeOrder} orderPlaced={orderPlaced} />

        <TrackOrderSection orders={orders} latestOrder={orderPlaced} />

        <HowToOrderSection />

        <PolicySection />

        <section id="about" className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#b78a1f]">About The Grace Shop</p>
          <div>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">Made for Everyday Elegance</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-600">The Grace Shop creates own-brand bags with polished shapes, soft neutrals, and gold-inspired details for women who want practical carry with graceful style.</p>
          </div>
        </section>

        <FAQSection />

        <ContactSection />


      </main>

      <Footer />
    </div>
  );
}
