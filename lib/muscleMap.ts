import type { Muscle as LibMuscle } from 'react-body-highlighter';

// Correspondance entre les 15 muscles suivis (wger.de) et le modèle
// anatomique pré-dessiné de react-body-highlighter (SVG réel, licence MIT,
// repris de react-native-body-highlighter). Certains muscles n'ont pas
// d'équivalent dans ce modèle (Dentelé antérieur, Brachial) : ils restent
// suivis dans les données/suggestions mais n'apparaissent pas sur le dessin.
export const WGER_TO_LIB_MUSCLE: Record<number, LibMuscle[]> = {
  2: ['front-deltoids'], // Deltoïde antérieur
  4: ['chest'], // Grand pectoral
  7: ['abs'], // Grand droit (abdominaux)
  5: ['obliques'], // Obliques
  1: ['biceps'], // Biceps
  10: ['quadriceps'], // Quadriceps
  9: ['trapezius'], // Trapèzes
  12: ['upper-back', 'lower-back'], // Grand dorsal
  14: ['triceps'], // Triceps
  8: ['gluteal'], // Grand fessier
  11: ['hamstring'], // Ischio-jambiers
  6: ['calves'], // Gastrocnémien
  15: ['calves'], // Soléaire (même zone visuelle que le gastrocnémien)
};

// wger_id des muscles sans équivalent visuel dans le modèle
export const UNMAPPED_WGER_IDS = [3, 13]; // Dentelé antérieur, Brachial

export const LIB_MUSCLE_VIEW: Record<LibMuscle, 'anterior' | 'posterior'> = {
  trapezius: 'posterior',
  'upper-back': 'posterior',
  'lower-back': 'posterior',
  chest: 'anterior',
  biceps: 'anterior',
  triceps: 'posterior',
  forearm: 'anterior',
  'back-deltoids': 'posterior',
  'front-deltoids': 'anterior',
  abs: 'anterior',
  obliques: 'anterior',
  adductor: 'anterior',
  abductors: 'anterior',
  hamstring: 'posterior',
  quadriceps: 'anterior',
  calves: 'posterior',
  gluteal: 'posterior',
  head: 'anterior',
  neck: 'anterior',
  knees: 'anterior',
  'left-soleus': 'posterior',
  'right-soleus': 'posterior',
};
