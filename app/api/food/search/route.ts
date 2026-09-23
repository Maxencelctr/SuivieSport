import { NextRequest, NextResponse } from 'next/server';

// Route interne : /api/food/search?q=poulet
// Fait le pont vers l'API publique Open Food Facts (gratuite, sans clé).
// Doc: https://openfoodfacts.github.io/openfoodfacts-server/api/

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get('q')?.trim();

  if (!term || term.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}` +
      `&search_simple=1&action=process&json=1&page_size=15&lc=fr`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Open Food Facts a répondu ${res.status}` });
    }

    const json = await res.json();
    const products: any[] = json.products ?? [];

    const results = products
      .filter((p) => p.product_name && p.nutriments && p.nutriments.proteins_100g != null)
      .map((p) => ({
        off_code: p.code ?? null,
        name: p.product_name as string,
        brand: p.brands ?? null,
        protein_100g: Number(p.nutriments.proteins_100g) || 0,
        calories_100g: Number(p.nutriments['energy-kcal_100g']) || null,
        carbs_100g: Number(p.nutriments.carbohydrates_100g) || null,
        fat_100g: Number(p.nutriments.fat_100g) || null,
      }))
      .slice(0, 15);

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ results: [], error: 'Impossible de joindre Open Food Facts' });
  }
}
