// Estimation des calories brûlées à l'entraînement, basée sur des équations
// reconnues en physiologie de l'exercice (American College of Sports Medicine),
// personnalisées au poids de la personne (et à l'allure/durée réelles).
//
// Ce ne sont que des estimations — la dépense énergétique réelle dépend aussi
// de la condition physique, de la technique, du terrain, etc. Mais c'est
// nettement plus juste qu'un forfait fixe.

// Course à pied — équation ACSM pour la course :
// VO2 (ml/kg/min) = 0.2 × vitesse(m/min) + 3.5
// kcal/min = VO2 × poids(kg) / 200   (1 litre d'O2 ≈ 5 kcal, VO2 en ml/kg/min)
export function runningCalories(weightKg: number, distanceKm: number, durationSeconds: number): number {
  const durationMin = durationSeconds / 60;
  if (durationMin <= 0 || distanceKm <= 0 || weightKg <= 0) return 0;
  const speedMPerMin = (distanceKm * 1000) / durationMin;
  const vo2 = 0.2 * speedMPerMin + 3.5;
  const kcalPerMin = (vo2 * weightKg) / 200;
  return Math.round(kcalPerMin * durationMin);
}

// Musculation — méthode MET (metabolic equivalent of task).
// MET ≈ 5.0 pour un entraînement en résistance modéré à intense (table de
// référence du Compendium of Physical Activities), ajustable si besoin.
// kcal = MET × 3.5 × poids(kg) / 200 × durée(min)
const STRENGTH_MET = 5.0;

export function strengthCalories(weightKg: number, durationMinutes: number): number {
  if (durationMinutes <= 0 || weightKg <= 0) return 0;
  return Math.round(((STRENGTH_MET * 3.5 * weightKg) / 200) * durationMinutes);
}

// Durée par défaut utilisée si une séance muscu n'a pas de durée renseignée
export const DEFAULT_STRENGTH_DURATION_MIN = 60;
