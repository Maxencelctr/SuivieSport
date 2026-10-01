'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { uploadProgressPhoto, getProgressPhotoUrl } from '@/lib/progressPhotos';
import { useToast } from '@/lib/useToast';
import Toast from '@/components/Toast';
import { ProgressPhoto } from '@/lib/types';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PhotosPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('progress_photos').select('*').order('date', { ascending: false });
    const list = data ?? [];
    setPhotos(list);

    const entries = await Promise.all(
      list.map(async (p) => [p.id, await getProgressPhotoUrl(p.path)] as const)
    );
    setUrls(Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>);
    setLoading(false);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setUploading(true);
    const { path, error } = await uploadProgressPhoto(user.id, file, date);
    if (error || !path) {
      alert(error ?? 'Erreur inconnue.');
      setUploading(false);
      return;
    }
    await supabase.from('progress_photos').insert({ date, path });
    toast.trigger('Photo ajoutée');
    setUploading(false);
    await load();
  }

  async function deletePhoto(photo: ProgressPhoto) {
    if (!confirm('Supprimer cette photo ?')) return;
    await supabase.storage.from('progress-photos').remove([photo.path]);
    await supabase.from('progress_photos').delete().eq('id', photo.id);
    await load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ImageIcon size={20} className="text-accent" /> Photos de progression
      </h2>

      <div className="card space-y-3">
        <div>
          <label className="text-xs text-neutral-500">Date de la photo</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelected} className="hidden" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
          <Camera size={16} /> {uploading ? 'Envoi...' : 'Ajouter une photo'}
        </button>
        <p className="text-[11px] text-neutral-600">
          Visible uniquement par toi — stockage privé, jamais partagé avec tes amis.
        </p>
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm">Chargement...</p>
      ) : photos.length === 0 ? (
        <p className="text-neutral-500 text-sm">Aucune photo pour l&apos;instant.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative rounded-lg overflow-hidden border border-[#262626] bg-[#0a0a0a] aspect-square group">
              {urls[p.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[p.id]} alt={p.date} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">...</div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 flex items-center justify-between">
                <span className="text-[11px] text-neutral-300">{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                <button onClick={() => deletePhoto(p)} className="text-neutral-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}
