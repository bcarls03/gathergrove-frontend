import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

export async function pingBackend() {
  // Try a very safe endpoint; fall back to root
  try {
    const r = await api.get("/openapi.json"); // FastAPI always exposes this
    return { ok: true, endpoint: "/openapi.json", status: r.status };
  } catch {
    const r = await api.get("/");
    return { ok: true, endpoint: "/", status: r.status };
  }
}
