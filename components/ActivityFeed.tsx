'use client';

import { useEffect, useState } from 'react';
import { Dumbbell, Footprints } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import { FeedItem } from '@/lib/types';
import Avatar from './Avatar';
import ReactionBar from './ReactionBar';
import RankedName from './RankedName';
import { computeRankClient } from '@/lib/ranks';

function relativeDate(iso: string) {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ActivityFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranks, setRanks] = useState<Record<string, string>>({});

  async function load() {
    const [{ data }, { data: friendsData }, { count: sessionCount }, { count: runCount }] = await Promise.all([
      supabase.rpc('get_friends_feed', { limit_count: 15 }),
      supabase.rpc('get_friends'),
      supabase.from('strength_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('runs').select('id', { count: 'exact', head: true }),
    ]);
    setItems(data ?? []);

    const rankMap: Record<string, string> = {};
    (friendsData ?? []).forEach((f: any) => (rankMap[f.friend_id] = f.friend_rank));
    if (user) rankMap[user.id] = computeRankClient((sessionCount ?? 0) + (runCount ?? 0));
    setRanks(rankMap);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="eyebrow">Activité récente</h3>
      {items.map((item) => {
        const Icon = item.activity_type === 'session' ? Dumbbell : Footprints;
        const isMe = item.owner_id === user?.id;
        return (
          <div key={`${item.activity_type}-${item.activity_id}`} className="card space-y-2">
            <div className="flex items-center gap-2.5">
              <Avatar url={item.owner_avatar_url} label={item.owner_label} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-sm flex items-center gap-1 flex-wrap">
                  <RankedName label={isMe ? 'Toi' : item.owner_label} rank={ranks[item.owner_id]} className="font-medium" />
                  <span className="text-neutral-400">
                    {item.activity_type === 'session' ? "a fait une séance" : 'a couru'}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">{relativeDate(item.activity_date)}</div>
              </div>
              <Icon size={16} className="text-accent shrink-0" />
            </div>
            <div className="text-xs text-neutral-400">{item.summary}</div>
            <ReactionBar type={item.activity_type} activityId={item.activity_id} reactions={item.reactions} onChanged={load} />
          </div>
        );
      })}
    </div>
  );
}
