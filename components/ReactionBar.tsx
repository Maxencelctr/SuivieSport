'use client';

import { supabase } from '@/lib/supabase';
import { haptic } from '@/lib/haptics';
import { ReactionSummary } from '@/lib/types';

const EMOJIS = ['💪', '🔥', '👏'];

interface ReactionBarProps {
  type: 'session' | 'run' | 'challenge';
  activityId: string;
  reactions: ReactionSummary[];
  onChanged: () => void;
}

export default function ReactionBar({ type, activityId, reactions, onChanged }: ReactionBarProps) {
  async function toggle(emoji: string) {
    haptic(10);
    await supabase.rpc('react_to_activity', { p_type: type, p_activity_id: activityId, p_emoji: emoji });
    onChanged();
  }

  return (
    <div className="flex items-center gap-1.5">
      {EMOJIS.map((emoji) => {
        const summary = reactions.find((r) => r.emoji === emoji);
        const active = summary?.reacted_by_me ?? false;
        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition ${
              active ? 'border-accent bg-accent/10' : 'border-[#262626] text-neutral-400'
            }`}
          >
            <span>{emoji}</span>
            {summary && summary.count > 0 && <span>{summary.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
