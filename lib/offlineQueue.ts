import { supabase } from './supabase';

const STORAGE_KEY = 'volt_offline_session_queue';

export interface QueuedSet {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  side: 'gauche' | 'droit' | null;
}

export interface QueuedSession {
  id: string;
  date: string;
  time: string | null;
  notes: string | null;
  duration_minutes: number;
  feeling: number;
  sets: QueuedSet[];
  queuedAt: string;
}

function genId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function getQueue(): QueuedSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function queueSession(payload: Omit<QueuedSession, 'id' | 'queuedAt'>): QueuedSession {
  const entry: QueuedSession = { ...payload, id: genId(), queuedAt: new Date().toISOString() };
  setQueue([...getQueue(), entry]);
  return entry;
}

// Rejoue les séances en attente vers Supabase, dans l'ordre. S'arrête à la
// première erreur (probablement toujours hors-ligne) pour ne pas boucler
// inutilement — les suivantes restent en file pour le prochain essai.
export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  const queue = getQueue();
  let synced = 0;

  for (const entry of queue) {
    const { data: session, error } = await supabase
      .from('strength_sessions')
      .insert({ date: entry.date, time: entry.time, notes: entry.notes, duration_minutes: entry.duration_minutes, feeling: entry.feeling })
      .select()
      .single();

    if (error || !session) break;

    const rows = entry.sets.map((s) => ({ ...s, session_id: session.id }));
    const { error: setsError } = await supabase.from('strength_sets').insert(rows);
    if (setsError) break;

    synced++;
    setQueue(getQueue().filter((q) => q.id !== entry.id));
  }

  return { synced, remaining: getQueue().length };
}
