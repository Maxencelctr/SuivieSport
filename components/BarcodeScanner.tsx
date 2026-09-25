'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ScanLine } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

// Scan de code-barres via la caméra du téléphone (@zxing/browser). Ouvert en
// plein écran par-dessus la page ; renvoie le code détecté au parent qui
// lance ensuite la recherche Open Food Facts par code-barres.
export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    import('@zxing/browser')
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        return reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            haptic(20);
            onScan(result.getText());
          }
        });
      })
      .then((c) => {
        if (cancelled) c?.stop();
        else controls = c ?? null;
      })
      .catch(() => {
        if (!cancelled) setError("Impossible d'accéder à la caméra. Vérifie les permissions dans les réglages du navigateur.");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          <ScanLine size={18} className="text-accent" /> Scanner un code-barres
        </div>
        <button onClick={onClose} className="text-white p-1" aria-label="Fermer">
          <X size={24} />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-accent rounded-lg" />
      </div>

      {error && (
        <div className="p-4 text-center text-red-400 text-sm bg-black">{error}</div>
      )}
      <p className="text-center text-neutral-500 text-xs pb-6">Vise le code-barres du produit</p>
    </div>
  );
}
