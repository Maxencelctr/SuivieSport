'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function CalendrierPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [muscuDates, setMuscuDates] = useState<Set<string>>(new Set());
  const [runDates, setRunDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const start = toISO(year, month, 1);
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = toISO(year, month, lastDay);

      const [{ data: sessions }, { data: runs }] = await Promise.all([
        supabase.from('strength_sessions').select('date').gte('date', start).lte('date', end),
        supabase.from('runs').select('date').gte('date', start).lte('date', end),
      ]);

      setMuscuDates(new Set((sessions ?? []).map((s) => s.date)));
      setRunDates(new Set((runs ?? []).map((r) => r.date)));
      setLoading(false);
    }
    load();
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); } else { setMonth(month - 1); }
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); } else { setMonth(month + 1); }
  }

  const firstDayOfMonth = new Date(year, month, 1);
  // Lundi = 0 ... Dimanche = 6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = firstDayOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={prevMonth} className="text-neutral-400 px-2">←</button>
        <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
        <button onClick={nextMonth} className="text-neutral-400 px-2">→</button>
      </div>

      <div className="flex gap-4 text-xs text-neutral-400 justify-center">
        <span><span className="inline-block w-3 h-3 rounded-sm bg-accent align-middle mr-1"></span>Muscu</span>
        <span><span className="inline-block w-3 h-3 rounded-sm bg-pink-500 align-middle mr-1"></span>Course</span>
        <span><span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: 'linear-gradient(135deg, #8B5CF6 50%, #ec4899 50%)' }}></span>Les deux</span>
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm text-center">Chargement...</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} className="text-center text-xs text-neutral-500">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const iso = toISO(year, month, day);
            const hasMuscu = muscuDates.has(iso);
            const hasRun = runDates.has(iso);
            let bg = '#171717';
            if (hasMuscu && hasRun) bg = 'linear-gradient(135deg, #8B5CF6 50%, #ec4899 50%)';
            else if (hasMuscu) bg = '#8B5CF6';
            else if (hasRun) bg = '#ec4899';

            const isToday = iso === toISO(now.getFullYear(), now.getMonth(), now.getDate());

            return (
              <div
                key={i}
                className="aspect-square rounded-md flex items-center justify-center text-sm"
                style={{
                  background: bg,
                  border: isToday ? '2px solid white' : '1px solid #262626',
                  color: hasMuscu || hasRun ? '#0a0a0a' : '#f5f5f5',
                  fontWeight: hasMuscu || hasRun ? 600 : 400,
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
