-- Socle de la base MasterBac (docs/02-architecture.md, section 6 ; docs/03-securite.md, section 4.3).
-- Refus par défaut : chaque table active ses règles d'accès, les rôles du navigateur n'écrivent rien,
-- le schéma « contenu » n'est lisible que par le serveur.

-- Rien n'est accordé d'office aux rôles du navigateur sur ce qui sera créé ici.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create schema if not exists contenu;
revoke all on schema contenu from public, anon, authenticated;
grant usage on schema contenu to service_role;
alter default privileges in schema contenu revoke all on tables from public, anon, authenticated;
alter default privileges in schema contenu grant all on tables to service_role;

-- Le rôle administrateur vit dans les métadonnées non modifiables du compte.
create function public.est_admin() returns boolean
language sql stable set search_path = ''
as $$ select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin' $$;
grant execute on function public.est_admin() to authenticated, service_role;

-- Refuse toute modification ou suppression : pour les tables où l'on ajoute seulement.
create function public.refuse_modification() returns trigger
language plpgsql set search_path = ''
as $$ begin raise exception 'cette table n''accepte que des ajouts' using errcode = '42501'; end $$;

-- ============================================================ comptes

create table public.profils (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'eleve' check (role in ('eleve', 'parent')),
  prenom text not null check (char_length(prenom) between 1 and 40 and prenom ~ '^[[:alpha:]][[:alpha:] ''’-]*$'),
  classe text not null default 'terminale' check (classe in ('terminale', 'premiere')),
  specialites text[] not null default '{physique-chimie}' check (specialites <@ array['physique-chimie', 'maths']),
  note_visee smallint not null default 14 check (note_visee in (10, 14, 18)),
  quinze_ans_ou_plus boolean not null,
  etat text not null default 'actif' check (etat in ('actif', 'limite', 'a_supprimer')),
  ds_offertes smallint not null default 1 check (ds_offertes between 0 and 5),
  theme text not null default 'auto' check (theme in ('auto', 'clair', 'sombre')),
  rappels boolean not null default true,
  cree_le timestamptz not null default now()
);
alter table public.profils enable row level security;
create policy profils_lecture on public.profils for select to authenticated using (user_id = (select auth.uid()));
grant select on public.profils to authenticated;

create table public.droits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  offre text not null check (offre in ('pass', 'mensuel', 'pack', 'beta', 'fiches')),
  debut timestamptz not null default now(),
  fin timestamptz,
  origine text not null check (origine in ('administration', 'import', 'beta')),
  reference text check (char_length(reference) <= 80),
  motif text check (char_length(motif) <= 300),
  cree_par uuid references auth.users (id) on delete set null,
  retire_le timestamptz,
  retire_motif text check (char_length(retire_motif) <= 300),
  check (fin is null or fin > debut)
);
create index droits_user on public.droits (user_id);
alter table public.droits enable row level security;
create policy droits_lecture on public.droits for select to authenticated using (user_id = (select auth.uid()));
grant select on public.droits to authenticated;

