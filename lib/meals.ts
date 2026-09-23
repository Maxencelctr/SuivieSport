import { Croissant, Apple, UtensilsCrossed, Cookie, Moon } from 'lucide-react';
import { Meal } from './types';

export const MEAL_ORDER: Meal[] = ['petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apresmidi', 'diner'];

export const MEAL_LABELS: Record<Meal, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  collation_matin: 'Collation (matin)',
  dejeuner: 'Déjeuner',
  collation_apresmidi: 'Collation (après-midi)',
  diner: 'Dîner',
};

export const MEAL_ICONS: Record<Meal, typeof Croissant> = {
  petit_dejeuner: Croissant,
  collation_matin: Apple,
  dejeuner: UtensilsCrossed,
  collation_apresmidi: Cookie,
  diner: Moon,
};

// Devine le repas le plus probable selon l'heure actuelle, pour pré-remplir
// les ajouts rapides (aliments fréquents, suggestions protéines) sans
// demander explicitement le créneau à chaque fois.
export function guessCurrentMeal(): Meal {
  const hour = new Date().getHours();
  if (hour < 10) return 'petit_dejeuner';
  if (hour < 12) return 'collation_matin';
  if (hour < 15) return 'dejeuner';
  if (hour < 19) return 'collation_apresmidi';
  return 'diner';
}
