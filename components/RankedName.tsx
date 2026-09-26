'use client';

import { Crown, Gem } from 'lucide-react';
import { RANK_STYLES } from '@/lib/ranks';

export default function RankedName({
  label,
  rank,
  className = '',
}: {
  label: string;
  rank?: string | null;
  className?: string;
}) {
  const style = rank ? RANK_STYLES[rank] ?? 'text-neutral-300' : 'text-neutral-300';
  return (
    <span className={`inline-flex items-center gap-1 ${style} ${className}`}>
      {rank === 'Légende' && <Crown size={12} className="shrink-0" />}
      {rank === 'Élite' && <Gem size={12} className="shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  );
}