-- Un accès préparé pour une adresse qui n'a pas encore de compte (décision 0002).
create table public.droits_en_attente (
  id uuid primary key default gen_random_uuid(),
  adresse text not null check (adresse = lower(adresse) and char_length(adresse) between 5 and 254 and adresse ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  offre text not null check (offre in ('pass', 'mensuel', 'pack', 'beta', 'fiches')),
  fin timestamptz,
  reference text check (char_length(reference) <= 80),
  motif text check (char_length(motif) <= 300),
  cree_par uuid references auth.users (id) on delete set null,
  cree_le timestamptz not null default now(),
  reclame_le timestamptz,
  reclame_par uuid references auth.users (id) on delete set null
);
create index droits_en_attente_adresse on public.droits_en_attente (adresse) where reclame_le is null;
alter table public.droits_en_attente enable row level security;

-- ============================================================ travail de l'élève

create table public.vu_en_classe (
  user_id uuid not null references auth.users (id) on delete cascade,
  fiche smallint not null check (fiche between 1 and 99),
  coche_le timestamptz not null default now(),
  primary key (user_id, fiche)
);
alter table public.vu_en_classe enable row level security;
create policy vu_lecture on public.vu_en_classe for select to authenticated using (user_id = (select auth.uid()));
grant select on public.vu_en_classe to authenticated;

create table public.tentatives (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cle text not null check (cle ~ '^([0-9]{1,2}-(q|ex)[0-9]{1,3}|quiz:[A-Za-z0-9_-]{1,40})$'),
  resultat text not null check (resultat in ('ok', 'partiel', 'ko')),
  score numeric(4, 3) not null check (score between 0 and 1),
  cree_le timestamptz not null default now(),
  contexte text not null default 'libre' check (contexte in ('libre', 'seance', 'ds', 'quiz', 'passage', 'carnet', 'test')),
  detail jsonb check (detail is null or pg_column_size(detail) < 8000),
  version_contenu integer
);
create index tentatives_user on public.tentatives (user_id, cree_le, id);
alter table public.tentatives enable row level security;
create policy tentatives_lecture on public.tentatives for select to authenticated using (user_id = (select auth.uid()));
grant select on public.tentatives to authenticated;
create trigger tentatives_ajout_seul before update on public.tentatives for each row execute function public.refuse_modification();
-- la suppression d'un compte efface ses tentatives : seul ce chemin, par la clé étrangère, peut supprimer
create function public.tentatives_refuse_suppression() returns trigger
language plpgsql set search_path = ''
as $$ begin
  if exists (select 1 from auth.users u where u.id = old.user_id) then
    raise exception 'cette table n''accepte que des ajouts' using errcode = '42501';
  end if;
  return old;
end $$;
create trigger tentatives_pas_de_suppression before delete on public.tentatives for each row execute function public.tentatives_refuse_suppression();

create table public.carnet (
  user_id uuid not null references auth.users (id) on delete cascade,
  cle text not null check (char_length(cle) <= 50),
  echeance date not null,
  etape smallint not null check (etape between 0 and 5),
  entre_le timestamptz not null default now(),
  rang bigint generated always as identity,
  primary key (user_id, cle)
);
create index carnet_echeance on public.carnet (user_id, echeance);
alter table public.carnet enable row level security;
create policy carnet_lecture on public.carnet for select to authenticated using (user_id = (select auth.uid()));
grant select on public.carnet to authenticated;

create table public.passages (
  user_id uuid not null references auth.users (id) on delete cascade,
  fiche smallint not null check (fiche between 1 and 99),
  niveau smallint not null check (niveau in (10, 14, 18)),
  reussi_le timestamptz not null default now(),
  primary key (user_id, fiche, niveau)
);
alter table public.passages enable row level security;
create policy passages_lecture on public.passages for select to authenticated using (user_id = (select auth.uid()));
grant select on public.passages to authenticated;

create table public.ds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  jour_devoir date not null,
  duree smallint not null check (duree in (1, 2, 4)),
  fiches smallint[] not null check (cardinality(fiches) between 1 and 6),
  objectif smallint not null check (objectif in (10, 14, 18)),
  format text not null check (format in ('express', 'trois-jours', 'semaine')),
  seances jsonb not null check (jsonb_typeof(seances) = 'array' and pg_column_size(seances) < 60000),
  note numeric(4, 2) check (note between 0 and 20),
  moyenne_classe numeric(4, 2) check (moyenne_classe between 0 and 20),
  offert boolean not null default false,
  cree_le_jour date not null,
  cree_le timestamptz not null default now()
);
create index ds_user on public.ds (user_id, jour_devoir);
alter table public.ds enable row level security;
create policy ds_lecture on public.ds for select to authenticated using (user_id = (select auth.uid()));
grant select on public.ds to authenticated;

