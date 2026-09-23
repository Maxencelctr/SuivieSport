import { NextRequest, NextResponse } from 'next/server';

// Route interne : /api/exercises/search?q=squat
// Fait le pont vers l'API publique de wger.de (gratuite, pas de clé requise
// pour les endpoints GET) pour ne pas taper dessus directement depuis le
// navigateur et éviter d'éventuels soucis de CORS.
//
// ⚠️ À tester/ajuster une fois en conditions réelles : la doc publique de
// wger a changé plusieurs fois de forme de réponse selon les versions.
// Le parsing ci-dessous essaie plusieurs formes possibles pour être robuste.

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

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get('q')?.trim();

  if (!term || term.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(term)}&language=english&format=json`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `wger a répondu ${res.status}` });
    }

    const json = await res.json();
    const rawResults: any[] = json.suggestions ?? json.results ?? json.data ?? [];

    const results = rawResults
      .map((item: any) => {
        const data = item.data ?? item;
        const wgerId = data.base_id ?? data.id ?? data.exerciseId ?? null;
        const name = item.value ?? data.name ?? null;
        const category = data.category?.name ?? data.category ?? null;
        const image = data.image ?? (Array.isArray(data.images) ? data.images[0] : null) ?? null;

        if (!wgerId || !name) return null;

        return {
          wger_id: Number(wgerId),
          name: String(name),
          muscle_group: CATEGORY_TO_MUSCLE_GROUP[category] ?? 'autre',
          image_url: image,
        };
      })
      .filter(Boolean);

    // Dédoublonne par wger_id (les traductions peuvent créer des doublons)
    const seen = new Set<number>();
    const deduped = results.filter((r: any) => {
      if (seen.has(r.wger_id)) return false;
      seen.add(r.wger_id);
      return true;
    });

    return NextResponse.json({ results: deduped.slice(0, 15) });
  } catch (err) {
    return NextResponse.json({ results: [], error: 'Impossible de joindre wger.de' });
  }
}
