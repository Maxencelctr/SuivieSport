'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Camera, Check, Copy, Flame, Swords, Trash2, Trophy, UserPlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { enablePushNotifications, isPushEnabled, pushSupported } from '@/lib/push';
import { haptic } from '@/lib/haptics';
import { useToast } from '@/lib/useToast';
import Toast from '@/components/Toast';
import PullToRefresh from '@/components/PullToRefresh';
import { Challenge, Duel, DuelMetric, Friend, FriendRequest, LeaderboardEntry, ReactionSummary } from '@/lib/types';
import Avatar from '@/components/Avatar';
import ReactionBar from '@/components/ReactionBar';
import { uploadChallengeProof } from '@/lib/challengeProof';
import { computeRankClient } from '@/lib/ranks';
import RankedName from '@/components/RankedName';

const PRESETS = ['10 pompes maintenant', '20 squats maintenant', '30 secondes de gainage', 'Va courir 2km aujourd\'hui'];

const DUEL_METRIC_LABELS: Record<DuelMetric, string> = {
  km: 'Km courus',
  volume: 'Volume soulevé (kg)',
  sessions: 'Nombre de séances',
};

type Tab = 'amis' | 'defis' | 'duels' | 'classement';

export default function AmisPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('amis');
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [received, setReceived] = useState<Challenge[]>([]);
  const [sent, setSent] = useState<Challenge[]>([]);
  const [challengeReactions, setChallengeReactions] = useState<Record<string, ReactionSummary[]>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState('Débutant');
  const [leaderboardMetric, setLeaderboardMetric] = useState<'volume_7j' | 'km_7j'>('volume_7j');

  const [selectedFriend, setSelectedFriend] = useState('');
  const [message, setMessage] = useState(PRESETS[0]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const COOLDOWN_MS = 24 * 60 * 60 * 1000;

  function cooldownRemaining(friendId: string): number {
    const lastSent = sent
      .filter((c) => c.to_user_id === friendId)
      .map((c) => new Date(c.created_at).getTime())
      .sort((a, b) => b - a)[0];
    if (!lastSent) return 0;
    return Math.max(0, COOLDOWN_MS - (Date.now() - lastSent));
  }

  function formatRemaining(ms: number): string {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    return hours > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${minutes}min`;
  }

  const selectedCooldown = selectedFriend ? cooldownRemaining(selectedFriend) : 0;

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const [duels, setDuels] = useState<Duel[]>([]);
  const [duelOpponent, setDuelOpponent] = useState('');
  const [duelMetric, setDuelMetric] = useState<DuelMetric>('km');
  const [duelDays, setDuelDays] = useState(7);
  const [creatingDuel, setCreatingDuel] = useState(false);
  const [duelError, setDuelError] = useState<string | null>(null);

  const [uploadingProofFor, setUploadingProofFor] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const pendingProofChallenge = useRef<string | null>(null);

  useEffect(() => {
    if (pushSupported()) isPushEnabled().then(setPushEnabled);
  }, []);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function load() {
    setLoading(true);
    const [
      { data: profile },
      { data: friendsData },
      { data: requestsData },
      { data: challengesData },
      { data: leaderboardData },
      { data: duelsData },
    ] = await Promise.all([
      supabase.from('profile').select('invite_code').maybeSingle(),
      supabase.rpc('get_friends'),
      supabase.rpc('get_friend_requests'),
      supabase.from('challenges').select('*').order('created_at', { ascending: false }),
      supabase.rpc('get_friends_leaderboard'),
      supabase.rpc('get_my_duels'),
    ]);

    setInviteCode(profile?.invite_code ?? null);
    setFriends(friendsData ?? []);
    setRequests(requestsData ?? []);
    setLeaderboard(leaderboardData ?? []);
    setDuels(duelsData ?? []);

    const [{ count: sessionCount }, { count: runCount }] = await Promise.all([
      supabase.from('strength_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('runs').select('id', { count: 'exact', head: true }),
    ]);
    setMyRank(computeRankClient((sessionCount ?? 0) + (runCount ?? 0)));

    const all = (challengesData ?? []) as Challenge[];
    setReceived(all.filter((c) => c.to_user_id === user?.id));
    const sentChallenges = all.filter((c) => c.from_user_id === user?.id);
    setSent(sentChallenges);

    const doneIds = sentChallenges.filter((c) => c.status === 'done').map((c) => c.id);
    if (doneIds.length > 0) {
      const { data: reactionRows } = await supabase
        .from('activity_reactions')
        .select('activity_id, emoji, user_id')
        .eq('activity_type', 'challenge')
        .in('activity_id', doneIds);

      const byChallenge: Record<string, ReactionSummary[]> = {};
      (reactionRows ?? []).forEach((row: any) => {
        const list = (byChallenge[row.activity_id] ??= []);
        let entry = list.find((r) => r.emoji === row.emoji);
        if (!entry) {
          entry = { emoji: row.emoji, count: 0, reacted_by_me: false };
          list.push(entry);
        }
        entry.count++;
        if (row.user_id === user?.id) entry.reacted_by_me = true;
      });
      setChallengeReactions(byChallenge);
    } else {
      setChallengeReactions({});
    }

    setLoading(false);
  }

  async function createDuel() {
    if (!duelOpponent) return;
    setCreatingDuel(true);
    setDuelError(null);
    const { error } = await supabase.rpc('create_duel', {
      p_opponent_id: duelOpponent,
      p_metric: duelMetric,
      p_days: duelDays,
    });
    setCreatingDuel(false);
    if (error) {
      setDuelError(error.message);
      return;
    }
    toast.trigger('Duel proposé');
    await load();
  }

  async function respondDuel(duelId: string, accept: boolean) {
    await supabase.rpc('respond_duel', { p_duel_id: duelId, p_accept: accept });
    toast.trigger(accept ? 'Duel accepté 🔥' : 'Duel refusé');
    await load();
  }

  async function copyCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    haptic(10);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function redeemCode() {
    const code = codeInput.trim();
    if (!code) return;
    setRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);
    const { data, error } = await supabase.rpc('redeem_invite_code', { code });
    setRedeeming(false);
    if (error) {
      setRedeemError(error.message.includes('invalide') ? 'Code invalide.' : error.message);
      return;
    }
    setCodeInput('');
    setRedeemSuccess(`Demande envoyée à ${data?.[0]?.friend_label ?? 'cet utilisateur'}.`);
    await load();
  }

  async function respondRequest(requestId: string, accept: boolean) {
    await supabase.rpc('respond_friend_request', { request_id: requestId, accept });
    toast.trigger(accept ? 'Ami ajouté' : 'Demande refusée');
    await load();
  }

  async function removeFriend(friendId: string) {
    if (!confirm('Retirer cet ami ?')) return;
    await supabase.from('friend_requests').delete().or(`from_user_id.eq.${friendId},to_user_id.eq.${friendId}`);
    await load();
  }

  async function sendChallenge() {
    if (!selectedFriend || !message.trim() || !user) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    const cooldown = cooldownRemaining(selectedFriend);
    if (cooldown > 0) {
      setSendError(`Tu as déjà défié ${friendLabel(selectedFriend)} récemment. Réessaie dans ${formatRemaining(cooldown)}.`);
      setSending(false);
      return;
    }

    const { error } = await supabase.from('challenges').insert({
      to_user_id: selectedFriend,
      message: message.trim(),
    });

    if (error) {
      setSendError(
        error.message.includes('row-level security')
          ? `Tu as déjà défié ${friendLabel(selectedFriend)} il y a moins de 24h.`
          : error.message
      );
      setSending(false);
      return;
    }

    const sentToLabel = friendLabel(selectedFriend);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    let pushSent = false;
    if (accessToken) {
      try {
        const { data: myProfile } = await supabase.from('profile').select('pseudo, email').maybeSingle();
        const fromLabel = myProfile?.pseudo ?? myProfile?.email ?? user.email;
        const res = await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            targetUserId: selectedFriend,
            title: `Défi de ${fromLabel}`,
            body: message.trim(),
          }),
        });
        if (res.ok) {
          const json = await res.json();
          pushSent = (json.sent ?? 0) > 0;
        } else {
          console.error('push send failed', await res.text());
        }
      } catch (err) {
        // Le défi reste visible dans l'app même si la notif échoue (pas de
        // réseau, ami sans notifs activées...) — on logge pour débug.
        console.error('push send error', err);
      }
    }

    toast.trigger('Défi envoyé');
    setSendSuccess(
      pushSent ? `Défi envoyé à ${sentToLabel}, notification reçue.` : `Défi envoyé à ${sentToLabel}.`
    );
    await load();
    setSending(false);
  }

  async function updateChallenge(id: string, status: 'done' | 'dismissed', proofUrl?: string) {
    const challenge = received.find((c) => c.id === id);
    await supabase
      .from('challenges')
      .update({
        status,
        completed_at: status === 'done' ? new Date().toISOString() : null,
        proof_url: proofUrl ?? null,
      })
      .eq('id', id);

    if (status === 'done') {
      toast.trigger('Défi relevé 💪');
      // Prévient celui qui a envoyé le défi.
      if (challenge && user) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (accessToken) {
          const { data: myProfile } = await supabase.from('profile').select('pseudo, email').maybeSingle();
          const myLabel = myProfile?.pseudo ?? myProfile?.email ?? user.email;
          fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken,
              targetUserId: challenge.from_user_id,
              title: `${myLabel} a relevé ton défi !`,
              body: challenge.message,
            }),
          }).catch((err) => console.error('push send error', err));
        }
      }
    }
    await load();
  }

  function startProofUpload(challengeId: string) {
    pendingProofChallenge.current = challengeId;
    proofInputRef.current?.click();
  }

  async function handleProofSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const challengeId = pendingProofChallenge.current;
    if (!file || !challengeId || !user) return;
    setUploadingProofFor(challengeId);
    const { url, error } = await uploadChallengeProof(user.id, challengeId, file);
    setUploadingProofFor(null);
    if (error) {
      alert(error);
      return;
    }
    await updateChallenge(challengeId, 'done', url);
  }

  async function handleEnablePush() {
    setPushLoading(true);
    setPushError(null);
    const res = await enablePushNotifications();
    setPushLoading(false);
    if (!res.ok) {
      setPushError(res.error ?? 'Erreur inconnue.');
      return;
    }
    setPushEnabled(true);
  }

  function friendLabel(id: string) {
    return friends.find((f) => f.friend_id === id)?.friend_label ?? '…';
  }

  function rankFor(id: string) {
    if (id === user?.id) return myRank;
    return friends.find((f) => f.friend_id === id)?.friend_rank ?? 'Débutant';
  }

  if (loading) return <p className="text-neutral-500 text-sm">Chargement...</p>;

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Amis</h2>
      <input ref={proofInputRef} type="file" accept="image/*" onChange={handleProofSelected} className="hidden" />

      {pushSupported() && !pushEnabled && (
        <div className="card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Bell size={16} className="text-accent shrink-0" />
            <span>Active les notifications pour recevoir les défis de tes amis même app fermée.</span>
          </div>
          <button onClick={handleEnablePush} disabled={pushLoading} className="btn-primary text-sm px-3 py-1.5 shrink-0">
            {pushLoading ? '...' : 'Activer'}
          </button>
        </div>
      )}
      {pushError && <p className="text-red-400 text-sm">{pushError}</p>}
      {pushEnabled && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Bell size={14} className="text-accent" /> Notifications activées sur cet appareil
        </div>
      )}

      {(() => {
        const pendingRequests = requests.length;
        const pendingChallenges = received.filter((c) => c.status === 'pending').length;
        const pendingDuels = duels.filter((d) => d.status === 'pending' && d.opponent_id === user?.id).length;
        const TABS: { key: Tab; label: string; badge: number }[] = [
          { key: 'amis', label: 'Amis', badge: pendingRequests },
          { key: 'defis', label: 'Défis', badge: pendingChallenges },
          { key: 'duels', label: 'Duels', badge: pendingDuels },
          { key: 'classement', label: 'Classement', badge: 0 },
        ];
        return (
          <div className="flex gap-1 p-1 rounded-lg bg-[#0a0a0b] border border-[#26262a] overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 shrink-0 flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md font-medium transition-colors ${
                  tab === t.key ? 'bg-accent text-white' : 'text-neutral-400'
                }`}
              >
                {t.label}
                {t.badge > 0 && (
                  <span className="min-w-[15px] h-[15px] px-0.5 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        );
      })()}

      {tab === 'amis' && requests.length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow">Demandes d'amis</h3>
          {requests.map((r) => (
            <div key={r.request_id} className="card flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <UserPlus size={16} className="text-accent shrink-0" />
                <span className="truncate">{r.from_label}</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => respondRequest(r.request_id, true)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-accent text-white font-semibold"
                >
                  <Check size={14} /> Accepter
                </button>
                <button
                  onClick={() => respondRequest(r.request_id, false)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-[#333] text-neutral-400"
                >
                  <X size={14} /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'defis' && received.filter((c) => c.status === 'pending').length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow">Défis reçus</h3>
          {received
            .filter((c) => c.status === 'pending')
            .map((c) => (
              <div key={c.id} className="card space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Flame size={16} className="text-accent shrink-0" />
                  <span className="font-medium">{c.message}</span>
                </div>
                <div className="text-xs text-neutral-500">
                  De <RankedName label={friendLabel(c.from_user_id)} rank={rankFor(c.from_user_id)} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateChallenge(c.id, 'done')}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-accent text-white font-semibold"
                  >
                    <Check size={14} /> Fait
                  </button>
                  <button
                    onClick={() => startProofUpload(c.id)}
                    disabled={uploadingProofFor === c.id}
                    className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded border border-[#333] text-neutral-400"
                    title="Fait, avec une photo à l'appui"
                  >
                    <Camera size={14} /> {uploadingProofFor === c.id ? '...' : ''}
                  </button>
                  <button
                    onClick={() => updateChallenge(c.id, 'dismissed')}
                    className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded border border-[#333] text-neutral-400"
                  >
                    <X size={14} /> Ignorer
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'amis' && (
      <div className="card space-y-3">
        <h3 className="eyebrow">Ton code d'invitation</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-lg tracking-wider bg-[#0a0a0b] border border-[#26262a] rounded-lg px-3 py-2">
            {inviteCode ?? '—'}
          </div>
          <button onClick={copyCode} className="btn-primary px-3 py-2">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <p className="text-xs text-neutral-500">Partage ce code à un ami pour qu'il t'ajoute.</p>
      </div>
      )}

      {tab === 'amis' && (
      <div className="card space-y-3">
        <h3 className="eyebrow">Ajouter un ami</h3>
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Code d'invitation"
            className="font-mono"
          />
          <button onClick={redeemCode} disabled={redeeming || !codeInput.trim()} className="btn-primary px-4 shrink-0">
            {redeeming ? '...' : 'Envoyer'}
          </button>
        </div>
        {redeemError && <p className="text-red-400 text-sm">{redeemError}</p>}
        {redeemSuccess && <p className="text-accent text-sm">{redeemSuccess}</p>}
      </div>
      )}

      {tab === 'amis' && (
      <div className="space-y-2">
        <h3 className="eyebrow">Mes amis {friends.length > 0 ? `(${friends.length})` : ''}</h3>
        {friends.length === 0 && <p className="text-neutral-500 text-sm">Aucun ami pour l'instant.</p>}
        {friends.map((f) => (
          <div key={f.friend_id} className="card flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar url={f.friend_avatar_url} label={f.friend_label} size={28} />
              <div className="min-w-0">
                <RankedName label={f.friend_label} rank={f.friend_rank} className="text-sm" />
                <div className="text-[10px] text-neutral-500">{f.friend_rank}</div>
              </div>
            </div>
            <button onClick={() => removeFriend(f.friend_id)} className="text-red-400/80 hover:text-red-400 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      )}

      {tab === 'classement' && friends.length === 0 && (
        <p className="text-neutral-500 text-sm">Ajoute d'abord un ami pour voir un classement.</p>
      )}

      {tab === 'classement' && friends.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="eyebrow flex items-center gap-1.5">
              <Trophy size={13} className="text-volt" /> Classement (7 derniers jours)
            </h3>
            <div className="flex gap-1 p-0.5 rounded-lg bg-[#0a0a0b] border border-[#26262a]">
              <button
                onClick={() => setLeaderboardMetric('volume_7j')}
                className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                  leaderboardMetric === 'volume_7j' ? 'bg-accent text-white' : 'text-neutral-400'
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => setLeaderboardMetric('km_7j')}
                className={`text-[11px] px-2 py-1 rounded-md font-medium transition-colors ${
                  leaderboardMetric === 'km_7j' ? 'bg-accent text-white' : 'text-neutral-400'
                }`}
              >
                Km
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {[...leaderboard]
              .sort((a, b) => b[leaderboardMetric] - a[leaderboardMetric])
              .map((entry, i) => (
                <div key={entry.person_id} className="flex items-center gap-2 text-sm">
                  <span className={`w-5 text-center text-xs font-semibold ${i === 0 ? 'text-volt' : 'text-neutral-600'}`}>
                    {i + 1}
                  </span>
                  <RankedName
                    label={entry.person_id === user?.id ? 'Toi' : entry.label}
                    rank={rankFor(entry.person_id)}
                    className="flex-1"
                  />
                  <span className="stat-number text-neutral-300">
                    {leaderboardMetric === 'volume_7j'
                      ? `${Math.round(entry.volume_7j).toLocaleString('fr-FR')}kg`
                      : `${Math.round(entry.km_7j * 10) / 10}km`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === 'duels' && duels.some((d) => d.status === 'pending' && d.opponent_id === user?.id) && (
        <div className="space-y-2">
          <h3 className="eyebrow">Duels proposés</h3>
          {duels
            .filter((d) => d.status === 'pending' && d.opponent_id === user?.id)
            .map((d) => (
              <div key={d.id} className="card flex items-center justify-between gap-3">
                <div className="text-sm min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Swords size={14} className="text-accent shrink-0" />
                    <RankedName label={d.created_by_label} rank={rankFor(d.created_by)} /> <span>te défie</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {DUEL_METRIC_LABELS[d.metric]} · jusqu'au {new Date(d.ends_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => respondDuel(d.id, true)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-accent text-white font-semibold"
                  >
                    <Check size={14} /> Accepter
                  </button>
                  <button
                    onClick={() => respondDuel(d.id, false)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-[#333] text-neutral-400"
                  >
                    <X size={14} /> Refuser
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'duels' && duels.some((d) => d.status === 'active') && (
        <div className="space-y-2">
          <h3 className="eyebrow flex items-center gap-1.5">
            <Swords size={13} className="text-accent" /> Duels en cours
          </h3>
          {duels
            .filter((d) => d.status === 'active')
            .map((d) => {
              const isCreator = d.created_by === user?.id;
              const opponentLabel = isCreator ? d.opponent_label : d.created_by_label;
              const opponentId = isCreator ? d.opponent_id : d.created_by;
              const total = d.my_progress + d.opponent_progress || 1;
              const myPct = Math.round((d.my_progress / total) * 100);
              const unit = d.metric === 'km' ? 'km' : d.metric === 'volume' ? 'kg' : '';
              return (
                <div key={d.id} className="card space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{DUEL_METRIC_LABELS[d.metric]}</span>
                    <span>jusqu'au {new Date(d.ends_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-accent font-medium">Toi : {Math.round(d.my_progress * 10) / 10}{unit}</span>
                    <span className="flex items-center gap-1">
                      <RankedName label={opponentLabel} rank={rankFor(opponentId)} /> : {Math.round(d.opponent_progress * 10) / 10}{unit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#262626] overflow-hidden flex">
                    <div className="h-full bg-accent" style={{ width: `${myPct}%` }} />
                    <div className="h-full bg-neutral-600" style={{ width: `${100 - myPct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {tab === 'duels' && friends.length === 0 && (
        <p className="text-neutral-500 text-sm">Ajoute d'abord un ami (onglet "Amis") pour lancer un duel.</p>
      )}

      {tab === 'duels' && friends.length > 0 && (
        <div className="card space-y-3">
          <h3 className="eyebrow flex items-center gap-1.5">
            <Swords size={13} className="text-accent" /> Lancer un duel
          </h3>
          <div>
            <label className="text-xs text-neutral-500">Contre</label>
            <select value={duelOpponent} onChange={(e) => setDuelOpponent(e.target.value)}>
              <option value="">Choisir un ami</option>
              {friends.map((f) => (
                <option key={f.friend_id} value={f.friend_id}>{f.friend_label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500">Sur quoi</label>
              <select value={duelMetric} onChange={(e) => setDuelMetric(e.target.value as DuelMetric)}>
                {(Object.keys(DUEL_METRIC_LABELS) as DuelMetric[]).map((m) => (
                  <option key={m} value={m}>{DUEL_METRIC_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Durée</label>
              <select value={duelDays} onChange={(e) => setDuelDays(Number(e.target.value))}>
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
              </select>
            </div>
          </div>
          {duelError && <p className="text-red-400 text-sm">{duelError}</p>}
          <button onClick={createDuel} disabled={creatingDuel || !duelOpponent} className="btn-primary w-full">
            {creatingDuel ? 'Envoi...' : 'Proposer le duel'}
          </button>
        </div>
      )}

      {tab === 'defis' && friends.length === 0 && (
        <p className="text-neutral-500 text-sm">Ajoute d'abord un ami (onglet "Amis") pour lui envoyer un défi.</p>
      )}

      {tab === 'defis' && friends.length > 0 && (
        <div className="card space-y-3">
          <h3 className="eyebrow">Envoyer un défi</h3>
          <div>
            <label className="text-xs text-neutral-500">À</label>
            <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
              <option value="">Choisir un ami</option>
              {friends.map((f) => (
                <option key={f.friend_id} value={f.friend_id}>
                  {f.friend_label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setMessage(p)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  message === p ? 'border-accent text-accent bg-accent/10' : 'border-[#262626] text-neutral-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message du défi" />

          {selectedCooldown > 0 && (
            <p className="text-amber-500 text-xs">
              Tu as déjà défié {friendLabel(selectedFriend)} récemment — réessaie dans {formatRemaining(selectedCooldown)}.
            </p>
          )}
          {sendError && <p className="text-red-400 text-sm">{sendError}</p>}
          {sendSuccess && <p className="text-accent text-sm">✓ {sendSuccess}</p>}

          <button
            onClick={sendChallenge}
            disabled={sending || !selectedFriend || !message.trim() || selectedCooldown > 0}
            className="btn-primary w-full"
          >
            {sending ? 'Envoi...' : 'Envoyer le défi'}
          </button>
        </div>
      )}

      {tab === 'defis' && sent.length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow">Défis envoyés</h3>
          {sent.slice(0, 10).map((c) => (
            <div key={c.id} className="card space-y-2 py-2 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div>{c.message}</div>
                  <div className="text-xs text-neutral-500">
                    à <RankedName label={friendLabel(c.to_user_id)} rank={rankFor(c.to_user_id)} />
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${
                    c.status === 'done'
                      ? 'border-volt text-volt'
                      : c.status === 'dismissed'
                        ? 'border-[#333] text-neutral-500'
                        : 'border-accent text-accent'
                  }`}
                >
                  {c.status === 'done' ? 'Fait' : c.status === 'dismissed' ? 'Ignoré' : 'En attente'}
                </span>
              </div>
              {c.status === 'done' && c.proof_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.proof_url} alt="Preuve" className="rounded-lg max-h-48 w-auto" />
              )}
              {c.status === 'done' && (
                <ReactionBar type="challenge" activityId={c.id} reactions={challengeReactions[c.id] ?? []} onChanged={load} />
              )}
            </div>
          ))}
        </div>
      )}

      <Toast message={toast.message} show={toast.show} />
    </div>
    </PullToRefresh>
  );
}
