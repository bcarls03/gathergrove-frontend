// src/lib/dm.ts
export type DMThread = {
  id: string;
  participants: { id: string; label: string }[];
  messages: {
    id: string;
    ts: number;
    body: string;
    from: { id: string; label: string };
  }[];
};

const KEY = "gg:dmThreads";

export function loadDMThreads(): DMThread[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveDMThreads(threads: DMThread[]) {
  localStorage.setItem(KEY, JSON.stringify(threads));
}

export function getOrCreateThread(userA: any, userB: any): DMThread {
  const threads = loadDMThreads();

  const match = threads.find((t) =>
    t.participants.some((p) => p.id === userA.id) &&
    t.participants.some((p) => p.id === userB.id)
  );

  if (match) return match;

  const newThread: DMThread = {
    id: crypto.randomUUID(),
    participants: [
      { id: userA.id, label: userA.label },
      { id: userB.id, label: userB.label },
    ],
    messages: []
  };

  threads.push(newThread);
  saveDMThreads(threads);

  return newThread;
}
