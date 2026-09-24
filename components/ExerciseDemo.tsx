'use client';

import { useEffect, useState } from 'react';

// Mini animation d'exercice : bascule entre 2 photos (position départ/fin)
// venant de free-exercise-db (voir /api/exercises/demo) pour simuler le
// mouvement, sans dépendre d'une vraie vidéo/GIF.
export default function ExerciseDemo({ name }: { name: string }) {
  const [images, setImages] = useState<string[] | null>(null);
  const [frame, setFrame] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setImages(null);
    setFrame(0);
    fetch(`/api/exercises/demo?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setImages(json.images ?? null);
      })
      .catch(() => {
        if (!cancelled) setImages(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  useEffect(() => {
    if (!images || images.length < 2) return;
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 850);
    return () => clearInterval(id);
  }, [images]);

  if (loading) {
    return <div className="w-full aspect-[4/3] rounded-lg bg-[#0a0a0a] border border-[#262626] animate-pulse" />;
  }
  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#0a0a0a] border border-[#262626]">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: frame === i ? 1 : 0 }}
        />
      ))}
      <div className="absolute bottom-1.5 right-1.5 text-[9px] text-neutral-300 bg-black/60 px-1.5 py-0.5 rounded">Démo</div>
    </div>
  );
}
