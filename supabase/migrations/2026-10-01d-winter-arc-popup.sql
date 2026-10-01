-- Popup "Winter Arc" affiché une seule fois par compte (pas à chaque
-- ouverture), entre maintenant et le 1er janvier.
alter table profile add column if not exists seen_winter_arc_popup boolean not null default false;

NOTIFY pgrst, 'reload schema';
