// Équivalences approximatives "1 unité" -> grammes, pour les aliments
// courants qu'on compte plutôt qu'on ne pèse (1 banane, 1 œuf...). Détecté
// par mot-clé dans le nom de l'aliment choisi ; purement indicatif, l'usage
// peut toujours repasser en grammes.
interface UnitPreset {
  keywords: string[];
  label: string; // ex: "banane"
  grams: number;
}

const UNIT_PRESETS: UnitPreset[] = [
  { keywords: ['oeuf', 'œuf'], label: 'œuf', grams: 50 },
  { keywords: ['banane'], label: 'banane', grams: 120 },
  { keywords: ['pomme'], label: 'pomme', grams: 150 },
  { keywords: ['orange'], label: 'orange', grams: 130 },
  { keywords: ['avocat'], label: 'avocat', grams: 200 },
  { keywords: ['yaourt', 'yogourt'], label: 'yaourt', grams: 125 },
  { keywords: ['tranche de pain', 'tranche pain'], label: 'tranche de pain', grams: 30 },
  { keywords: ['tranche de jambon', 'tranche jambon'], label: 'tranche de jambon', grams: 25 },
  { keywords: ['gousse d\'ail', 'gousse ail'], label: 'gousse d\'ail', grams: 3 },
  { keywords: ['kiwi'], label: 'kiwi', grams: 75 },
  { keywords: ['carré de chocolat', 'carre chocolat'], label: 'carré de chocolat', grams: 5 },
];

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function findUnitPreset(foodName: string): { label: string; grams: number } | null {
  const needle = normalize(foodName);
  for (const preset of UNIT_PRESETS) {
    if (preset.keywords.some((k) => needle.includes(normalize(k)))) {
      return { label: preset.label, grams: preset.grams };
    }
  }
  return null;
}