create table public.seances_du_jour (
  user_id uuid not null references auth.users (id) on delete cascade,
  jour date not null,
  revoir text[] not null check (cardinality(revoir) <= 6),
  exercice text check (char_length(exercice) <= 50),
  etape smallint not null default 0 check (etape between 0 and 3),
  raison text not null check (raison in ('ds', 'classe', 'defaut')),
  ds_id uuid references public.ds (id) on delete set null,
  faite boolean not null default false,
  primary key (user_id, jour)
);
alter table public.seances_du_jour enable row level security;
create policy seances_lecture on public.seances_du_jour for select to authenticated using (user_id = (select auth.uid()));
grant select on public.seances_du_jour to authenticated;

-- Une session de quiz : les questions tirées et l'ordre des choix sont fixés par le serveur.
-- La colonne « secret » porte ce que l'élève ne doit pas lire avant d'avoir répondu : elle n'est pas accordée.
create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  genre text not null check (genre in ('chapitre', 'ds', 'passage', 'carnet', 'seance')),
  fiche smallint check (fiche between 1 and 99),
  niveau smallint check (niveau in (10, 14, 18)),
  questions text[] not null check (cardinality(questions) between 1 and 40),
  secret jsonb not null default '{}'::jsonb check (pg_column_size(secret) < 30000),
  reponses jsonb not null default '[]'::jsonb check (jsonb_typeof(reponses) = 'array' and pg_column_size(reponses) < 30000),
  debut timestamptz not null default now(),
  limite timestamptz,
  termine_le timestamptz,
  bonnes smallint check (bonnes >= 0)
);
create index quiz_sessions_user on public.quiz_sessions (user_id, debut);
alter table public.quiz_sessions enable row level security;
create policy quiz_sessions_lecture on public.quiz_sessions for select to authenticated using (user_id = (select auth.uid()));
grant select (id, user_id, genre, fiche, niveau, questions, reponses, debut, limite, termine_le, bonnes) on public.quiz_sessions to authenticated;

create table public.signalements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference text not null check (char_length(reference) <= 80),
  ou text not null check (ou in ('enonce', 'corrige', 'figure', 'autre')),
  message text not null check (char_length(message) between 1 and 1000),
  etat text not null default 'nouveau' check (etat in ('nouveau', 'en_cours', 'traite', 'refuse')),
  reponse text check (char_length(reponse) <= 1000),
  cree_le timestamptz not null default now(),
  traite_le timestamptz
);
create index signalements_user on public.signalements (user_id, cree_le);
create index signalements_etat on public.signalements (etat, cree_le);
alter table public.signalements enable row level security;
create policy signalements_lecture on public.signalements for select to authenticated using (user_id = (select auth.uid()));
grant select on public.signalements to authenticated;

-- ============================================================ système

create table public.journal_audit (
  id bigint generated always as identity primary key,
  acteur uuid,
  action text not null check (char_length(action) <= 60),
  cible uuid,
  detail jsonb check (detail is null or pg_column_size(detail) < 4000),
  cree_le timestamptz not null default now()
);
create index journal_audit_date on public.journal_audit (cree_le);
create index journal_audit_cible on public.journal_audit (cible);
alter table public.journal_audit enable row level security;
create trigger journal_ajout_seul before update or delete on public.journal_audit for each row execute function public.refuse_modification();

create table public.limites (
  cle text not null check (char_length(cle) <= 120),
  fenetre timestamptz not null,
  compteur integer not null default 0,
  primary key (cle, fenetre)
);
alter table public.limites enable row level security;

-- Compte un appel et dit s'il reste sous la limite. Atomique.
create function public.limite_consomme(p_cle text, p_max integer, p_secondes integer) returns boolean
language plpgsql set search_path = ''
as $$
declare
  v_fenetre timestamptz := to_timestamp(floor(extract(epoch from now()) / p_secondes) * p_secondes);
  v_compteur integer;
begin
  insert into public.limites as l (cle, fenetre, compteur) values (p_cle, v_fenetre, 1)
  on conflict (cle, fenetre) do update set compteur = l.compteur + 1
  returning compteur into v_compteur;
  return v_compteur <= p_max;
end $$;
grant execute on function public.limite_consomme(text, integer, integer) to service_role;

