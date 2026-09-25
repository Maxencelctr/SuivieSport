import { NextRequest, NextResponse } from 'next/server';

// Route interne : /api/food/barcode?code=3017620422003
// Récupère un produit par code-barres sur Open Food Facts (utilisé par le
// scanner caméra, beaucoup plus rapide qu'une recherche par nom au clavier).

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim();

  if (!code) {
    return NextResponse.json({ result: null, error: 'Code manquant' }, { status: 400 });
  }

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,brands,nutriments`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      return NextResponse.json({ result: null, error: `Open Food Facts a répondu ${res.status}` });
    }

    const json = await res.json();
    if (json.status !== 1 || !json.product?.product_name) {
      return NextResponse.json({ result: null, error: 'Produit introuvable pour ce code-barres' });
    }

    const p = json.product;
    const n = p.nutriments ?? {};

    if (n.proteins_100g == null) {
      return NextResponse.json({ result: null, error: 'Valeurs nutritionnelles indisponibles pour ce produit' });
    }

    return NextResponse.json({
      result: {
        off_code: p.code ?? code,
        name: p.product_name as string,
        brand: Array.isArray(p.brands) ? p.brands.join(', ') : p.brands ?? null,
        protein_100g: Number(n.proteins_100g) || 0,
        calories_100g: Number(n['energy-kcal_100g']) || null,
        carbs_100g: Number(n.carbohydrates_100g) || null,
        fat_100g: Number(n.fat_100g) || null,
      },
    });
  } catch {
    return NextResponse.json({ result: null, error: 'Impossible de joindre Open Food Facts' });
  }
}
