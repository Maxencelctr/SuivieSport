'use client';

import { useEffect, useState } from 'react';

interface WgerMuscleImage {
  wgerId: number;
  isFront: boolean;
  imageUrlMain: string | null;
  imageUrlSecondary: string | null;
}

interface Props {
  intensities: Record<number, number>; // wger_id -> 0..1
}

// Convertit une intensité en filtre CSS : gris clair (pas travaillé) -> couleur
// pleine et saturée (beaucoup travaillé). On ne peut pas changer la couleur de
// l'image elle-même (c'est un PNG/SVG figé côté wger), donc on joue sur le
// grayscale + l'opacité pour obtenir un effet de dégradé d'intensité.
function styleFor(intensity: number): React.CSSProperties {
  const clamped = Math.max(0, Math.min(1, intensity));
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    filter: `grayscale(${1 - clamped}) saturate(${1 + clamped}) brightness(${1 - clamped * 0.15})`,
    opacity: clamped <= 0 ? 0.25 : 0.4 + clamped * 0.6,
  };
}

function Silhouette({
  images, isFront, intensities,
}: {
  images: WgerMuscleImage[];
  isFront: boolean;
  intensities: Record<number, number>;
}) {
  const relevant = images.filter((m) => m.isFront === isFront && m.imageUrlMain);

  if (relevant.length === 0) {
    return <p className="text-neutral-500 text-xs">Images indisponibles pour cette vue.</p>;
  }

  return (
    <div className="relative w-full" style={{ paddingTop: '190%' }}>
      {relevant.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={m.wgerId}
          src={m.imageUrlMain!}
          alt=""
          style={styleFor(intensities[m.wgerId] ?? 0)}
        />
      ))}
    </div>
  );
}

export default function BodyHeatmapWger({ intensities }: Props) {
  const [images, setImages] = useState<WgerMuscleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/muscles/images')
      .then((r) => r.json())
      .then((json) => {
        setImages(json.muscles ?? []);
        if (json.error) setError(json.error);
      })
      .catch(() => setError('Impossible de charger les illustrations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-neutral-500 text-sm">Chargement des illustrations...</p>;

  if (error || images.length === 0) {
    return (
      <p className="text-amber-500 text-xs">
        {error ?? 'Aucune illustration reçue'} — voir le README pour ajuster `app/api/muscles/images/route.ts`.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-neutral-500 mb-1 text-center">Face</div>
        <Silhouette images={images} isFront intensities={intensities} />
      </div>
      <div>
        <div className="text-xs text-neutral-500 mb-1 text-center">Dos</div>
        <Silhouette images={images} isFront={false} intensities={intensities} />
      </div>
      <div className="col-span-2 flex justify-center gap-1 text-[10px] text-neutral-500 items-center">
        <span>Peu</span>
        <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #555, #999)' }} />
        <span>Beaucoup</span>
      </div>
    </div>
  );
}
