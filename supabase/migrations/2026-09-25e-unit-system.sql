-- Préférence d'unité de poids (kg par défaut, lb pour qui préfère).
alter table profile add column if not exists unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial'));