-- Consomme la préparation de DS offerte. Atomique : deux créations simultanées, une seule passe.
create function public.ds_offerte_consomme(p_user uuid) returns boolean
language plpgsql set search_path = ''
as $$
declare v_ok boolean;
begin
  update public.profils set ds_offertes = ds_offertes - 1 where user_id = p_user and ds_offertes > 0 returning true into v_ok;
  return coalesce(v_ok, false);
end $$;
grant execute on function public.ds_offerte_consomme(uuid) to service_role;

-- Attache au compte les accès préparés pour son adresse (décision 0002). Appelée par le serveur à la connexion.
create function public.droits_reclame(p_user uuid) returns integer
language plpgsql set search_path = ''
as $$
declare v_adresse text; v_n integer := 0; r record;
begin
  select lower(email) into v_adresse from auth.users where id = p_user and email_confirmed_at is not null;
  if v_adresse is null then return 0; end if;
  for r in select * from public.droits_en_attente where adresse = v_adresse and reclame_le is null for update loop
    insert into public.droits (user_id, offre, fin, origine, reference, motif, cree_par)
      values (p_user, r.offre, r.fin, 'administration', r.reference, r.motif, r.cree_par);
    update public.droits_en_attente set reclame_le = now(), reclame_par = p_user where id = r.id;
    insert into public.journal_audit (acteur, action, cible, detail) values (r.cree_par, 'droit.reclame', p_user, jsonb_build_object('offre', r.offre, 'reference', r.reference));
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
grant execute on function public.droits_reclame(uuid) to service_role;

-- Le serveur écrit avec le rôle de service.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ============================================================ contenu (lisible par le serveur seulement)

create table contenu.versions (
  id integer generated always as identity primary key,
  empreinte text not null,
  importe_le timestamptz not null default now(),
  resume jsonb
);
create table contenu.fiches (
  num smallint primary key,
  matiere text not null default 'physique-chimie' check (matiere in ('physique-chimie', 'maths')),
  cle text not null unique,
  titre text not null,
  titre_court text not null,
  domaine text not null,
  ordre smallint not null,
  sommaire jsonb not null,
  themes jsonb not null,
  notions jsonb not null,
  essentiel_html text not null,
  pieges jsonb not null,
  tombe_html text not null,
  version integer not null references contenu.versions (id)
);
create table contenu.items (
  cle text primary key check (cle ~ '^[0-9]{1,2}-(q|ex)[0-9]{1,3}$'),
  fiche smallint not null references contenu.fiches (num),
  genre text not null check (genre in ('q', 'ex')),
  numero smallint not null,
  ordre smallint not null,
  theme smallint not null,
  niveau smallint not null check (niveau in (10, 14, 18)),
  type text not null,
  demande text not null default '',
  mention text not null default '',
  points numeric(4, 1),
  duree smallint,
  titre_html text not null,
  titre_txt text not null,
  enonce_html text not null,
  intro_html text not null default '',
  corrige_html text not null,
  etapes jsonb not null default '[]'::jsonb,
  indices jsonb not null default '[]'::jsonb,
  notions text[] not null default '{}',
  archive boolean not null default false,
  version integer not null references contenu.versions (id),
  unique (fiche, genre, numero)
);
create index items_fiche on contenu.items (fiche, ordre);
create table contenu.quiz (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,40}$'),
  fiche smallint not null references contenu.fiches (num),
  ordre integer not null,
  niveau smallint not null check (niveau in (10, 14, 18)),
  type text not null check (type in ('qcm', 'vrai_faux', 'trou', 'association', 'ordre')),
  enonce jsonb not null,
  correction jsonb not null,
  explication text not null default '',
  etat text not null default 'valide' check (etat in ('valide', 'brouillon')),
  archive boolean not null default false,
  version integer not null references contenu.versions (id)
);
create index quiz_fiche on contenu.quiz (fiche, ordre);
create table contenu.figures (
  chemin text primary key check (chemin ~ '^[0-9]{2}/[A-Za-z0-9_.-]+\.webp$'),
  fiche smallint not null references contenu.fiches (num),
  corrige_seul boolean not null,
  -- les items dont le corrigé cite cette figure : le droit sur l'un d'eux ouvre la figure
  items text[] not null default '{}',
  version integer not null references contenu.versions (id)
);
alter table contenu.versions enable row level security;
alter table contenu.fiches enable row level security;
alter table contenu.items enable row level security;
alter table contenu.quiz enable row level security;
alter table contenu.figures enable row level security;
grant all on all tables in schema contenu to service_role;
grant usage, select on all sequences in schema contenu to service_role;

