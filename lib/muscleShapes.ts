// Référentiel des 15 muscles de la base wger.de, avec leur position sur un
// schéma corporel (vue de face / vue de dos, viewBox 0 0 200 380).
//
// ⚠️ Ce découpage reste stylisé (comme la plupart des schémas d'app fitness) :
// des formes qui évoquent la vraie anatomie, pas un tracé médical au trait
// près. Certains gros muscles (pecs, abdos, quadriceps) sont subdivisés
// visuellement en plusieurs bandes pour un rendu plus détaillé, MAIS ces
// bandes partagent toutes la même intensité (wger ne suit qu'un seul muscle
// "grand pectoral", pas 3 zones distinctes) : la couleur sera donc identique
// sur toutes les bandes d'un même muscle, seul le visuel est plus fin.

export type ShapePiece =
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { type: 'path'; d: string }
  | { type: 'rect'; x: number; y: number; width: number; height: number; rx?: number };

export interface MuscleShape {
  wgerId: number;
  view: 'face' | 'dos';
  shapes: ShapePiece[];
}

export const MUSCLE_SHAPES: MuscleShape[] = [
  // --- Face ---
  { wgerId: 2, view: 'face', shapes: [ // Deltoïde antérieur
    { type: 'ellipse', cx: 61, cy: 61, rx: 15, ry: 17, rotate: -20 },
    { type: 'ellipse', cx: 139, cy: 61, rx: 15, ry: 17, rotate: 20 },
  ] },
  { wgerId: 4, view: 'face', shapes: [ // Grand pectoral — 3 bandes (haut/milieu/bas) par côté
    { type: 'ellipse', cx: 80, cy: 66, rx: 18, ry: 8, rotate: -8 },
    { type: 'ellipse', cx: 82, cy: 77, rx: 19, ry: 8.5, rotate: -5 },
    { type: 'ellipse', cx: 84, cy: 88, rx: 17, ry: 7.5, rotate: -3 },
    { type: 'ellipse', cx: 120, cy: 66, rx: 18, ry: 8, rotate: 8 },
    { type: 'ellipse', cx: 118, cy: 77, rx: 19, ry: 8.5, rotate: 5 },
    { type: 'ellipse', cx: 116, cy: 88, rx: 17, ry: 7.5, rotate: 3 },
  ] },
  { wgerId: 3, view: 'face', shapes: [ // Dentelé antérieur
    { type: 'ellipse', cx: 65, cy: 106, rx: 7, ry: 8, rotate: -12 },
    { type: 'ellipse', cx: 68, cy: 118, rx: 7, ry: 8, rotate: -8 },
    { type: 'ellipse', cx: 135, cy: 106, rx: 7, ry: 8, rotate: 12 },
    { type: 'ellipse', cx: 132, cy: 118, rx: 7, ry: 8, rotate: 8 },
  ] },
  { wgerId: 7, view: 'face', shapes: [ // Grand droit (abdos) — vraie tablette 3x2, séparée par la ligne blanche
    { type: 'rect', x: 82, y: 102, width: 14, height: 16, rx: 4 },
    { type: 'rect', x: 104, y: 102, width: 14, height: 16, rx: 4 },
    { type: 'rect', x: 82, y: 122, width: 14, height: 16, rx: 4 },
    { type: 'rect', x: 104, y: 122, width: 14, height: 16, rx: 4 },
    { type: 'rect', x: 83, y: 142, width: 13, height: 16, rx: 4 },
    { type: 'rect', x: 104, y: 142, width: 13, height: 16, rx: 4 },
    { type: 'rect', x: 84, y: 162, width: 13, height: 14, rx: 4 },
    { type: 'rect', x: 103, y: 162, width: 13, height: 14, rx: 4 },
  ] },
  { wgerId: 5, view: 'face', shapes: [ // Obliques
    { type: 'path', d: 'M68,108 C64,128 64,150 70,174 L80,174 C76,150 76,128 78,108 Z' },
    { type: 'path', d: 'M132,108 C136,128 136,150 130,174 L120,174 C124,150 124,128 122,108 Z' },
  ] },
  { wgerId: 1, view: 'face', shapes: [ // Biceps
    { type: 'ellipse', cx: 50, cy: 100, rx: 11, ry: 20, rotate: -6 },
    { type: 'ellipse', cx: 150, cy: 100, rx: 11, ry: 20, rotate: 6 },
  ] },
  { wgerId: 13, view: 'face', shapes: [ // Brachial
    { type: 'ellipse', cx: 47, cy: 138, rx: 9, ry: 14, rotate: -4 },
    { type: 'ellipse', cx: 153, cy: 138, rx: 9, ry: 14, rotate: 4 },
  ] },
  { wgerId: 10, view: 'face', shapes: [ // Quadriceps — 3 bandes (externe/centrale/interne) par jambe
    { type: 'path', d: 'M73,184 C70,212 70,240 74,262 C77,265 81,266 83,264 L83,182 C80,181 76,182 73,184 Z' },
    { type: 'path', d: 'M84,182 L84,265 C87,266 91,266 94,264 L94,182 C90,180 87,180 84,182 Z' },
    { type: 'path', d: 'M95,182 L95,264 C98,265 101,264 103,261 C106,241 106,212 103,184 C100,182 97,181 95,182 Z' },
    { type: 'path', d: 'M127,184 C130,212 130,240 126,262 C123,265 119,266 117,264 L117,182 C120,181 124,182 127,184 Z' },
    { type: 'path', d: 'M116,182 L116,265 C113,266 109,266 106,264 L106,182 C110,180 113,180 116,182 Z' },
    { type: 'path', d: 'M105,182 L105,264 C102,265 99,264 97,261 C94,241 94,212 97,184 C100,182 103,181 105,182 Z' },
  ] },

  // --- Dos ---
  { wgerId: 9, view: 'dos', shapes: [ // Trapèzes (losange, avec une pointe haute plus étirée vers la nuque)
    { type: 'path', d: 'M100,44 L130,62 C122,76 112,84 100,88 C88,84 78,76 70,62 Z' },
  ] },
  { wgerId: 12, view: 'dos', shapes: [ // Grand dorsal (aile, plus large en bas)
    { type: 'path', d: 'M78,90 C64,102 58,128 66,152 C76,157 86,154 92,142 C92,120 88,100 87,90 Z' },
    { type: 'path', d: 'M122,90 C136,102 142,128 134,152 C124,157 114,154 108,142 C108,120 112,100 113,90 Z' },
  ] },
  { wgerId: 14, view: 'dos', shapes: [ // Triceps
    { type: 'ellipse', cx: 49, cy: 96, rx: 10, ry: 15, rotate: -6 },
    { type: 'ellipse', cx: 48, cy: 122, rx: 10, ry: 13, rotate: -4 },
    { type: 'ellipse', cx: 151, cy: 96, rx: 10, ry: 15, rotate: 6 },
    { type: 'ellipse', cx: 152, cy: 122, rx: 10, ry: 13, rotate: 4 },
  ] },
  { wgerId: 8, view: 'dos', shapes: [ // Grand fessier
    { type: 'ellipse', cx: 84, cy: 172, rx: 17, ry: 18 },
    { type: 'ellipse', cx: 116, cy: 172, rx: 17, ry: 18 },
  ] },
  { wgerId: 11, view: 'dos', shapes: [ // Ischio-jambiers — externe/interne par jambe
    { type: 'path', d: 'M74,196 C71,216 71,236 75,254 C78,257 82,258 84,256 L84,194 C81,193 77,194 74,196 Z' },
    { type: 'path', d: 'M85,194 L85,257 C88,258 91,257 94,255 C97,238 96,216 92,196 C90,194 87,193 85,194 Z' },
    { type: 'path', d: 'M126,196 C129,216 129,236 125,254 C122,257 118,258 116,256 L116,194 C119,193 123,194 126,196 Z' },
    { type: 'path', d: 'M115,194 L115,257 C112,258 109,257 106,255 C103,238 104,216 108,196 C110,194 113,193 115,194 Z' },
  ] },
  { wgerId: 6, view: 'dos', shapes: [ // Gastrocnémien (mollet)
    { type: 'ellipse', cx: 80, cy: 266, rx: 8, ry: 16, rotate: -6 },
    { type: 'ellipse', cx: 90, cy: 268, rx: 7, ry: 15, rotate: -2 },
    { type: 'ellipse', cx: 120, cy: 266, rx: 8, ry: 16, rotate: 6 },
    { type: 'ellipse', cx: 110, cy: 268, rx: 7, ry: 15, rotate: 2 },
  ] },
  { wgerId: 15, view: 'dos', shapes: [ // Soléaire
    { type: 'ellipse', cx: 82, cy: 298, rx: 9, ry: 13, rotate: -3 },
    { type: 'ellipse', cx: 118, cy: 298, rx: 9, ry: 13, rotate: 3 },
  ] },
];
