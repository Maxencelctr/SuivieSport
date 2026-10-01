-- Petits événements/actualités (Winter Arc, Octobre Rose, etc.) : un article
-- court affiché dans /actualites, et optionnellement une recoloration
-- temporaire de l'accent de l'app pendant la période active (ex: rose pour
-- Octobre Rose). Pas d'UI d'admin : ces lignes sont ajoutées à la main via
-- le SQL Editor de Supabase, pas depuis l'app.
create table if not exists app_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  emoji text,
  theme_accent text,
  theme_accent_dark text,
  theme_accent_light text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz default now()
);

-- Contenu éditorial, pas de donnée perso : lecture ouverte à tout compte
-- connecté. Pas de policy insert/update/delete -> non modifiable depuis
-- l'app, seulement via le SQL Editor (rôle postgres, qui bypass RLS).
alter table app_events enable row level security;
drop policy if exists "read app events" on app_events;
create policy "read app events" on app_events for select using (auth.uid() is not null);

alter table profile add column if not exists news_last_seen_at timestamptz;

NOTIFY pgrst, 'reload schema';
