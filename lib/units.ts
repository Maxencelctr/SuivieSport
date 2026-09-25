export type UnitSystem = 'metric' | 'imperial';

const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number) {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number) {
  return lb * KG_PER_LB;
}

// kg (stockage) -> valeur à afficher dans l'unité choisie
export function displayWeight(kg: number, unit: UnitSystem): number {
  return unit === 'imperial' ? Math.round(kgToLb(kg) * 10) / 10 : Math.round(kg * 10) / 10;
}

// valeur saisie dans l'unité choisie -> kg (stockage, toujours en kg en base)
export function toKg(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? Math.round(lbToKg(value) * 100) / 100 : value;
}

export function weightUnitLabel(unit: UnitSystem) {
  return unit === 'imperial' ? 'lb' : 'kg';
}
