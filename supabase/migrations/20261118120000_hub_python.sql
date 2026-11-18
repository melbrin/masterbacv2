-- Le hub Python (décision 0016) : une ligne par élève et par exercice essayé.
-- Le programme de l'élève tourne dans son navigateur, qui annonce lui-même si les vérifications passent : la ligne
-- ne sert qu'au suivi de l'élève (aucune note, aucun classement, rien de payant n'en dépend).
-- L'élève lit ses lignes ; il n'en écrit aucune : c'est le serveur qui les écrit.
create table public.python (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercice text not null check (exercice ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(exercice) between 3 and 40),
  -- les vérifications lancées
  essais smallint not null default 0 check (essais between 0 and 9999),
  -- la première réussite ; vide tant que l'exercice n'est pas réussi
  reussi_le timestamptz,
  -- le programme de la première réussite
  code text check (char_length(code) <= 20000),
  maj_le timestamptz not null default now(),
  primary key (user_id, exercice),
  check (code is null or reussi_le is not null)
);
alter table public.python enable row level security;
create policy python_lecture on public.python for select to authenticated using (user_id = (select auth.uid()));
grant select on public.python to authenticated;
grant all on public.python to service_role;
