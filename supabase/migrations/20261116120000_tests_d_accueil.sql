-- Le test de la page d'accueil (demande de Yane du 16 novembre) : un visiteur sans compte passe un test de quinze
-- minutes ; ses réponses sont gardées ici, corrigées par le serveur, puis rattachées à son compte quand il le crée.
-- Seul le serveur lit et écrit cette table : ni le visiteur ni un élève connecté n'y ont accès. L'identifiant du test,
-- tiré au hasard, voyage dans un cookie illisible par un script : c'est lui qui relie le visiteur à ses réponses.
create table public.tests_accueil (
  id uuid primary key default gen_random_uuid(),
  fiches smallint[] not null check (cardinality(fiches) between 1 and 14),
  questions text[] not null check (cardinality(questions) between 1 and 40),
  -- la graine qui fixe l'ordre des choix de chaque question
  graine integer not null,
  -- une entrée par question répondue : son identifiant, et si la réponse était juste
  reponses jsonb not null default '[]'::jsonb check (jsonb_typeof(reponses) = 'array'),
  debut timestamptz not null default now(),
  limite timestamptz not null,
  termine_le timestamptz,
  -- le compte auquel le test a été rattaché, une fois créé
  user_id uuid references auth.users (id) on delete cascade,
  rattache_le timestamptz,
  check ((user_id is null) = (rattache_le is null))
);
create index tests_accueil_par_debut on public.tests_accueil (debut);
alter table public.tests_accueil enable row level security;
-- aucune règle d'accès : les rôles du navigateur ne lisent ni n'écrivent rien
revoke all on public.tests_accueil from anon, authenticated;
grant all on public.tests_accueil to service_role;