-- Les lectures du contenu passent par des fonctions réservées au serveur : le schéma n'est pas exposé à l'interface de données.
create function public.contenu_sommaire() returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'version', (select max(id) from contenu.versions),
    'fiches', coalesce((select jsonb_agg(jsonb_build_object('num', f.num, 'cle', f.cle, 'titre', f.titre, 'titre_court', f.titre_court, 'domaine', f.domaine,
        'themes', f.themes, 'items', f.sommaire, 'liste_notions', f.notions) order by f.ordre) from contenu.fiches f), '[]'::jsonb),
    'quiz', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'fiche', q.fiche, 'niveau', q.niveau, 'type', q.type) order by q.ordre)
        from contenu.quiz q where q.etat = 'valide' and not q.archive), '[]'::jsonb))
$$;
create function public.contenu_fiche(p_num integer) returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object('num', f.num, 'titre', f.titre, 'titre_court', f.titre_court, 'domaine', f.domaine, 'themes', f.themes,
    'notions', f.notions, 'essentiel_html', f.essentiel_html, 'pieges', f.pieges, 'tombe_html', f.tombe_html)
  from contenu.fiches f where f.num = p_num
$$;
create function public.contenu_items(p_cles text[]) returns jsonb
language sql stable set search_path = ''
as $$ select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) from contenu.items i where i.cle = any (p_cles) and not i.archive $$;
create function public.contenu_quiz(p_ids text[]) returns jsonb
language sql stable set search_path = ''
as $$ select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) from contenu.quiz q where q.id = any (p_ids) and q.etat = 'valide' and not q.archive $$;
create function public.contenu_figure(p_chemin text) returns jsonb
language sql stable set search_path = ''
as $$ select to_jsonb(g) from contenu.figures g where g.chemin = p_chemin $$;

