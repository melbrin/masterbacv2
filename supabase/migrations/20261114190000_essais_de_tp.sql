-- Les essais des TP virtuels (décision 0012) : une ligne par TP commencé.
-- Le serveur vérifie chaque étape, rejoue la manipulation de l'élève et écrit le résultat. L'élève lit ses lignes ; il n'en écrit aucune.
create table public.tp_essais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tp text not null check (tp ~ '^[a-z]{2,20}$'),
  -- la graine qui mélange les étapes à remettre dans l'ordre
  graine integer not null,
  -- une entrée par étape validée : ce que le serveur a répondu (score et correction)
  etapes jsonb not null default '[]'::jsonb check (jsonb_typeof(etapes) = 'array'),
  -- les mesures tirées de la manipulation rejouée par le serveur
  mesures jsonb not null default '{}'::jsonb check (jsonb_typeof(mesures) = 'object'),
  -- le niveau par compétence, une fois le TP terminé
  niveaux jsonb,
  cree_le timestamptz not null default now(),
  termine_le timestamptz,
  check ((niveaux is null) = (termine_le is null))
);
create index tp_essais_par_eleve on public.tp_essais (user_id, tp, cree_le desc);
alter table public.tp_essais enable row level security;
create policy tp_essais_lecture on public.tp_essais for select to authenticated using (user_id = (select auth.uid()));
grant select on public.tp_essais to authenticated;
grant all on public.tp_essais to service_role;
