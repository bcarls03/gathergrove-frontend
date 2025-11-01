import { useState } from "react";
import { pingBackend } from "../lib/api";

export default function Home() {
  const [result, setResult] = useState<string>("");

  async function handlePing() {
    setResult("Pinging...");
    try {
      const res = await pingBackend();
      setResult(`✅ Backend reachable at ${res.endpoint} (status ${res.status})`);
    } catch (e: any) {
      setResult(`❌ Failed: ${e?.message ?? "unknown error"}`);
    }
  }

  return (
    <div className="p-4 text-xl">
      <div>Home</div>
      <button
        onClick={handlePing}
        style={{ marginTop: 16, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}
      >
        Ping backend
      </button>
      {result && <div style={{ marginTop: 12, fontSize: 14 }}>{result}</div>}
    </div>
  );
}
