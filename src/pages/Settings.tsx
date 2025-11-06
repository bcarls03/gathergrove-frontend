// src/pages/Settings.tsx
import { useEffect, useState } from "react";
import { CURRENT_UID } from "../lib/api";
import { getOverride, saveOverride, loadNeighbors, addNeighbor, removeNeighbor } from "../lib/profile";

export default function Settings() {
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState<"" | "Family w/ Kids" | "Empty Nesters" | "Singles/Couples">("");
  const [flash, setFlash] = useState<string | null>(null);

  const [nLast, setNLast] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nType, setNType] = useState<"" | "Family w/ Kids" | "Empty Nesters" | "Singles/Couples">("");
  const [neighbors, setNeighbors] = useState(loadNeighbors());

  useEffect(() => {
    const o = getOverride(CURRENT_UID);
    if (o?.last_name) setLastName(o.last_name);
    if (o?.householdType) setType(o.householdType as any);
  }, []);

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveOverride(CURRENT_UID, {
      last_name: lastName.trim() || undefined,
      householdType: type || undefined,
    });
    setFlash("Saved ✅");
    setTimeout(() => setFlash(null), 2000);
  };

  const addDemo = (e: React.FormEvent) => {
    e.preventDefault();
    addNeighbor({
      last_name: nLast.trim() || undefined,
      email: nEmail.trim() || undefined,
      householdType: nType || undefined,
    });
    setNeighbors(loadNeighbors());
    setNLast("");
    setNEmail("");
    setNType("");
  };

  const removeDemo = (id: string) => {
    removeNeighbor(id);
    setNeighbors(loadNeighbors());
  };

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <h2>Settings</h2>

      {flash && (
        <div style={{ margin: "8px 0", padding: "8px 12px", borderRadius: 8, border: "1px solid #22c55e", background: "#dcfce7", color: "#166534", display: "inline-block" }}>
          {flash}
        </div>
      )}

      {/* Edit my household */}
      <form onSubmit={onSave} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Household Last Name</div>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g., Carlberg" style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }} />
        </label>

        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Household Type</div>
          <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}>
            <option value="">(choose one)</option>
            <option value="Family w/ Kids">Family w/ Kids</option>
            <option value="Empty Nesters">Empty Nesters</option>
            <option value="Singles/Couples">Singles/Couples</option>
          </select>
        </label>

        <button type="submit" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", width: 160 }}>
          Save
        </button>
      </form>

      <p style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        (Local-only for now. We’ll wire this to the backend profile later.)
      </p>

      {/* Demo neighbors */}
      <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #e5e7eb" }} />
      <h3>Demo neighbors (local)</h3>

      <form onSubmit={addDemo} style={{ display: "grid", gap: 8, maxWidth: 520, marginTop: 8 }}>
        <input value={nLast} onChange={(e) => setNLast(e.target.value)} placeholder="Last name (e.g., Johnson)" style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
        <input value={nEmail} onChange={(e) => setNEmail(e.target.value)} placeholder="Email (optional)" style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }} />
        <select value={nType} onChange={(e) => setNType(e.target.value as any)} style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}>
          <option value="">(type optional)</option>
          <option value="Family w/ Kids">Family w/ Kids</option>
          <option value="Empty Nesters">Empty Nesters</option>
          <option value="Singles/Couples">Singles/Couples</option>
        </select>
        <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", width: 160 }}>
          + Add neighbor
        </button>
      </form>

      {neighbors.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {neighbors.map((n) => (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ width: 28, height: 28, borderRadius: 9999, background: "#eef2ff", color: "#3730a3", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {(n.last_name?.[0] || "H").toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{n.last_name ?? "Household"}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{n.email ?? "no email"}</div>
              </div>
              <button onClick={() => removeDemo(n.id)} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 8px" }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
