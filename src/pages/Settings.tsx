// src/pages/Settings.tsx
import { useEffect, useState, type FormEvent } from "react";
import { CURRENT_UID } from "../lib/api";
import {
  getOverride,
  saveOverride,
  loadNeighbors,
  addNeighbor,
  removeNeighbor,
} from "../lib/profile";
import Logo from "../assets/gathergrove-logo.png";

const SHOW_DEV_TOOLS = true; // flip to false before pilot if you want

export default function Settings() {
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState<
    "" | "Family w/ Kids" | "Empty Nesters" | "Singles/Couples"
  >("");
  const [flash, setFlash] = useState<string | null>(null);

  const [nLast, setNLast] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nType, setNType] = useState<
    "" | "Family w/ Kids" | "Empty Nesters" | "Singles/Couples"
  >("");
  const [neighbors, setNeighbors] = useState(loadNeighbors());

  useEffect(() => {
    const o = getOverride(CURRENT_UID);
    if (o?.last_name) setLastName(o.last_name);
    if (o?.householdType) setType(o.householdType as any);
  }, []);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    saveOverride(CURRENT_UID, {
      last_name: lastName.trim() || undefined,
      householdType: type || undefined,
    });
    setFlash("Saved ✅");
    setTimeout(() => setFlash(null), 2000);
  };

  const addDemo = (e: FormEvent) => {
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
    <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <style>{`
        .settings-title {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: .02em;
          color: #0f172a;
          margin: 0;
        }
        .settings-sub {
          font-size: 14px;
          color: #6b7280;
          margin: 2px 0 10px;
        }
        .settings-card {
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,.35);
          background: rgba(255,255,255,0.96);
          padding: 14px 16px 16px;
          box-shadow: 0 6px 16px rgba(15,23,42,0.05);
          margin-bottom: 16px;
        }
        .settings-card-header {
          display:flex;
          align-items:flex-start;
          gap:10px;
          margin-bottom:10px;
        }
        .settings-card-icon {
          width:30px;
          height:30px;
          border-radius:12px;
          border:1px solid #e5e7eb;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:16px;
          background:#ffffff;
        }
        .settings-card-title {
          font-size:16px;
          font-weight:700;
          margin:0;
        }
        .settings-card-helper {
          font-size:13px;
          color:#6b7280;
          margin-top:2px;
        }
        .settings-section-sub {
          font-size: 12px;
          color: #6b7280;
          margin: 4px 0 8px;
        }
        .settings-field-label {
          margin-bottom: 6px;
          font-weight: 600;
          font-size: 13px;
        }
        .settings-input {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          width: 100%;
          font-size: 14px;
          box-sizing: border-box;
        }
        .settings-select {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          width: 100%;
          font-size: 14px;
          background:#ffffff;
          box-sizing: border-box;
        }
        .settings-pill-note {
          font-size:11px;
          padding:4px 8px;
          border-radius:999px;
          border:1px solid #e5e7eb;
          background:#f9fafb;
          color:#6b7280;
          display:inline-block;
        }
        .settings-save-row {
          display:flex;
          justify-content:flex-end;
          margin-top:10px;
          gap:8px;
        }
        .settings-btn {
          padding: 9px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background:#0f172a;
          color:white;
          font-size:14px;
          font-weight:500;
          cursor:pointer;
        }
        .settings-btn-secondary {
          background:#f8fafc;
          color:#0f172a;
        }
        .settings-bullet-list {
          font-size:13px;
          color:#374151;
          padding-left:18px;
          margin:6px 0 0;
        }
        .settings-bullet-list li {
          margin-bottom:4px;
        }
        .settings-meta-row {
          display:flex;
          align-items:center;
          gap:6px;
          font-size:11px;
          color:#6b7280;
          margin-top:8px;
        }
        .settings-badge-outline {
          font-size:11px;
          border-radius:999px;
          padding:2px 8px;
          border:1px solid #cbd5e1;
          background:#f8fafc;
        }
        .settings-dev-avatar {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #eef2ff;
          color: #3730a3;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }
        .settings-dev-remove-btn {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 6px 8px;
          font-size:12px;
          cursor:pointer;
          background:#ffffff;
        }
        .settings-dev-label {
          font-size:11px;
          color:#9ca3af;
          text-transform:uppercase;
          letter-spacing:.14em;
          margin: 4px 4px 2px;
          font-weight:600;
        }
        .settings-dev-label-sub {
          font-size:12px;
          color:#6b7280;
          margin: 0 4px 6px;
        }
      `}</style>

      {/* Header with logo – same style as Home/People */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 2,
        }}
      >
        <img
          src={Logo}
          alt="GatherGrove logo"
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
        <h2 className="settings-title">Settings</h2>
      </div>
      <p className="settings-sub">
        Manage your account, household profile, and privacy.
      </p>

      {flash && (
        <div
          style={{
            margin: "8px 0 12px",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #22c55e",
            background: "#dcfce7",
            color: "#166534",
            display: "inline-block",
            fontSize: 13,
          }}
        >
          {flash}
        </div>
      )}

      {/* ============= Account ============= */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">🔒</div>
          <div>
            <h3 className="settings-card-title">Account</h3>
            <p className="settings-card-helper">
              In a later version you&apos;ll manage your email, password, and
              notifications here.
            </p>
          </div>
        </div>
        <p className="settings-section-sub">
          For this MVP, settings are local to this device only. We&apos;ll wire
          this to your real GatherGrove login soon.
        </p>
        <span className="settings-pill-note">
          Coming soon · email &amp; password management
        </span>
      </section>

      {/* ============= Household ============= */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">🏡</div>
          <div>
            <h3 className="settings-card-title">Household</h3>
            <p className="settings-card-helper">
              These details power how your household appears in the People tab.
            </p>
          </div>
        </div>

        <form
          onSubmit={onSave}
          style={{ display: "grid", gap: 12, marginTop: 4 }}
        >
          <label>
            <div className="settings-field-label">
              Household Last Name{" "}
              <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>
                (required)
              </span>
            </div>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g., Carlberg"
              className="settings-input"
            />
          </label>

          <label>
            <div className="settings-field-label">Household Type</div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="settings-select"
            >
              <option value="">(choose one)</option>
              <option value="Family w/ Kids">Family w/ Kids</option>
              <option value="Empty Nesters">Empty Nesters</option>
              <option value="Singles/Couples">Singles/Couples</option>
            </select>
          </label>

          <div className="settings-save-row">
            <button
              type="button"
              className={"settings-btn settings-btn-secondary"}
              onClick={() => {
                setLastName("");
                setType("");
              }}
            >
              Cancel
            </button>
            <button type="submit" className="settings-btn">
              Save changes
            </button>
          </div>
        </form>

        <p className="settings-section-sub">
          (Local-only for now. We’ll wire this to the backend profile later.)
        </p>
      </section>

      {/* ============= Privacy & Safety ============= */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">🛡️</div>
          <div>
            <h3 className="settings-card-title">Privacy &amp; Safety</h3>
            <p className="settings-card-helper">
              A quick reminder of what your neighbors can see.
            </p>
          </div>
        </div>

        <ul className="settings-bullet-list">
          <li>Household last name</li>
          <li>
            Optional adult first names (you can leave these blank if you prefer)
          </li>
          <li>
            Kids are shown only as{" "}
            <span style={{ fontWeight: 600 }}>Age • Gender</span> — never names
            or birthdays
          </li>
        </ul>

        <div className="settings-meta-row">
          <span role="img" aria-label="info">
            ℹ️
          </span>
          <span>
            Neighborhood access requires a private code. Exact street addresses
            are not shown.
          </span>
        </div>
      </section>

      {/* ============= Developer tools ============= */}
      {SHOW_DEV_TOOLS && (
        <>
          <div className="settings-dev-label">Developer tools · beta only</div>
          <div className="settings-dev-label-sub">
            Only visible in this beta build to help you test neighbors locally.
          </div>

          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">🧪</div>
              <div>
                <h3 className="settings-card-title">
                  Developer tools — demo neighbors (local)
                </h3>
                <p className="settings-card-helper">
                  These demo neighbors live only in your browser&apos;s
                  localStorage. Use them to test the People and Home tabs. This
                  section will not appear in the real neighborhood app.
                </p>
              </div>
            </div>

            <form
              onSubmit={addDemo}
              style={{ display: "grid", gap: 8, maxWidth: 520, marginTop: 4 }}
            >
              <input
                value={nLast}
                onChange={(e) => setNLast(e.target.value)}
                placeholder="Last name (e.g., Johnson)"
                className="settings-input"
              />
              <input
                value={nEmail}
                onChange={(e) => setNEmail(e.target.value)}
                placeholder="Email (optional)"
                className="settings-input"
              />
              <select
                value={nType}
                onChange={(e) => setNType(e.target.value as any)}
                className="settings-select"
              >
                <option value="">(type optional)</option>
                <option value="Family w/ Kids">Family w/ Kids</option>
                <option value="Empty Nesters">Empty Nesters</option>
                <option value="Singles/Couples">Singles/Couples</option>
              </select>
              <div className="settings-save-row">
                <button
                  type="submit"
                  className="settings-btn settings-btn-secondary"
                >
                  + Add neighbor
                </button>
              </div>
            </form>

            {neighbors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {neighbors.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 0",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div className="settings-dev-avatar">
                      {(n.last_name?.[0] || "H").toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {n.last_name ?? "Household"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {n.email ?? "no email"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDemo(n.id)}
                      className="settings-dev-remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="settings-meta-row">
              <span className="settings-badge-outline">Local-only data</span>
              <span>Safe to clear anytime via browser storage.</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
