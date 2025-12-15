// src/pages/PreviewEvent.tsx
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  fetchEventRsvps,
  fetchMyRsvp,
  rsvpToEvent,
  leaveEventRsvp,
  type GGEvent,
} from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  event?: Partial<GGEvent> & {
    id?: string;
    eventId?: string;
    kind?: string;
    title?: string;
    details?: string;
  };
};

type BucketRow = {
  uid?: string | null;

  household_id?: string | null;
  householdId?: string | null;

  last_name?: string | null;
  lastName?: string | null;
  householdLastName?: string | null;

  neighborhood?: string | null;

  household_type?: string | null;
  householdType?: string | null;

  child_ages?: number[];
  childAges?: number[];

  child_sexes?: (string | null)[];
  childSexes?: (string | null)[];
};

type Buckets = { going: BucketRow[]; maybe: BucketRow[]; cant: BucketRow[] };

function asArray<T = any>(x: any): T[] {
  return Array.isArray(x) ? x : [];
}

function pickName(h: any) {
  const v =
    h?.last_name ??
    h?.lastName ??
    h?.householdLastName ??
    h?.displayLastName ??
    h?.display_last_name ??
    h?.name;

  return v && String(v).trim().length > 0 ? String(v) : "Household";
}

function pickNeighborhood(h: any) {
  const v = h?.neighborhood;
  return v && String(v).trim().length > 0 ? String(v) : null;
}

function pickType(h: any) {
  const v = h?.household_type ?? h?.householdType ?? h?.type;
  return v && String(v).trim().length > 0 ? String(v) : null;
}

function pickKids(h: any) {
  const ages = asArray<number>(h?.child_ages ?? h?.childAges).filter(
    (n) => typeof n === "number" && Number.isFinite(n)
  );
  const sexes = asArray<any>(h?.child_sexes ?? h?.childSexes).map((s) =>
    s ? String(s).toUpperCase() : null
  );

  if (!ages.length && !sexes.length) return null;

  const parts: string[] = [];
  const max = Math.max(ages.length, sexes.length);
  for (let i = 0; i < max; i++) {
    const a = ages[i];
    const s = sexes[i];
    const ageStr = typeof a === "number" ? `${a}` : "";
    const sexStr = s ? s.replace(/[^A-Z]/g, "").slice(0, 1) : "";
    const combined = `${ageStr}${sexStr}`.trim();
    if (combined) parts.push(combined);
  }
  return parts.length ? parts.join(", ") : null;
}

