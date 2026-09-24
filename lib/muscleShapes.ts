// Référentiel des 15 muscles de la base wger.de, avec leur position sur un
// schéma corporel (vue de face / vue de dos, viewBox 0 0 200 380).
//
// ⚠️ Ce découpage reste stylisé (comme la plupart des schémas d'app fitness) :
// des ellipses/courbes positionnées et dimensionnées pour évoquer la vraie
// forme des muscles, pas un tracé anatomique médical au trait près.

export type ShapePiece =
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { type: 'path'; d: string };

export interface MuscleShape {
  wgerId: number;
  view: 'face' | 'dos';
  shapes: ShapePiece[];
}

export const MUSCLE_SHAPES: MuscleShape[] = [
  // --- Face ---
  { wgerId: 2, view: 'face', shapes: [ // Deltoïde antérieur
    { type: 'ellipse', cx: 62, cy: 62, rx: 14, ry: 16, rotate: -18 },
    { type: 'ellipse', cx: 138, cy: 62, rx: 14, ry: 16, rotate: 18 },
  ] },
  { wgerId: 4, view: 'face', shapes: [ // Grand pectoral
    { type: 'ellipse', cx: 84, cy: 78, rx: 20, ry: 17, rotate: -8 },
    { type: 'ellipse', cx: 116, cy: 78, rx: 20, ry: 17, rotate: 8 },
  ] },
  { wgerId: 3, view: 'face', shapes: [ // Dentelé antérieur
    { type: 'ellipse', cx: 65, cy: 108, rx: 8, ry: 14, rotate: -10 },
    { type: 'ellipse', cx: 135, cy: 108, rx: 8, ry: 14, rotate: 10 },
  ] },
  { wgerId: 7, view: 'face', shapes: [ // Grand droit (abdos) — segments pour l'effet "tablette"
    { type: 'path', d: 'M85,102 h30 a4,4 0 0 1 4,4 v14 a4,4 0 0 1 -4,4 h-30 a4,4 0 0 1 -4,-4 v-14 a4,4 0 0 1 4,-4 Z' },
    { type: 'path', d: 'M85,128 h30 a4,4 0 0 1 4,4 v14 a4,4 0 0 1 -4,4 h-30 a4,4 0 0 1 -4,-4 v-14 a4,4 0 0 1 4,-4 Z' },
    { type: 'path', d: 'M86,156 h28 a4,4 0 0 1 4,4 v12 a4,4 0 0 1 -4,4 h-28 a4,4 0 0 1 -4,-4 v-12 a4,4 0 0 1 4,-4 Z' },
  ] },
  { wgerId: 5, view: 'face', shapes: [ // Obliques
    { type: 'path', d: 'M68,108 C64,128 64,150 70,172 L80,172 C76,150 76,128 78,108 Z' },
    { type: 'path', d: 'M132,108 C136,128 136,150 130,172 L120,172 C124,150 124,128 122,108 Z' },
  ] },
  { wgerId: 1, view: 'face', shapes: [ // Biceps
    { type: 'ellipse', cx: 50, cy: 100, rx: 11, ry: 20, rotate: -6 },
    { type: 'ellipse', cx: 150, cy: 100, rx: 11, ry: 20, rotate: 6 },
  ] },
  { wgerId: 13, view: 'face', shapes: [ // Brachial
    { type: 'ellipse', cx: 47, cy: 138, rx: 9, ry: 14, rotate: -4 },
    { type: 'ellipse', cx: 153, cy: 138, rx: 9, ry: 14, rotate: 4 },
  ] },
  { wgerId: 10, view: 'face', shapes: [ // Quadriceps
    { type: 'path', d: 'M74,182 C71,210 71,240 76,262 C82,266 92,266 96,262 L96,182 C92,178 78,178 74,182 Z' },
    { type: 'path', d: 'M126,182 C129,210 129,240 124,262 C118,266 108,266 104,262 L104,182 C108,178 122,178 126,182 Z' },
  ] },

  // --- Dos ---
  { wgerId: 9, view: 'dos', shapes: [ // Trapèzes (forme en losange/cerf-volant)
    { type: 'path', d: 'M100,48 L128,60 C120,74 112,82 100,86 C88,82 80,74 72,60 Z' },
  ] },
  { wgerId: 12, view: 'dos', shapes: [ // Grand dorsal (forme en aile)
    { type: 'path', d: 'M78,90 C66,100 62,124 68,148 C76,152 84,150 90,140 C90,120 86,102 86,90 Z' },
    { type: 'path', d: 'M122,90 C134,100 138,124 132,148 C124,152 116,150 110,140 C110,120 114,102 114,90 Z' },
  ] },
  { wgerId: 14, view: 'dos', shapes: [ // Triceps
    { type: 'ellipse', cx: 49, cy: 108, rx: 11, ry: 26, rotate: -5 },
    { type: 'ellipse', cx: 151, cy: 108, rx: 11, ry: 26, rotate: 5 },
  ] },
  { wgerId: 8, view: 'dos', shapes: [ // Grand fessier
    { type: 'ellipse', cx: 84, cy: 172, rx: 17, ry: 18 },
    { type: 'ellipse', cx: 116, cy: 172, rx: 17, ry: 18 },
  ] },
  { wgerId: 11, view: 'dos', shapes: [ // Ischio-jambiers
    { type: 'path', d: 'M74,196 C71,216 71,236 75,254 C81,258 91,258 95,254 L95,196 C91,192 78,192 74,196 Z' },
    { type: 'path', d: 'M126,196 C129,216 129,236 125,254 C119,258 109,258 105,254 L105,196 C109,192 122,192 126,196 Z' },
  ] },
  { wgerId: 6, view: 'dos', shapes: [ // Gastrocnémien (mollet)
    { type: 'ellipse', cx: 82, cy: 268, rx: 11, ry: 17, rotate: -4 },
    { type: 'ellipse', cx: 118, cy: 268, rx: 11, ry: 17, rotate: 4 },
  ] },
  { wgerId: 15, view: 'dos', shapes: [ // Soléaire
    { type: 'ellipse', cx: 82, cy: 298, rx: 9, ry: 13, rotate: -3 },
    { type: 'ellipse', cx: 118, cy: 298, rx: 9, ry: 13, rotate: 3 },
  ] },
];
