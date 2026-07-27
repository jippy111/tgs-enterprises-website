const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAdminSessionKey = "tgs-supabase-admin-session";
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const backendEnabled = Boolean(supabaseUrl && supabaseAnonKey);
export const cloudinaryEnabled = Boolean(cloudinaryCloudName && cloudinaryUploadPreset);

export function readBackendAdminSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(supabaseAdminSessionKey) || "{}");
    if (!session.access_token || !session.expires_at) return null;
    if (Date.now() >= Number(session.expires_at) * 1000) {
      sessionStorage.removeItem(supabaseAdminSessionKey);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function getAuthToken() {
  return readBackendAdminSession()?.access_token || supabaseAnonKey;
}

export function hasBackendAdminSession() {
  return Boolean(readBackendAdminSession());
}

export function signOutBackendAdmin() {
  sessionStorage.removeItem(supabaseAdminSessionKey);
}

export async function signInBackendAdmin(email, password) {
  if (!backendEnabled) throw new Error("Backend is not configured.");
  const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: "Bearer " + supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    let message = "Invalid admin email or password.";
    try {
      const details = await response.json();
      message = details.error_description || details.msg || details.message || message;
    } catch {
      message = "Admin login request failed. Please check the Supabase URL and publishable key in Vercel.";
    }
    throw new Error(message);
  }

  const session = await response.json();
  sessionStorage.setItem(supabaseAdminSessionKey, JSON.stringify(session));
  return session;
}

async function supabaseRequest(table, options = {}) {
  if (!backendEnabled) return null;
  const { method = "GET", body, query = "select=*", headers = {} } = options;
  const separator = query ? "?" : "";
  const response = await fetch(supabaseUrl + "/rest/v1/" + table + separator + query, {
    method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: "Bearer " + getAuthToken(),
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = await response.json();
      details = payload.message || payload.msg || payload.details || payload.hint || "";
    } catch {
      details = await response.text().catch(() => "");
    }
    throw new Error("Backend request failed: " + response.status + " " + response.statusText + (details ? " - " + details : ""));
  }

  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

export async function fetchTable(table) {
  return supabaseRequest(table);
}

export async function insertRecord(table, record) {
  return supabaseRequest(table, { method: "POST", body: record });
}

export async function upsertRecords(table, records, conflictKey = "") {
  if (!Array.isArray(records) || records.length === 0) return null;
  const query = conflictKey ? "on_conflict=" + encodeURIComponent(conflictKey) : "";
  return supabaseRequest(table, {
    method: "POST",
    query,
    body: records,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  });
}

export async function updateRecord(table, primaryKey, value, record) {
  return supabaseRequest(table, {
    method: "PATCH",
    query: primaryKey + "=eq." + encodeURIComponent(value),
    body: record,
  });
}

export async function deleteRecord(table, primaryKey, value) {
  return supabaseRequest(table, {
    method: "DELETE",
    query: primaryKey + "=eq." + encodeURIComponent(value),
  });
}

export async function uploadPublicImage(bucket, path, file) {
  if (!backendEnabled) throw new Error("Supabase is not configured.");
  const response = await fetch(supabaseUrl + "/storage/v1/object/" + bucket + "/" + path, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: "Bearer " + getAuthToken(),
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: file,
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = await response.json();
      details = payload.message || payload.error || "";
    } catch {
      details = await response.text().catch(() => "");
    }
    throw new Error("Storage upload failed: " + response.status + " " + response.statusText + (details ? " - " + details : ""));
  }

  return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + path;
}

export async function uploadCloudinaryImage(file, folder = "tgs-enterprises") {
  if (!cloudinaryEnabled) throw new Error("Cloudinary is not configured.");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", cloudinaryUploadPreset);
  formData.append("folder", folder);

  const response = await fetch("https://api.cloudinary.com/v1_1/" + cloudinaryCloudName + "/image/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = await response.json();
      details = payload.error?.message || payload.message || "";
    } catch {
      details = await response.text().catch(() => "");
    }
    throw new Error("Cloudinary upload failed: " + response.status + " " + response.statusText + (details ? " - " + details : ""));
  }

  const payload = await response.json();
  return payload.secure_url;
}

export async function uploadCloudinaryImageViaServer(image, folder = "tgs-enterprises") {
  const response = await fetch("/api/cloudinary-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, folder }),
  });

  if (!response.ok) {
    let details = "";
    try {
      const payload = await response.json();
      details = payload.error || payload.message || "";
    } catch {
      details = await response.text().catch(() => "");
    }
    throw new Error("Server image upload failed: " + response.status + " " + response.statusText + (details ? " - " + details : ""));
  }

  const payload = await response.json();
  if (!payload.url) throw new Error("Server image upload did not return an image URL.");
  return payload.url;
}
