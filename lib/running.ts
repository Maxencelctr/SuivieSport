// Estimation de la VMA (vitesse maximale aérobie) à partir d'un test ou d'une
// course récente, et zones d'allure d'entraînement associées. Approximations
// classiques utilisées en préparation course à pied (%VMA par distance de test).

export const VMA_TEST_PERCENT: Record<string, number> = {
  test6min: 1.0,   // test de 6 minutes : la vitesse moyenne EST la VMA
  '5km': 0.94,
  '10km': 0.88,
  semi: 0.85,
  marathon: 0.78,
};

export const VMA_TEST_LABELS: Record<string, string> = {
  test6min: 'Test de 6 minutes',
  '5km': 'Course de 5 km',
  '10km': 'Course de 10 km',
  semi: 'Semi-marathon',
  marathon: 'Marathon',
};

export function computeVMA(distanceKm: number, durationSeconds: number, testType: string): number {
  const speedKmh = distanceKm / (durationSeconds / 3600);
  const percent = VMA_TEST_PERCENT[testType] ?? 1;
  return speedKmh / percent;
}

export interface TrainingZone {
  label: string;
  minPercent: number;
  maxPercent: number;
}

export const TRAINING_ZONES: TrainingZone[] = [
  { label: 'Récupération', minPercent: 0.60, maxPercent: 0.70 },
  { label: 'Footing / endurance fondamentale', minPercent: 0.70, maxPercent: 0.80 },
  { label: 'Sortie longue soutenue / tempo', minPercent: 0.80, maxPercent: 0.88 },
  { label: 'Seuil', minPercent: 0.88, maxPercent: 0.95 },
  { label: 'VMA / fractionné court', minPercent: 0.95, maxPercent: 1.05 },
];

// Convertit une vitesse en km/h vers une allure en secondes/km
export function speedToPaceSeconds(speedKmh: number): number {
  return Math.round(3600 / speedKmh);
}

export function formatPace(secondsPerKm: number): string {
  const min = Math.floor(secondsPerKm / 60);
  const sec = secondsPerKm % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Distances de course classiques, pour les objectifs "course" (matching avec
// les runs enregistrés à une distance proche) et la sélection de test VMA.
export const RACE_DISTANCE_PRESETS: { key: string; label: string; km: number }[] = [
  { key: '5km', label: '5 km', km: 5 },
  { key: '10km', label: '10 km', km: 10 },
  { key: 'semi', label: 'Semi-marathon', km: 21.1 },
  { key: 'marathon', label: 'Marathon', km: 42.195 },
];

export const RUN_TYPE_LABELS: Record<string, string> = {
  footing: 'Footing',
  fractionne: 'Fractionné',
  sortie_longue: 'Sortie longue',
  autre: 'Autre',
};
