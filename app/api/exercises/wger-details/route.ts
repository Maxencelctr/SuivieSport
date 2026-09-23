import { NextRequest, NextResponse } from 'next/server';

// Route interne : /api/exercises/wger-details?wger_id=123
// Récupère la fiche complète d'un exercice sur wger.de : description et
// muscles primaires/secondaires (par id wger, à faire correspondre ensuite
// à la table `muscles` locale via son wger_id).

export async function GET(request: NextRequest) {
  const wgerId = request.nextUrl.searchParams.get('wger_id');

  if (!wgerId) {
    return NextResponse.json({ error: 'wger_id manquant' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${wgerId}/?format=json`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `wger a répondu ${res.status}` }, { status: 200 });
    }

    const data = await res.json();

    // La description vit dans "translations" (une par langue) sur les versions
    // récentes de l'API, ou directement sur l'objet pour les plus anciennes.
    const translations: any[] = data.translations ?? [];
    const englishTranslation = translations.find((t: any) => t.language === 2) ?? translations[0];
    const rawDescription = englishTranslation?.description ?? data.description ?? '';
    const description = String(rawDescription).replace(/<[^>]+>/g, '').trim() || null;

    const primaryMuscles: number[] = (data.muscles ?? []).map((m: any) => m.id).filter(Boolean);
    const secondaryMuscles: number[] = (data.muscles_secondary ?? []).map((m: any) => m.id).filter(Boolean);

    return NextResponse.json({ description, primaryMuscles, secondaryMuscles });
  } catch (err) {
    return NextResponse.json({ error: 'Impossible de joindre wger.de' }, { status: 200 });
  }
}
