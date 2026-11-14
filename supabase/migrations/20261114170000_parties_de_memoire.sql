-- Les parties des jeux de mémoire (décision 0013) : une ligne par partie terminée.
-- Ces jeux ne sont pas liés à un chapitre : ils ont leur table, sans liste de fiches.
-- Le serveur écrit, l'élève lit les siennes. Le score vient du navigateur : il ne sert qu'au record et au suivi de chacun.
create table public.memoire (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  jeu text not null check (jeu ~ '^[a-z]{2,20}$'),
  score smallint not null check (score between 0 and 100),
  secondes smallint not null check (secondes between 0 and 3600),
  cree_le timestamptz not null default now()
);
create index memoire_par_jeu on public.memoire (user_id, jeu, cree_le desc);
alter table public.memoire enable row level security;
create policy memoire_lecture on public.memoire for select to authenticated using (user_id = (select auth.uid()));
grant select on public.memoire to authenticated;
grant all on public.memoire to service_role;