export default function PreviewEvent({ open, onClose, event }: Props) {
  const eventId = useMemo(() => {
    const eid = (event as any)?.eventId || (event as any)?.id;
    return typeof eid === "string" && eid.trim().length > 0 ? eid : null;
  }, [event]);

  const title = event?.title || "Happening Now";
  const details = event?.details || "";

  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [buckets, setBuckets] = useState<Buckets>({ going: [], maybe: [], cant: [] });
  const [myStatus, setMyStatus] = useState<"going" | "maybe" | "declined" | null>(null);

  // show exactly what the UI is receiving
  const [debugOpen, setDebugOpen] = useState(false);

  async function refresh() {
    if (!eventId) {
      setLoadErr("Missing event id (eventId).");
      return;
    }

    setLoading(true);
    setLoadErr(null);

    try {
      const [rawB, rawMe] = await Promise.all([fetchEventRsvps(eventId), fetchMyRsvp(eventId)]);
      const b: any = (rawB as any)?.data ?? rawB;
      const me: any = (rawMe as any)?.data ?? rawMe;

      // Accept any shape:
      // {going:[], maybe:[], cant:[]}
      // {items:{going:[], ...}}
      const bucketSource = b?.items && !Array.isArray(b.items) ? b.items : b;

      const safeBuckets: Buckets = {
        going: asArray(bucketSource?.going),
        maybe: asArray(bucketSource?.maybe),
        cant: asArray(bucketSource?.cant),
      };

      setBuckets(safeBuckets);
      setMyStatus((me?.userStatus as any) ?? null);
    } catch (e: any) {
      setLoadErr(e?.response?.data?.detail || e?.message || "Unable to load RSVPs right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId]);

  async function setRsvp(status: "going" | "maybe" | "declined") {
    if (!eventId) return;
    setLoading(true);
    setLoadErr(null);
    try {
      await rsvpToEvent(eventId, status === "declined" ? ("cant" as any) : (status as any));
      await refresh();
    } catch (e: any) {
      setLoadErr(e?.response?.data?.detail || e?.message || "Unable to RSVP.");
      setLoading(false);
    }
  }

  async function clearRsvp() {
    if (!eventId) return;
    setLoading(true);
    setLoadErr(null);
    try {
      await leaveEventRsvp(eventId);
      await refresh();
    } catch (e: any) {
      setLoadErr(e?.response?.data?.detail || e?.message || "Unable to remove RSVP.");
      setLoading(false);
    }
  }

  const respondedCount = buckets.going.length + buckets.maybe.length + buckets.cant.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-4xl rounded-3xl bg-white shadow-xl"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6">
              <div className="min-w-0">
                <div className="text-xs tracking-widest text-gray-500">RSVPS</div>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{title}</div>
                <div className="mt-1 text-gray-600">{details}</div>

                {/* 🔥 IF YOU DON'T SEE THIS, YOU ARE NOT USING THIS FILE */}
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-900 ring-1 ring-yellow-200">
                  ✅ PreviewEvent.tsx ACTIVE — build 12/14 (marker)
                </div>

                <div className="mt-2 text-sm text-gray-500">
                  {respondedCount} household{respondedCount === 1 ? "" : "s"} responded
                </div>

                {!eventId && (
                  <div className="mt-3 text-sm text-red-600">
                    Missing event id. (PreviewEvent.tsx is not receiving a real event.id / eventId)
                  </div>
                )}
              </div>

              <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!eventId || loading}
                  onClick={() => setRsvp("going")}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    myStatus === "going" ? "bg-green-600 text-white" : "bg-green-50 text-green-700"
                  }`}
                >
                  ✅ Going
                </button>

                <button
                  disabled={!eventId || loading}
                  onClick={() => setRsvp("maybe")}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    myStatus === "maybe" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  🤔 Maybe
                </button>

                <button
                  disabled={!eventId || loading}
                  onClick={() => setRsvp("declined")}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    myStatus === "declined" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  🚫 Can’t go
                </button>

                <button
                  disabled={!eventId || loading}
                  onClick={clearRsvp}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  Clear
                </button>

                <button
                  disabled={!eventId}
                  onClick={() => setDebugOpen((v) => !v)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  {debugOpen ? "Hide debug" : "Show debug"}
                </button>
              </div>

              {debugOpen && (
                <div className="mt-4 rounded-2xl bg-gray-900 p-4 text-xs text-gray-100">
                  <div className="mb-2 font-semibold text-gray-200">Debug: buckets.going[0]</div>
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(buckets.going?.[0] ?? null, null, 2)}
                  </pre>
                </div>
              )}

              <div className="mt-6 border-t pt-6">
                {loadErr && <div className="mb-4 text-sm text-red-600">{loadErr}</div>}
                {loading && <div className="text-sm text-gray-500">Loading…</div>}

                {!loading && !loadErr && (
                  <div className="space-y-4">
                    <Section title={`✅ Going (${buckets.going.length})`}>
                      {buckets.going.length ? buckets.going.map((h, idx) => <Row key={(h as any)?.uid ?? idx} h={h} />) : <Empty />}
                    </Section>

                    <Section title={`🤔 Maybe (${buckets.maybe.length})`}>
                      {buckets.maybe.length ? buckets.maybe.map((h, idx) => <Row key={(h as any)?.uid ?? idx} h={h} />) : <Empty />}
                    </Section>

                    <Section title={`🚫 Can’t go (${buckets.cant.length})`}>
                      {buckets.cant.length ? buckets.cant.map((h, idx) => <Row key={(h as any)?.uid ?? idx} h={h} />) : <Empty />}
                    </Section>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-gray-800">{title}</div>
      <div className="rounded-2xl bg-gray-50 p-3">{children}</div>
    </div>
  );
}

function Row({ h }: { h: BucketRow }) {
  const name = pickName(h as any);
  const nhood = pickNeighborhood(h as any);
  const type = pickType(h as any);
  const kids = pickKids(h as any);

  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-gray-100">
      <div className="text-sm font-semibold text-gray-900">{name}</div>

      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
        {nhood && <span className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-100">📍 {nhood}</span>}
        {type && <span className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-100">🏡 {type}</span>}
        {kids && <span className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-100">👧👦 {kids}</span>}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="px-2 py-2 text-sm text-gray-500">No households yet.</div>;
}
