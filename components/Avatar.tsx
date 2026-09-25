'use client';

const COLORS = ['#8B5CF6', '#EC4899', '#F97316', '#22C55E', '#3B82F6', '#EAB308'];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % COLORS.length;
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface AvatarProps {
  url?: string | null;
  label?: string | null;
  size?: number;
  className?: string;
}

// Photo de profil si définie, sinon un rond coloré avec l'initiale (couleur
// stable par personne, dérivée de son label/email).
export default function Avatar({ url, label, size = 32, className = '' }: AvatarProps) {
  const initial = (label ?? '?').trim().charAt(0).toUpperCase() || '?';

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: colorFor(label ?? '?'), fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
