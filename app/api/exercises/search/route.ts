import { NextRequest, NextResponse } from 'next/server';

// Route interne : /api/exercises/search?q=squat
// Fait le pont vers l'API publique de wger.de (gratuite, pas de clé requise
// pour les endpoints GET) pour ne pas taper dessus directement depuis le
// navigateur et éviter d'éventuels soucis de CORS.
//
// wger a supprimé son endpoint `exercise/search/` (404 désormais — "search"
// est interprété comme un id par la route de détail). Il n'y a plus aucun
// paramètre de recherche côté serveur sur `exercise-translation/` non plus
// (name, name__icontains, search sont tous ignorés). La seule option fiable :
// récupérer la liste complète des exercices via `exerciseinfo/` (~910
// entrées) et filtrer nous-même par nom, en local.
//
// Cette réponse pèse ~7Mo, au-dessus de la limite de 2Mo du cache fetch de
// Next.js (qui échoue silencieusement à mettre en cache et re-télécharge
// tout à chaque requête, ~15-20s). On garde donc nous-mêmes en mémoire du
// process une version compacte (juste ce dont la recherche a besoin),
// rafraîchie une fois par jour.

const CATEGORY_TO_MUSCLE_GROUP: Record<string, string> = {
  Chest: 'pecs',
  Back: 'dos',
  Legs: 'jambes',
  Shoulders: 'epaules',
  Arms: 'bras',
  Abs: 'abdos',
  Calves: 'jambes',
  Cardio: 'cardio',
};

// Même référentiel que les 15 muscles seedés dans supabase/schema.sql (id
// wger -> nom FR), pour afficher le muscle précis plutôt que la seule
// catégorie large ("jambes") dans les résultats de recherche.
const WGER_MUSCLE_NAME_FR: Record<number, string> = {
  1: 'Biceps',
  2: 'Deltoïde antérieur',
  3: 'Dentelé antérieur',
  4: 'Grand pectoral',
  5: 'Obliques',
  6: 'Mollet (gastrocnémien)',
  7: 'Abdominaux',
  8: 'Grand fessier',
  9: 'Trapèzes',
  10: 'Quadriceps',
  11: 'Ischio-jambiers',
  12: 'Grand dorsal',
  13: 'Brachial',
  14: 'Triceps',
  15: 'Mollet (soléaire)',
};

const ENGLISH_LANGUAGE_ID = 2;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface WgerExerciseInfo {
  id: number;
  category?: { name?: string } | null;
  images?: { image: string; is_main: boolean }[];
  muscles?: { id: number }[];
  translations?: { language: number; name: string }[];
}

interface SearchableExercise {
  wger_id: number;
  name: string;
  normalized_name: string;
  muscle_group: string;
  muscles: string[];
  muscle_ids: number[];
  image_url: string | null;
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

let cache: { data: SearchableExercise[]; fetchedAt: number } | null = null;

async function getExercises(): Promise<SearchableExercise[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const res = await fetch('https://wger.de/api/v2/exerciseinfo/?limit=1000&format=json', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`wger a répondu ${res.status}`);

  const json = await res.json();
  const raw: WgerExerciseInfo[] = json.results ?? [];

  const data: SearchableExercise[] = raw
    .map((ex) => {
      const translation =
        ex.translations?.find((t) => t.language === ENGLISH_LANGUAGE_ID) ?? ex.translations?.[0];
      if (!translation?.name) return null;

      const category = ex.category?.name ?? null;
      const mainImage = ex.images?.find((i) => i.is_main) ?? ex.images?.[0] ?? null;
      const muscleIds = (ex.muscles ?? []).map((m) => m.id);
      const muscles = muscleIds.map((id) => WGER_MUSCLE_NAME_FR[id]).filter((name): name is string => Boolean(name));

      return {
        wger_id: ex.id,
        name: translation.name,
        normalized_name: normalize(translation.name),
        muscle_group: (category && CATEGORY_TO_MUSCLE_GROUP[category]) ?? 'autre',
        muscles,
        muscle_ids: muscleIds,
        image_url: mainImage?.image ?? null,
      };
    })
    .filter((r): r is SearchableExercise => r !== null);

  cache = { data, fetchedAt: Date.now() };
  return data;
}

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get('q')?.trim();
  const muscleParam = request.nextUrl.searchParams.get('muscle');

  if (muscleParam) {
    const muscleId = Number(muscleParam);
    try {
      const exercises = await getExercises();
      // Priorité aux exercices qui ont une image (suggestions plus parlantes)
      const results = exercises
        .filter((ex) => ex.muscle_ids.includes(muscleId))
        .sort((a, b) => Number(Boolean(b.image_url)) - Number(Boolean(a.image_url)))
        .slice(0, 6)
        .map(({ normalized_name, muscle_ids, ...rest }) => rest);

      return NextResponse.json({ results });
    } catch (err) {
      return NextResponse.json({ results: [], error: 'Impossible de joindre wger.de' });
    }
  }

  if (!term || term.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const exercises = await getExercises();
    const needle = normalize(term);

    const results = exercises
      .filter((ex) => ex.normalized_name.includes(needle))
      .slice(0, 15)
      .map(({ normalized_name, muscle_ids, ...rest }) => rest);

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ results: [], error: 'Impossible de joindre wger.de' });
  }
}
