const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backendEnabled = Boolean(supabaseUrl && supabaseAnonKey);

async function supabaseRequest(table, options = {}) {
  if (!backendEnabled) return null;
  const { method = "GET", body, query = "select=*", headers = {} } = options;
  const separator = query ? "?" : "";
  const response = await fetch(supabaseUrl + "/rest/v1/" + table + separator + query, {
    method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: "Bearer " + supabaseAnonKey,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error("Backend request failed: " + response.status + " " + response.statusText);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function fetchTable(table) {
  return supabaseRequest(table);
}

export async function insertRecord(table, record) {
  return supabaseRequest(table, { method: "POST", body: record });
}

export async function upsertRecords(table, records) {
  if (!Array.isArray(records) || records.length === 0) return null;
  return supabaseRequest(table, {
    method: "POST",
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
