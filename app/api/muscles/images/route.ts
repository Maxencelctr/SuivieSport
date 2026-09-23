import { NextResponse } from 'next/server';

// Route interne : /api/muscles/images
// Récupère la liste des muscles wger avec leurs vraies illustrations
// anatomiques (image_url_main = muscle surligné sur le corps), à superposer
// pour reconstituer un corps complet avec zones colorées.
//
// ⚠️ Comme les autres routes wger, non testée en conditions réelles (pas
// d'accès internet sortant dans mon environnement). Si les champs renvoyés
// diffèrent de ce qu'attend le parsing, il faudra l'ajuster ce soir en
// regardant la vraie réponse de https://wger.de/api/v2/muscle/?format=json

export async function GET() {
  try {
    const res = await fetch('https://wger.de/api/v2/muscle/?format=json&limit=50', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 }, // ces données ne changent quasi jamais
    });

    if (!res.ok) {
      return NextResponse.json({ muscles: [], error: `wger a répondu ${res.status}` });
    }

    const json = await res.json();
    const results: any[] = json.results ?? json ?? [];

    const muscles = results.map((m: any) => ({
      wgerId: m.id,
      isFront: Boolean(m.is_front),
      imageUrlMain: m.image_url_main || null,
      imageUrlSecondary: m.image_url_secondary || null,
    }));

    return NextResponse.json({ muscles });
  } catch (err) {
    return NextResponse.json({ muscles: [], error: 'Impossible de joindre wger.de' });
  }
}
