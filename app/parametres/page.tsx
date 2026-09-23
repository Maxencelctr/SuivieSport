'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Ordre d'import important : les tables référencées (muscles, exercises...)
// doivent être réinsérées avant les tables qui pointent vers elles (clés étrangères).
const TABLES_IN_ORDER = [
  'profile',
  'muscles',
  'exercises',
  'exercise_muscles',
  'strength_sessions',
  'strength_sets',
  'runs',
  'food_entries',
  'custom_foods',
  'weight_entries',
  'sleep_entries',
  'goals',
  'water_entries',
  'supplements',
  'supplement_logs',
] as const;

export default function ParametresPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  async function exportData() {
    setExporting(true);
    const result: Record<string, any[]> = {};

    for (const table of TABLES_IN_ORDER) {
      const { data, error } = await supabase.from(table).select('*');
      result[table] = error ? [] : (data ?? []);
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'suivi-sport',
      tables: result,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suivi-sport-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function importData(file: File) {
    setImporting(true);
    setImportLog([]);
    const log: string[] = [];

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const tables = parsed.tables ?? parsed; // tolère un JSON "brut" sans wrapper

      for (const table of TABLES_IN_ORDER) {
        const rows = tables[table];
        if (!rows || rows.length === 0) {
          log.push(`${table} : rien à importer`);
          continue;
        }
        const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
        if (error) {
          log.push(`${table} : erreur — ${error.message}`);
        } else {
          log.push(`${table} : ${rows.length} ligne(s) importée(s)`);
        }
      }
    } catch (e) {
      log.push('Erreur : fichier JSON invalide ou illisible');
    }

    setImportLog(log);
    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Paramètres</h2>
        <Link href="/" className="text-sm text-neutral-400">← Accueil</Link>
      </div>

      <div className="card space-y-3">
        <div className="font-medium text-sm">Exporter mes données</div>
        <p className="text-neutral-500 text-xs">
          Télécharge un fichier JSON avec tout ce que contient l'app : séances, runs, exercices,
          alimentation, objectifs, poids, profil. À garder de côté avant de changer de projet
          Supabase ou juste par sécurité.
        </p>
        <button onClick={exportData} disabled={exporting} className="btn-primary w-full">
          {exporting ? 'Export en cours...' : '⬇ Télécharger mes données'}
        </button>
      </div>

      <div className="card space-y-3">
        <div className="font-medium text-sm">Importer des données</div>
        <p className="text-neutral-500 text-xs">
          Réimporte un fichier exporté précédemment. Les lignes avec le même identifiant sont
          mises à jour, les autres sont ajoutées — rien n'est supprimé.
        </p>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); }}
          disabled={importing}
        />
        {importing && <p className="text-neutral-500 text-sm">Import en cours...</p>}
        {importLog.length > 0 && (
          <div className="text-xs text-neutral-400 space-y-0.5 pt-2 border-t border-[#262626]">
            {importLog.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
