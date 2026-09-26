'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Calendar, LogOut, Settings, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { signOutAndClear } from '@/lib/auth';
import { Sex, ActivityLevel, NutritionGoal } from '@/lib/types';
import {
  computeBMR, computeTDEE, computeCalorieTarget, computeProteinTarget,
  ACTIVITY_LABELS, GOAL_LABELS,
} from '@/lib/nutrition';
import { uploadAvatar } from '@/lib/avatar';
import { useToast } from '@/lib/useToast';
import Toast from '@/components/Toast';
import Avatar from '@/components/Avatar';
import { UnitSystem, displayWeight, toKg, weightUnitLabel } from '@/lib/units';

const SECTIONS = [
  { href: '/calendrier', label: 'Calendrier', icon: Calendar },
  { href: '/objectifs', label: 'Objectifs', icon: Target },
  { href: '/stats', label: 'Stats', icon: TrendingUp },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

const WEEKDAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export default function ProfilPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [sex, setSex] = useState<Sex>('homme');
  const [age, setAge] = useState(20);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [activity, setActivity] = useState<ActivityLevel>('modere');
  const [goal, setGoal] = useState<NutritionGoal>('maintien');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [morningMotivation, setMorningMotivation] = useState(true);
  const [morningHour, setMorningHour] = useState(9);
  const [supplementReminder, setSupplementReminder] = useState(true);
  const [supplementHour, setSupplementHour] = useState(20);
  const [schedule, setSchedule] = useState<Record<number, string>>({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    supabase.from('profile').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        if (data.pseudo) setPseudo(data.pseudo);
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.sex) setSex(data.sex);
        if (data.age) setAge(data.age);
        if (data.height_cm) setHeight(Number(data.height_cm));
        if (data.weight_kg) setWeight(Number(data.weight_kg));
        if (data.activity_level) setActivity(data.activity_level);
        if (data.goal) setGoal(data.goal);
        if (data.unit_system) setUnitSystem(data.unit_system);
        if (data.morning_motivation_enabled != null) setMorningMotivation(data.morning_motivation_enabled);
        if (data.morning_motivation_hour != null) setMorningHour(data.morning_motivation_hour);
        if (data.supplement_reminder_enabled != null) setSupplementReminder(data.supplement_reminder_enabled);
        if (data.supplement_reminder_hour != null) setSupplementHour(data.supplement_reminder_hour);
      }
      setLoading(false);
    });

    supabase.from('workout_schedule').select('weekday, time').then(({ data }) => {
      const map: Record<number, string> = {};
      (data ?? []).forEach((row: any) => {
        if (row.time) map[row.weekday] = row.time.slice(0, 5);
      });
      setSchedule(map);
    });
  }, []);

  async function saveSchedule() {
    setSavingSchedule(true);
    const rows = Object.entries(schedule)
      .filter(([, time]) => time)
      .map(([weekday, time]) => ({ weekday: Number(weekday), time }));

    await supabase.from('workout_schedule').delete().neq('weekday', -1);
    if (rows.length > 0) await supabase.from('workout_schedule').insert(rows);

    setSavingSchedule(false);
    toast.trigger('Créneaux enregistrés');
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setUploadingAvatar(true);
    const { url, error } = await uploadAvatar(user.id, file);
    setUploadingAvatar(false);
    if (error) {
      alert(error);
      return;
    }
    setAvatarUrl(url ?? null);
    toast.trigger('Photo de profil mise à jour');
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('profile').upsert({
      pseudo: pseudo.trim() || null,
      sex,
      age,
      height_cm: height,
      weight_kg: weight,
      activity_level: activity,
      goal,
      unit_system: unitSystem,
      morning_motivation_enabled: morningMotivation,
      morning_motivation_hour: morningHour,
      supplement_reminder_enabled: supplementReminder,
      supplement_reminder_hour: supplementHour,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      alert(error.message.includes('unique') ? 'Ce pseudo est déjà pris.' : "Erreur lors de l'enregistrement");
      return;
    }
    toast.trigger('Profil enregistré');
  }

  const bmr = computeBMR(sex, weight, height, age);
  const tdee = computeTDEE(bmr, activity);
  const calorieTarget = computeCalorieTarget(tdee, goal);
  const proteinTarget = computeProteinTarget(weight, goal);

  if (loading) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Mon profil</h2>
        <Link href="/alimentation" className="text-sm text-neutral-400">← Alimentation</Link>
      </div>

      <div className="card flex items-center gap-4">
        <button onClick={() => fileInputRef.current?.click()} className="relative shrink-0" aria-label="Changer la photo de profil">
          <Avatar url={avatarUrl} label={pseudo || user?.email} size={64} />
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-medium">
            {uploadingAvatar ? '...' : 'Changer'}
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        <div className="min-w-0">
          <div className="font-medium truncate">{pseudo || 'Ajoute un pseudo'}</div>
          <div className="text-xs text-neutral-500 truncate">{user?.email}</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="text-xs text-accent mt-1"
          >
            {uploadingAvatar ? 'Envoi...' : 'Changer la photo'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card flex items-center gap-2.5 hover:border-neutral-600 transition py-3"
          >
            <s.icon className="text-accent shrink-0" size={18} />
            <span className="font-medium text-sm">{s.label}</span>
          </Link>
        ))}
      </div>

      <p className="text-neutral-500 text-sm">
        Le formulaire ci-dessous sert à calculer tes objectifs caloriques et protéiques (formule de Mifflin-St Jeor).
        Rien de médical, juste une base pour te situer.
      </p>

      <div className="card space-y-3">
        <div>
          <label className="text-xs text-neutral-500">Pseudo</label>
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={24} placeholder="Affiché à tes amis" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Sexe</label>
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Âge</label>
            <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} min={10} max={100} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Taille (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} min={100} max={230} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Poids ({weightUnitLabel(unitSystem)})</label>
            <input
              type="number"
              value={displayWeight(weight, unitSystem)}
              onChange={(e) => setWeight(toKg(Number(e.target.value), unitSystem))}
              min={unitSystem === 'imperial' ? 66 : 30}
              max={unitSystem === 'imperial' ? 550 : 250}
              step={0.5}
            />
            <Link href="/poids" className="text-xs text-accent">Suivre mon poids dans le temps →</Link>
            <div className="pt-1">
              <Link href="/sommeil" className="text-xs text-accent">Suivre mon sommeil →</Link>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Unité de poids</label>
          <div className="flex gap-1 p-0.5 rounded-lg bg-[#0a0a0b] border border-[#26262a] w-fit">
            <button
              type="button"
              onClick={() => setUnitSystem('metric')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                unitSystem === 'metric' ? 'bg-accent text-white' : 'text-neutral-400'
              }`}
            >
              kg
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem('imperial')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                unitSystem === 'imperial' ? 'bg-accent text-white' : 'text-neutral-400'
              }`}
            >
              lb
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Niveau d'activité</label>
          <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Objectif</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value as NutritionGoal)}>
            {(Object.keys(GOAL_LABELS) as NutritionGoal[]).map((g) => (
              <option key={g} value={g}>{GOAL_LABELS[g]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Bell size={14} className="text-accent" /> Notifications
        </h3>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-300 flex-1 min-w-0">
            <input type="checkbox" checked={morningMotivation} onChange={(e) => setMorningMotivation(e.target.checked)} className="w-auto shrink-0" />
            <span className="truncate">Message de motivation le matin</span>
          </label>
          {morningMotivation && (
            <select
              value={morningHour}
              onChange={(e) => setMorningHour(Number(e.target.value))}
              className="w-auto shrink-0"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h.toString().padStart(2, '0')}h</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-300 flex-1 min-w-0">
            <input type="checkbox" checked={supplementReminder} onChange={(e) => setSupplementReminder(e.target.checked)} className="w-auto shrink-0" />
            <span className="truncate">Rappel compléments non pris</span>
          </label>
          {supplementReminder && (
            <select
              value={supplementHour}
              onChange={(e) => setSupplementHour(Number(e.target.value))}
              className="w-auto shrink-0"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h.toString().padStart(2, '0')}h</option>
              ))}
            </select>
          )}
        </div>

        <p className="text-[11px] text-neutral-600">
          Vérifié une fois par heure — la notif arrive dans l'heure choisie (marge de quelques minutes possible).
        </p>
      </div>

      <div className="card space-y-3">
        <h3 className="text-sm font-medium">Créneaux d'entraînement habituels</h3>
        <p className="text-[11px] text-neutral-600">
          Sert juste à personnaliser le message du matin ("tu as séance aujourd'hui") — laisse vide les jours sans séance prévue.
        </p>
        <div className="space-y-1.5">
          {WEEKDAYS.map((d) => (
            <div key={d.value} className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 w-20 shrink-0">{d.label}</span>
              <input
                type="time"
                value={schedule[d.value] ?? ''}
                onChange={(e) => setSchedule((prev) => ({ ...prev, [d.value]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button onClick={saveSchedule} disabled={savingSchedule} className="btn-primary w-full text-sm py-1.5">
          {savingSchedule ? '...' : 'Enregistrer les créneaux'}
        </button>
      </div>

      <div className="card space-y-2">
        <div className="text-sm text-neutral-400 mb-1">Résultat calculé</div>
        <div className="flex justify-between"><span>Métabolisme de base</span><span>{Math.round(bmr)} kcal</span></div>
        <div className="flex justify-between"><span>Dépense totale/jour</span><span>{Math.round(tdee)} kcal</span></div>
        <div className="flex justify-between text-accent font-semibold"><span>Objectif calories/jour</span><span>{calorieTarget} kcal</span></div>
        <div className="flex justify-between text-accent font-semibold"><span>Objectif protéines/jour</span><span>{proteinTarget} g</span></div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
      </button>

      <button
        onClick={() => signOutAndClear()}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-red-400/80 hover:text-red-400 py-2"
      >
        <LogOut size={15} /> Déconnexion
      </button>

      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}
