-- Les défis du labo (décision 0011) : une ligne par élève et par défi essayé.
-- Le serveur juge chaque essai avec les règles de la simulation, compte les essais et donne les étoiles.
-- L'élève lit ses lignes ; il n'en écrit aucune.
create table public.defis (
  user_id uuid not null references auth.users (id) on delete cascade,
  defi text not null check (defi ~ '^[a-z]{2,20}-[0-9]{1,2}$'),
  -- les essais comptés jusqu'à la première réussite
  essais smallint not null default 0 check (essais between 0 and 999),
  -- trois étoiles au premier essai, deux jusqu'au troisième, une ensuite ; vide tant que le défi n'est pas réussi
  etoiles smallint check (etoiles between 1 and 3),
  reussi_le timestamptz,
  maj_le timestamptz not null default now(),
  primary key (user_id, defi),
  check ((etoiles is null) = (reussi_le is null))
);
alter table public.defis enable row level security;
create policy defis_lecture on public.defis for select to authenticated using (user_id = (select auth.uid()));
grant select on public.defis to authenticated;
grant all on public.defis to service_role;
