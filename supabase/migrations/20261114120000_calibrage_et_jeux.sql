-- Test de calibrage, quiz mélangé et jeux (décisions 0009 et 0010).
-- Tout est ajouté : rien de ce que le code déjà écrit utilise n'est retiré ni changé.

-- 1. De nouveaux genres de session de quiz : le quiz qui mélange les chapitres, le test de calibrage,
--    les jeux corrigés par le serveur. Et les contextes de tentative qui vont avec.
alter table public.quiz_sessions drop constraint quiz_sessions_genre_check;
alter table public.quiz_sessions add constraint quiz_sessions_genre_check
  check (genre in ('chapitre', 'ds', 'passage', 'carnet', 'seance', 'melange', 'calibrage', 'jeu'));
alter table public.tentatives drop constraint tentatives_contexte_check;
alter table public.tentatives add constraint tentatives_contexte_check
  check (contexte in ('libre', 'seance', 'ds', 'quiz', 'passage', 'carnet', 'test', 'calibrage', 'jeu'));

-- 2. Les parties de jeu : une ligne par partie terminée. Le serveur écrit, l'élève lit les siennes.
--    Il n'y a pas de classement entre élèves : ces lignes ne servent qu'au record et au suivi de chacun.
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  jeu text not null check (jeu in ('paires', 'cartes', 'pluie', 'relie', 'indices', 'chapitre', 'notion', 'chrono', 'vraifaux', 'ordre')),
  fiches smallint[] not null check (cardinality(fiches) between 1 and 14),
  score smallint not null check (score between 0 and 1000),
  secondes smallint not null check (secondes between 0 and 3600),
  -- vrai quand le serveur a corrigé lui-même les réponses ; faux quand le score vient du navigateur
  verifiee boolean not null default false,
  cree_le timestamptz not null default now()
);
create index parties_par_jeu on public.parties (user_id, jeu, cree_le desc);
alter table public.parties enable row level security;
create policy parties_lecture on public.parties for select to authenticated using (user_id = (select auth.uid()));
grant select on public.parties to authenticated;
grant all on public.parties to service_role;
