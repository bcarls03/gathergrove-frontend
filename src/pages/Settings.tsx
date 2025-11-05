// src/pages/Settings.tsx
import { useEffect, useState } from "react";
import { CURRENT_UID } from "../lib/api";
import { getOverride, saveOverride } from "../lib/profile";

export default function Settings() {
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState<"" | "Family w/ Kids" | "Empty Nesters" | "Singles/Couples">("");
  const [flash, setFlash] = useState<string | null>(null);

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
    setTimeout(() => setFlash(null), 2500);
  };

  return (
    <div style={{ padding: 16, maxWidth: 520 }}>
      <h2>Settings</h2>

      {flash && (
        <div
          style={{
            margin: "8px 0",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #22c55e",
            background: "#dcfce7",
            color: "#166534",
            display: "inline-block",
          }}
        >
          {flash}
        </div>
      )}

      <form onSubmit={onSave} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Household Last Name</div>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g., Carlberg"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Household Type</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
          >
            <option value="">(choose one)</option>
            <option value="Family w/ Kids">Family w/ Kids</option>
            <option value="Empty Nesters">Empty Nesters</option>
            <option value="Singles/Couples">Singles/Couples</option>
          </select>
        </label>

        <button
          type="submit"
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", width: 160 }}
        >
          Save
        </button>
      </form>

      <p style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        (Local-only for now. We’ll wire this to the backend profile later.)
      </p>
    </div>
  );
}
