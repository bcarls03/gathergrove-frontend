// src/lib/api.ts
import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Always send dev headers locally (use sane fallbacks if .env missing)
const defaultHeaders: Record<string, string> = {
  Authorization: `Bearer ${import.meta.env.VITE_DEV_BEARER || "dev"}`,
  "X-Uid": import.meta.env.VITE_DEV_UID || "demo-uid-123",
  "X-Email": import.meta.env.VITE_DEV_EMAIL || "brian@example.com",
  "X-Admin": (import.meta.env.VITE_DEV_ADMIN || "true") as string,
};

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: defaultHeaders,
});

// --- health check ---
export async function pingBackend(): Promise<{
  ok: boolean;
  endpoint: string;
  status: number;
  baseURL: string;
  error?: string;
}> {
  try {
    const r = await api.get("/openapi.json");
    return { ok: true, endpoint: "/openapi.json", status: r.status, baseURL };
  } catch {
    try {
      const r = await api.get("/");
      return { ok: true, endpoint: "/", status: r.status, baseURL };
    } catch (err) {
      const ae = err as AxiosError;
      return {
        ok: false,
        endpoint: "/openapi.json|/",
        status: ae.response?.status ?? 0,
        baseURL,
        error: ae.message,
      };
    }
  }
}

// --- API helpers ---
export async function fetchUsers() {
  const { data } = await api.get("/users");
  return data;
}

export async function fetchEvents(params?: Record<string, string | number | boolean>) {
  const { data } = await api.get("/events", { params });
  return data;
}
