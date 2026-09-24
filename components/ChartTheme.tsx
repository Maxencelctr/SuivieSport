'use client';

// Thème partagé pour tous les graphiques Recharts (Stats, Poids, Sommeil) :
// dégradés de marque au lieu d'aplats, grille/axes discrets, tooltip cohérent
// avec les cartes du site. <ChartDefs /> doit être monté une fois par
// <ResponsiveContainer>/graphique (Recharts a besoin d'un <defs> par SVG).

export function ChartDefs() {
  return (
    <defs>
      <linearGradient id="gradViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
      <linearGradient id="gradVioletH" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#A78BFA" />
      </linearGradient>
      <linearGradient id="gradPink" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>
      <linearGradient id="gradLime" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d9f99d" />
        <stop offset="100%" stopColor="#A3E635" />
      </linearGradient>
      <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7dd3fc" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
      {/* Dégradés estompés pour le remplissage sous les AreaChart */}
      <linearGradient id="fadeViolet" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="fadeLime" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A3E635" stopOpacity={0.3} />
        <stop offset="100%" stopColor="#A3E635" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

export const chartAxisProps = { stroke: '#726b7d', fontSize: 12 };
export const chartGridProps = { strokeDasharray: '3 3', stroke: '#211c2b' };
export const chartTooltipStyle = { backgroundColor: '#141018', border: '1px solid #2a2632', borderRadius: 10 };
export const chartBarCursor = { fill: 'rgba(167, 139, 250, 0.08)' };
export const chartLineCursor = { stroke: '#3a3346' };