-- Import d'un export complet, en une transaction. Rejouable : les éléments sont reconnus par leur clé,
-- un élément disparu est archivé, jamais supprimé.
create function public.contenu_importe(p jsonb) returns jsonb
language plpgsql set search_path = ''
as $$
declare v integer;
begin
  if exists (select 1 from contenu.versions where empreinte = p ->> 'empreinte' and id = (select max(id) from contenu.versions)) then
    return jsonb_build_object('version', (select max(id) from contenu.versions), 'inchange', true);
  end if;
  insert into contenu.versions (empreinte, resume) values (p ->> 'empreinte', p -> 'resume') returning id into v;

  insert into contenu.fiches (num, cle, titre, titre_court, domaine, ordre, sommaire, themes, notions, essentiel_html, pieges, tombe_html, version)
  select (f ->> 'num')::smallint, f ->> 'cle', f ->> 'titre', f ->> 'titre_court', f ->> 'domaine', (f ->> 'ordre')::smallint,
         f -> 'sommaire', f -> 'themes', f -> 'notions', f ->> 'essentiel_html', f -> 'pieges', f ->> 'tombe_html', v
  from jsonb_array_elements(p -> 'fiches') f
  on conflict (num) do update set cle = excluded.cle, titre = excluded.titre, titre_court = excluded.titre_court, domaine = excluded.domaine,
    ordre = excluded.ordre, sommaire = excluded.sommaire, themes = excluded.themes, notions = excluded.notions,
    essentiel_html = excluded.essentiel_html, pieges = excluded.pieges, tombe_html = excluded.tombe_html, version = excluded.version;

  update contenu.items set archive = true where cle not in (select i ->> 'cle' from jsonb_array_elements(p -> 'items') i);
  insert into contenu.items (cle, fiche, genre, numero, ordre, theme, niveau, type, demande, mention, points, duree, titre_html, titre_txt,
                             enonce_html, intro_html, corrige_html, etapes, indices, notions, archive, version)
  select i ->> 'cle', (i ->> 'fiche')::smallint, i ->> 'genre', (i ->> 'numero')::smallint, (i ->> 'ordre')::smallint, (i ->> 'theme')::smallint,
         (i ->> 'niveau')::smallint, i ->> 'type', coalesce(i ->> 'demande', ''), coalesce(i ->> 'mention', ''), (i ->> 'points')::numeric, (i ->> 'duree')::smallint,
         i ->> 'titre_html', i ->> 'titre_txt', i ->> 'enonce_html', coalesce(i ->> 'intro_html', ''), i ->> 'corrige_html',
         coalesce(i -> 'etapes', '[]'::jsonb), coalesce(i -> 'indices', '[]'::jsonb),
         coalesce((select array_agg(x) from jsonb_array_elements_text(i -> 'notions') x), '{}'), false, v
  from jsonb_array_elements(p -> 'items') i
  on conflict (cle) do update set fiche = excluded.fiche, genre = excluded.genre, numero = excluded.numero, ordre = excluded.ordre, theme = excluded.theme,
    niveau = excluded.niveau, type = excluded.type, demande = excluded.demande, mention = excluded.mention, points = excluded.points, duree = excluded.duree,
    titre_html = excluded.titre_html, titre_txt = excluded.titre_txt, enonce_html = excluded.enonce_html, intro_html = excluded.intro_html,
    corrige_html = excluded.corrige_html, etapes = excluded.etapes, indices = excluded.indices, notions = excluded.notions, archive = false, version = excluded.version;

  update contenu.quiz set archive = true where id not in (select q ->> 'id' from jsonb_array_elements(p -> 'quiz') q);
  insert into contenu.quiz (id, fiche, ordre, niveau, type, enonce, correction, explication, archive, version)
  select q ->> 'id', (q ->> 'fiche')::smallint, (q ->> 'ordre')::integer, (q ->> 'niveau')::smallint, q ->> 'type', q -> 'enonce', q -> 'correction',
         coalesce(q ->> 'explication', ''), false, v
  from jsonb_array_elements(p -> 'quiz') q
  on conflict (id) do update set fiche = excluded.fiche, ordre = excluded.ordre, niveau = excluded.niveau, type = excluded.type, enonce = excluded.enonce,
    correction = excluded.correction, explication = excluded.explication, archive = false, version = excluded.version;

  delete from contenu.figures where chemin not in (select g ->> 'chemin' from jsonb_array_elements(p -> 'figures') g);
  insert into contenu.figures (chemin, fiche, corrige_seul, items, version)
  select g ->> 'chemin', (g ->> 'fiche')::smallint, (g ->> 'corrige_seul')::boolean,
         coalesce((select array_agg(x) from jsonb_array_elements_text(g -> 'items') x), '{}'), v
  from jsonb_array_elements(p -> 'figures') g
  on conflict (chemin) do update set fiche = excluded.fiche, corrige_seul = excluded.corrige_seul, items = excluded.items, version = excluded.version;

  return jsonb_build_object('version', v, 'inchange', false,
    'fiches', (select count(*) from contenu.fiches), 'items', (select count(*) from contenu.items where not archive),
    'quiz', (select count(*) from contenu.quiz where not archive), 'figures', (select count(*) from contenu.figures));
end $$;

grant execute on function public.contenu_sommaire(), public.contenu_fiche(integer), public.contenu_items(text[]), public.contenu_quiz(text[]),
  public.contenu_figure(text), public.contenu_importe(jsonb) to service_role;

-- ============================================================ stockage : compartiment privé des figures
insert into storage.buckets (id, name, public) values ('figures', 'figures', false) on conflict (id) do nothing;
