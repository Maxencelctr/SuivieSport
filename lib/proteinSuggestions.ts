export interface ProteinFood {
  name: string;
  proteinPer100g: number;
  caloriesPer100g: number;
}

// Valeurs nutritionnelles moyennes usuelles (par 100g), pour suggérer une
// quantité qui comble le déficit de protéines du jour sans repasser par une
// recherche Open Food Facts.
export const COMMON_PROTEIN_FOODS: ProteinFood[] = [
  { name: 'Blanc de poulet', proteinPer100g: 31, caloriesPer100g: 165 },
  { name: 'Thon au naturel', proteinPer100g: 26, caloriesPer100g: 130 },
  { name: 'Fromage blanc 0%', proteinPer100g: 8, caloriesPer100g: 45 },
  { name: 'Skyr nature', proteinPer100g: 10, caloriesPer100g: 63 },
  { name: 'Oeufs entiers', proteinPer100g: 13, caloriesPer100g: 155 },
  { name: 'Whey (poudre)', proteinPer100g: 80, caloriesPer100g: 380 },
  { name: 'Tofu ferme', proteinPer100g: 15, caloriesPer100g: 145 },
  { name: 'Lentilles cuites', proteinPer100g: 9, caloriesPer100g: 115 },
];

// Quantité (en g) à manger de cet aliment pour couvrir `targetProteinG`,
// bornée à une fourchette réaliste pour rester une suggestion utilisable.
export function suggestedQuantity(food: ProteinFood, targetProteinG: number): number {
  const raw = (targetProteinG / food.proteinPer100g) * 100;
  return Math.min(400, Math.max(20, Math.round(raw / 5) * 5));
}
