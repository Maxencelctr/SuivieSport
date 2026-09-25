'use client';

import { useEffect, useRef, useState } from 'react';
import { Dumbbell, Flame, Footprints, Share2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { computeStreak, toLocalISO } from '@/lib/streak';
import { haptic } from '@/lib/haptics';

interface Stats {
  sessions: number;
  km: number;
  streak: number;
  pseudo: string | null;
}

export default function WeeklyRecapModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const since7 = toLocalISO(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
    const since90 = toLocalISO(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));

    Promise.all([
      supabase.from('strength_sessions').select('date').gte('date', since7),
      supabase.from('runs').select('date, distance_km').gte('date', since7),
      supabase.from('strength_sessions').select('date').gte('date', since90),
      supabase.from('runs').select('date').gte('date', since90),
      supabase.from('profile').select('pseudo').maybeSingle(),
    ]).then(([{ data: weekSessions }, { data: weekRuns }, { data: allSessions }, { data: allRuns }, { data: profile }]) => {
      const dates = new Set<string>([...(allSessions ?? []).map((s) => s.date), ...(allRuns ?? []).map((r) => r.date)]);
      setStats({
        sessions: weekSessions?.length ?? 0,
        km: Math.round((weekRuns ?? []).reduce((sum, r) => sum + Number(r.distance_km), 0) * 10) / 10,
        streak: computeStreak(dates),
        pseudo: profile?.pseudo ?? null,
      });
    });
  }, []);

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    haptic(10);
    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(cardRef.current, { pixelRatio: 2 });
      if (!blob) throw new Error('image generation failed');

      const file = new File([blob], 'volt-recap.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mon récap Volt' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'volt-recap.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // pas grave : l'utilisateur peut réessayer, rien n'est perdu
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-white p-1" aria-label="Fermer">
            <X size={22} />
          </button>
        </div>

        <div
          ref={cardRef}
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'linear-gradient(155deg, #1a1022 0%, #0a0a0b 60%)', border: '1px solid #26262a' }}
        >
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#8B5CF6', fontSize: 20 }}>⚡</span>
            <span className="text-white font-bold text-lg">Volt</span>
          </div>

          <div>
            <div className="text-neutral-400 text-xs uppercase tracking-wide font-semibold">Cette semaine</div>
            {stats?.pseudo && <div className="text-white text-sm mt-0.5">{stats.pseudo}</div>}
          </div>

          {!stats ? (
            <div className="text-neutral-500 text-sm">Chargement...</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <Dumbbell size={20} className="mx-auto mb-1" style={{ color: '#8B5CF6' }} />
                <div className="text-white font-bold text-xl tabular-nums">{stats.sessions}</div>
                <div className="text-neutral-500 text-[10px]">séance{stats.sessions !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-center">
                <Footprints size={20} className="mx-auto mb-1" style={{ color: '#8B5CF6' }} />
                <div className="text-white font-bold text-xl tabular-nums">{stats.km}</div>
                <div className="text-neutral-500 text-[10px]">km courus</div>
              </div>
              <div className="text-center">
                <Flame size={20} className="mx-auto mb-1 text-orange-500" />
                <div className="text-white font-bold text-xl tabular-nums">{stats.streak}</div>
                <div className="text-neutral-500 text-[10px]">jours d'affilée</div>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleShare} disabled={!stats || sharing} className="btn-primary w-full flex items-center justify-center gap-2">
          <Share2 size={16} /> {sharing ? 'Génération...' : 'Partager'}
        </button>
      </div>
    </div>
  );
}
