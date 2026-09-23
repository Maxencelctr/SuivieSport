import { NextRequest, NextResponse } from 'next/server';

// Route interne : /api/food/search?q=poulet
// Fait le pont vers l'API publique Open Food Facts (gratuite, sans clé).
//
// L'ancien endpoint `world.openfoodfacts.org/cgi/search.pl` est mort
// ("Page temporarily unavailable"). Open Food Facts a migré sa recherche
// vers le nouveau service search-a-licious : search.openfoodfacts.org/search.
// Doc: https://openfoodfacts.github.io/openfoodfacts-server/api/

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get('q')?.trim();

  if (!term || term.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url =
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(term)}` +
      `&page_size=15&fields=code,product_name,brands,nutriments`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Open Food Facts a répondu ${res.status}` });
    }

    const json = await res.json();
    const products: any[] = json.hits ?? [];

    const results = products
      .filter((p) => p.product_name && p.nutriments && p.nutriments.proteins_100g != null)
      .map((p) => ({
        off_code: p.code ?? null,
        name: p.product_name as string,
        brand: Array.isArray(p.brands) ? p.brands.join(', ') : p.brands ?? null,
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
