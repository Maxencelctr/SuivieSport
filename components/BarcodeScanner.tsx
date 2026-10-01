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
  const captureInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    import('@zxing/browser')
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        // Sans contraintes explicites, le navigateur/zxing choisit souvent
        // une résolution basse par défaut, qu'on étire ensuite en plein
        // écran (object-cover) — d'où le flou. On demande la caméra arrière
        // en haute résolution avec mise au point continue (ignoré sans
        // erreur sur les appareils qui ne la supportent pas).
        return reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
            },
          },
          videoRef.current,
          (result) => {
            if (result && !scannedRef.current) {
              scannedRef.current = true;
              haptic(20);
              onScan(result.getText());
            }
          }
        );
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

  // Solution de secours quand le flux vidéo en direct reste flou (certains
  // téléphones ne font pas d'autofocus continu dans le navigateur) : on
  // utilise l'appli appareil photo native du téléphone, qui fait sa propre
  // mise au point avant de prendre la photo — bien plus net qu'un flux live.
  async function handleCaptureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCaptureLoading(true);
    setError(null);
    const url = URL.createObjectURL(file);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(url);
      if (result) {
        haptic(20);
        onScan(result.getText());
      }
    } catch {
      setError("Code-barres non détecté sur la photo. Réessaie en te rapprochant.");
    } finally {
      URL.revokeObjectURL(url);
      setCaptureLoading(false);
    }
  }

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
      <p className="text-center text-neutral-500 text-xs">Vise le code-barres du produit</p>

      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCaptureFile}
        className="hidden"
      />
      <button
        onClick={() => captureInputRef.current?.click()}
        disabled={captureLoading}
        className="mx-4 mb-6 mt-3 text-sm text-accent underline"
      >
        {captureLoading ? 'Lecture...' : "C'est flou ? Prendre une photo à la place"}
      </button>
    </div>
  );
}
