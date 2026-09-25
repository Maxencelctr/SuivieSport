'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Copy, Flame, Trash2, Trophy, UserPlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { enablePushNotifications, isPushEnabled, pushSupported } from '@/lib/push';
import { haptic } from '@/lib/haptics';
import { useToast } from '@/lib/useToast';
import Toast from '@/components/Toast';
import PullToRefresh from '@/components/PullToRefresh';
import { Challenge, Friend, FriendRequest, LeaderboardEntry } from '@/lib/types';
import Avatar from '@/components/Avatar';

const PRESETS = ['10 pompes maintenant', '20 squats maintenant', '30 secondes de gainage', 'Va courir 2km aujourd\'hui'];

export default function AmisPage() {
  const { user } = useAuth();
  const toast = useToast();
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMetric, setLeaderboardMetric] = useState<'volume_7j' | 'km_7j'>('volume_7j');

  const [selectedFriend, setSelectedFriend] = useState('');
  const [message, setMessage] = useState(PRESETS[0]);
  const [sending, setSending] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (pushSupported()) isPushEnabled().then(setPushEnabled);
  }, []);

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function load() {
    setLoading(true);
    const [{ data: profile }, { data: friendsData }, { data: requestsData }, { data: challengesData }, { data: leaderboardData }] =
      await Promise.all([
        supabase.from('profile').select('invite_code').maybeSingle(),
        supabase.rpc('get_friends'),
        supabase.rpc('get_friend_requests'),
        supabase.from('challenges').select('*').order('created_at', { ascending: false }),
        supabase.rpc('get_friends_leaderboard'),
      ]);

    setInviteCode(profile?.invite_code ?? null);
    setFriends(friendsData ?? []);
    setRequests(requestsData ?? []);
    setLeaderboard(leaderboardData ?? []);

    const all = (challengesData ?? []) as Challenge[];
    setReceived(all.filter((c) => c.to_user_id === user?.id));
    setSent(all.filter((c) => c.from_user_id === user?.id));
    setLoading(false);
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

    const { error } = await supabase.from('challenges').insert({
      to_user_id: selectedFriend,
      message: message.trim(),
    });

    if (!error) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        const { data: myProfile } = await supabase.from('profile').select('pseudo, email').maybeSingle();
        const fromLabel = myProfile?.pseudo ?? myProfile?.email ?? user.email;
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            targetUserId: selectedFriend,
            title: `Défi de ${fromLabel}`,
            body: message.trim(),
          }),
        }).catch(() => {
          // pas grave si l'envoi échoue : le défi reste visible dans l'app
        });
      }
      toast.trigger('Défi envoyé');
      await load();
    }
    setSending(false);
  }

  async function updateChallenge(id: string, status: 'done' | 'dismissed') {
    await supabase
      .from('challenges')
      .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', id);
    if (status === 'done') toast.trigger('Défi relevé 💪');
    await load();
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

  if (loading) return <p className="text-neutral-500 text-sm">Chargement...</p>;

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Amis</h2>

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

      {requests.length > 0 && (
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

      {received.filter((c) => c.status === 'pending').length > 0 && (
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
                <div className="text-xs text-neutral-500">De {friendLabel(c.from_user_id)}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateChallenge(c.id, 'done')}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-accent text-white font-semibold"
                  >
                    <Check size={14} /> Fait
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

      <div className="space-y-2">
        <h3 className="eyebrow">Mes amis {friends.length > 0 ? `(${friends.length})` : ''}</h3>
        {friends.length === 0 && <p className="text-neutral-500 text-sm">Aucun ami pour l'instant.</p>}
        {friends.map((f) => (
          <div key={f.friend_id} className="card flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar url={f.friend_avatar_url} label={f.friend_label} size={28} />
              <span className="text-sm truncate">{f.friend_label}</span>
            </div>
            <button onClick={() => removeFriend(f.friend_id)} className="text-red-400/80 hover:text-red-400 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {friends.length > 0 && (
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
                  <span className={`flex-1 truncate ${entry.person_id === user?.id ? 'text-accent font-medium' : ''}`}>
                    {entry.person_id === user?.id ? 'Toi' : entry.label}
                  </span>
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

      {friends.length > 0 && (
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
          <button
            onClick={sendChallenge}
            disabled={sending || !selectedFriend || !message.trim()}
            className="btn-primary w-full"
          >
            {sending ? 'Envoi...' : 'Envoyer le défi'}
          </button>
        </div>
      )}

      {sent.length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow">Défis envoyés</h3>
          {sent.slice(0, 10).map((c) => (
            <div key={c.id} className="card flex items-center justify-between py-2 text-sm">
              <div>
                <div>{c.message}</div>
                <div className="text-xs text-neutral-500">à {friendLabel(c.to_user_id)}</div>
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
          ))}
        </div>
      )}

      <Toast message={toast.message} show={toast.show} />
    </div>
    </PullToRefresh>
  );
}
