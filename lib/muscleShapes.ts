// Référentiel des 15 muscles de la base wger.de, avec leur position sur un
// schéma corporel simplifié (vue de face / vue de dos, viewBox 0 0 200 380).
//
// ⚠️ Ce découpage est plus fin que les 8 "muscle_group" utilisés ailleurs dans
// l'app, mais reste schématique : ce ne sont pas de vraies formes anatomiques,
// juste des zones rectangulaires positionnées au bon endroit. Précis niveau
// muscle, pas niveau esthétique médical.

export interface MuscleShape {
  wgerId: number;
  view: 'face' | 'dos';
  // Une ou plusieurs formes (ex: gauche + droite) pour ce muscle
  rects: { x: number; y: number; w: number; h: number; rx?: number }[];
}

export const MUSCLE_SHAPES: MuscleShape[] = [
  // --- Face ---
  { wgerId: 2, view: 'face', rects: [ // Deltoïde antérieur
    { x: 55, y: 55, w: 32, h: 26, rx: 8 },
    { x: 113, y: 55, w: 32, h: 26, rx: 8 },
  ] },
  { wgerId: 4, view: 'face', rects: [ // Grand pectoral
    { x: 72, y: 60, w: 56, h: 40, rx: 10 },
  ] },
  { wgerId: 3, view: 'face', rects: [ // Dentelé antérieur
    { x: 58, y: 100, w: 14, h: 22, rx: 4 },
    { x: 128, y: 100, w: 14, h: 22, rx: 4 },
  ] },
  { wgerId: 7, view: 'face', rects: [ // Grand droit (abdos)
    { x: 84, y: 105, w: 32, h: 62, rx: 6 },
  ] },
  { wgerId: 5, view: 'face', rects: [ // Obliques
    { x: 64, y: 118, w: 18, h: 48, rx: 6 },
    { x: 118, y: 118, w: 18, h: 48, rx: 6 },
  ] },
  { wgerId: 1, view: 'face', rects: [ // Biceps
    { x: 43, y: 83, w: 20, h: 42, rx: 8 },
    { x: 137, y: 83, w: 20, h: 42, rx: 8 },
  ] },
  { wgerId: 13, view: 'face', rects: [ // Brachial
    { x: 43, y: 127, w: 20, h: 28, rx: 6 },
    { x: 137, y: 127, w: 20, h: 28, rx: 6 },
  ] },
  { wgerId: 10, view: 'face', rects: [ // Quadriceps
    { x: 72, y: 172, w: 26, h: 68, rx: 10 },
    { x: 102, y: 172, w: 26, h: 68, rx: 10 },
  ] },

  // --- Dos ---
  { wgerId: 9, view: 'dos', rects: [ // Trapèzes
    { x: 72, y: 54, w: 56, h: 40, rx: 10 },
  ] },
  { wgerId: 12, view: 'dos', rects: [ // Grand dorsal
    { x: 66, y: 92, w: 68, h: 50, rx: 10 },
  ] },
  { wgerId: 14, view: 'dos', rects: [ // Triceps
    { x: 43, y: 83, w: 20, h: 70, rx: 8 },
    { x: 137, y: 83, w: 20, h: 70, rx: 8 },
  ] },
  { wgerId: 8, view: 'dos', rects: [ // Grand fessier
    { x: 70, y: 152, w: 60, h: 28, rx: 10 },
  ] },
  { wgerId: 11, view: 'dos', rects: [ // Ischio-jambiers
    { x: 72, y: 182, w: 26, h: 56, rx: 8 },
    { x: 102, y: 182, w: 26, h: 56, rx: 8 },
  ] },
  { wgerId: 6, view: 'dos', rects: [ // Gastrocnémien
    { x: 74, y: 240, w: 22, h: 28, rx: 8 },
    { x: 104, y: 240, w: 22, h: 28, rx: 8 },
  ] },
  { wgerId: 15, view: 'dos', rects: [ // Soléaire
    { x: 74, y: 270, w: 22, h: 28, rx: 6 },
    { x: 104, y: 270, w: 22, h: 28, rx: 6 },
  ] },
];
