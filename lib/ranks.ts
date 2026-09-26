// Miroir des seuils définis côté SQL (compute_rank) pour pouvoir calculer
// son propre rang côté client sans appel réseau supplémentaire (nos propres
// séances/runs sont déjà lisibles directement via RLS).
const RANK_TIERS: { name: string; min: number }[] = [
  { name: 'Débutant', min: 0 },
  { name: 'Régulier', min: 10 },
  { name: 'Confirmé', min: 50 },
  { name: 'Vétéran', min: 100 },
  { name: 'Expert', min: 200 },
  { name: 'Élite', min: 350 },
  { name: 'Légende', min: 500 },
];

export function computeRankClient(activityCount: number): string {
  let rank = RANK_TIERS[0].name;
  for (const tier of RANK_TIERS) {
    if (activityCount >= tier.min) rank = tier.name;
  }
  return rank;
}

// Plus le rang est élevé, plus la couleur du pseudo se distingue — gris neutre
// pour débuter, jusqu'au doré pour Légende (avec une icône pour les 2 plus hauts).
export const RANK_STYLES: Record<string, string> = {
  Débutant: 'text-neutral-500',
  Régulier: 'text-emerald-500',
  Confirmé: 'text-sky-400',
  Vétéran: 'text-accent',
  Expert: 'text-amber-500',
  Élite: 'text-cyan-300',
  Légende: 'text-yellow-400 font-semibold',
};
