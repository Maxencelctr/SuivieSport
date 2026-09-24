import { NextRequest, NextResponse } from 'next/server';

// Route interne : /api/exercises/demo?name=Bench%20Press
// Cherche une démo (2 photos : position départ/fin) pour un exercice dans
// free-exercise-db (yuhonas/free-exercise-db), une base d'exercices du
// domaine public, servie via jsDelivr (gratuit, pas de clé). Les noms ne
// correspondent pas forcément mot pour mot à ceux de wger (notre source
// principale), donc on fait un matching approximatif par mots-clés plutôt
// qu'une recherche exacte.

const DB_URL = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json';
const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface DbExercise {
  name: string;
  images: string[];
}

interface IndexedExercise {
  name: string;
  words: Set<string>;
  images: string[];
}

const STOPWORDS = new Set(['with', 'and', 'the', 'of', 'a', 'an', 'to', 'on', 'in']);

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  );
}

let cache: { data: IndexedExercise[]; fetchedAt: number } | null = null;

async function getIndex(): Promise<IndexedExercise[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  const res = await fetch(DB_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`free-exercise-db a répondu ${res.status}`);
  const raw: DbExercise[] = await res.json();

  const data: IndexedExercise[] = raw
    .filter((e) => e.images && e.images.length > 0)
    .map((e) => ({ name: e.name, words: words(e.name), images: e.images }));

  cache = { data, fetchedAt: Date.now() };
  return data;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')?.trim();
  if (!name) return NextResponse.json({ images: null });

  try {
    const index = await getIndex();
    const needle = words(name);
    if (needle.size === 0) return NextResponse.json({ images: null });

    // Score = proportion des mots de la requête retrouvés dans le nom candidat
    // (+ bonus si le candidat n'a pas beaucoup de mots en plus, pour éviter
    // qu'un nom très générique batte un nom précis).
    let best: { score: number; exercise: IndexedExercise } | null = null;
    for (const candidate of index) {
      const overlap = [...needle].filter((w) => candidate.words.has(w)).length;
      if (overlap === 0) continue;
      const score = overlap / Math.max(needle.size, candidate.words.size);
      if (!best || score > best.score) best = { score, exercise: candidate };
    }

    if (!best || best.score < 0.4) return NextResponse.json({ images: null });

    const images = best.exercise.images.slice(0, 2).map((path) => `${IMAGE_BASE}/${path}`);
    return NextResponse.json({ images, matchedName: best.exercise.name });
  } catch (err) {
    return NextResponse.json({ images: null, error: 'Impossible de joindre free-exercise-db' });
  }
}
