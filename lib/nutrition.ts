import { ActivityLevel, NutritionGoal, Sex } from './types';

// Facteurs d'activité physique standards (multiplicateur du métabolisme de base)
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,   // peu ou pas de sport
  leger: 1.375,      // sport léger 1-3x/semaine
  modere: 1.55,      // sport modéré 3-5x/semaine
  actif: 1.725,      // sport intense 6-7x/semaine
  tres_actif: 1.9,   // sport très intense + travail physique
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentaire: 'Sédentaire (peu ou pas de sport)',
  leger: 'Léger (1-3 séances/semaine)',
  modere: 'Modéré (3-5 séances/semaine)',
  actif: 'Actif (6-7 séances/semaine)',
  tres_actif: 'Très actif (sport + travail physique)',
};

export const GOAL_LABELS: Record<NutritionGoal, string> = {
  seche: 'Sèche (perte de gras)',
  maintien: 'Maintien',
  prise_de_masse: 'Prise de masse',
};

// Métabolisme de base — formule de Mifflin-St Jeor (la plus fiable communément admise)
export function computeBMR(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'homme' ? base + 5 : base - 161;
}

// Dépense énergétique totale journalière
export function computeTDEE(bmr: number, activity: ActivityLevel): number {
  return bmr * ACTIVITY_FACTORS[activity];
}

// Objectif calorique selon le but (déficit pour sèche, surplus pour prise de masse)
export function computeCalorieTarget(tdee: number, goal: NutritionGoal): number {
  if (goal === 'seche') return Math.round(tdee - tdee * 0.2); // déficit ~20%
  if (goal === 'prise_de_masse') return Math.round(tdee + tdee * 0.12); // surplus ~12%
  return Math.round(tdee);
}

// Objectif protéines (g/jour) — recommandations sportives classiques par kg de poids de corps
export function computeProteinTarget(weightKg: number, goal: NutritionGoal): number {
  const perKg = goal === 'seche' ? 2.2 : goal === 'prise_de_masse' ? 1.8 : 1.8;
  return Math.round(weightKg * perKg);
}

// Répartition glucides/lipides sur les calories restantes une fois les protéines couvertes
// (protéines = 4 kcal/g). Ratio lipides classique ~25% des calories totales, le reste en glucides.
export function computeMacroTargets(calorieTarget: number, proteinTargetG: number) {
  const proteinKcal = proteinTargetG * 4;
  const fatKcal = calorieTarget * 0.25;
  const carbsKcal = Math.max(0, calorieTarget - proteinKcal - fatKcal);
  return {
    fatG: Math.round(fatKcal / 9),
    carbsG: Math.round(carbsKcal / 4),
  };
}
