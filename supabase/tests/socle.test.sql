-- Règles d'accès du socle : refus par défaut, aucune écriture pour les rôles du navigateur,
-- chacun ne lit que ses lignes, le contenu n'est lisible que par le serveur.
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

-- ---------- catalogue : rien n'échappe aux règles d'accès ----------
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'contenu') and c.relkind = 'r' and not c.relrowsecurity),
  0, 'toutes les tables de public et de contenu ont leurs règles d''accès actives');
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema in ('public', 'contenu') and grantee in ('anon', 'authenticated') and privilege_type <> 'SELECT'),
  0, 'les rôles du navigateur n''ont aucun droit d''écriture, sur aucune table');
select is(
  (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'),
  0, 'le visiteur n''a aucun droit sur aucune table');
select is(
  (select count(*)::int from information_schema.role_table_grants where table_schema = 'contenu' and grantee in ('anon', 'authenticated')),
  0, 'les rôles du navigateur n''ont aucun droit sur le contenu');
select ok(not has_schema_privilege('authenticated', 'contenu', 'usage'), 'un compte connecté ne peut pas entrer dans le schéma contenu');
select ok(not has_schema_privilege('anon', 'contenu', 'usage'), 'un visiteur ne peut pas entrer dans le schéma contenu');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname <> 'est_admin'
      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  0, 'aucune fonction du serveur n''est exécutable par un rôle du navigateur');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and (p.proconfig is null or not ('search_path=""' = any (p.proconfig)))),
  0, 'toute fonction security definer fixe search_path à vide');
select is((select count(*)::int from storage.buckets where public), 0, 'aucun compartiment de stockage n''est public');

-- ---------- données d'essai inventées : deux élèves ----------
insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-4000-8000-00000000000a', 'eleve.a@exemple.fr', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-4000-8000-00000000000b', 'eleve.b@exemple.fr', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.profils (user_id, prenom, quinze_ans_ou_plus) values
  ('00000000-0000-4000-8000-00000000000a', 'Aya', true), ('00000000-0000-4000-8000-00000000000b', 'Bilal', true);
insert into public.tentatives (user_id, cle, resultat, score) values ('00000000-0000-4000-8000-00000000000a', '9-q1', 'ko', 0);
insert into public.carnet (user_id, cle, echeance, etape) values ('00000000-0000-4000-8000-00000000000a', '9-q1', '2026-11-15', 0);
insert into public.droits (user_id, offre, origine) values ('00000000-0000-4000-8000-00000000000a', 'pass', 'administration');
insert into public.ds (user_id, jour_devoir, duree, fiches, objectif, format, seances, cree_le_jour)
  values ('00000000-0000-4000-8000-00000000000a', '2026-11-23', 2, '{9}', 14, 'semaine', '[]', '2026-11-13');
insert into public.quiz_sessions (user_id, genre, questions, secret) values ('00000000-0000-4000-8000-00000000000a', 'chapitre', '{CS-B01}', '{"graine": 42}');
insert into public.signalements (user_id, reference, ou, message) values ('00000000-0000-4000-8000-00000000000a', 'fiche 9 q1', 'corrige', 'MARQUEUR-SIGNALEMENT');
insert into public.droits_en_attente (adresse, offre) values ('futur@exemple.fr', 'pass');
insert into public.journal_audit (action) values ('essai');
insert into public.parties (user_id, jeu, fiches, score, secondes) values ('00000000-0000-4000-8000-00000000000a', 'paires', '{1}', 88, 95);
insert into public.defis (user_id, defi, essais, etoiles, reussi_le) values ('00000000-0000-4000-8000-00000000000a', 'basket-1', 2, 2, now());

-- ---------- visiteur ----------
set local role anon;
select throws_ok('select * from public.profils', '42501', null, 'le visiteur ne lit pas les profils');
select throws_ok('select * from public.tentatives', '42501', null, 'le visiteur ne lit pas les tentatives');
select throws_ok('select * from public.parties', '42501', null, 'le visiteur ne lit pas les parties de jeu');
select throws_ok('select * from public.defis', '42501', null, 'le visiteur ne lit pas les défis');
select throws_ok('select * from contenu.items', '42501', null, 'le visiteur ne lit pas le contenu');
select throws_ok('select public.contenu_sommaire()', '42501', null, 'le visiteur n''appelle pas les fonctions de contenu');
reset role;

-- ---------- élève B : rien de ce qui appartient à A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from public.profils), 1, 'B ne voit que son profil');
select is((select prenom from public.profils), 'Bilal', 'et c''est bien le sien');
select is((select count(*)::int from public.tentatives), 0, 'B ne voit pas les tentatives de A');
select is((select count(*)::int from public.carnet), 0, 'B ne voit pas le carnet de A');
select is((select count(*)::int from public.droits), 0, 'B ne voit pas les droits de A');
select is((select count(*)::int from public.ds), 0, 'B ne voit pas les DS de A');
select is((select count(*)::int from public.signalements), 0, 'B ne voit pas les signalements de A');
select is((select count(*)::int from public.quiz_sessions), 0, 'B ne voit pas les sessions de quiz de A');
select is((select count(*)::int from public.parties), 0, 'B ne voit pas les parties de jeu de A');
select is((select count(*)::int from public.defis), 0, 'B ne voit pas les défis de A');
select throws_ok('select * from public.droits_en_attente', '42501', null, 'un élève ne lit pas les accès en attente');
select throws_ok('select * from public.journal_audit', '42501', null, 'un élève ne lit pas le journal d''audit');
select throws_ok('select * from public.limites', '42501', null, 'un élève ne lit pas les compteurs de limite');
select throws_ok('select * from contenu.quiz', '42501', null, 'un élève ne lit pas les clés des quiz');
select throws_ok('select public.contenu_items(array[''9-q1''])', '42501', null, 'un élève n''appelle pas la lecture des corrigés');
select throws_ok('select public.droits_reclame(''00000000-0000-4000-8000-00000000000b'')', '42501', null, 'un élève ne peut pas réclamer un droit lui-même');

-- ---------- élève A : ses lignes, en lecture seule ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select is((select count(*)::int from public.tentatives), 1, 'A voit ses tentatives');
select is((select score::int from public.parties), 88, 'A voit ses parties de jeu');
select throws_ok($$insert into public.parties (user_id, jeu, fiches, score, secondes) values ('00000000-0000-4000-8000-00000000000a', 'paires', '{1}', 100, 10)$$, '42501', null, 'A ne peut pas écrire lui-même une partie');
select throws_ok($$update public.parties set score = 1000$$, '42501', null, 'A ne peut pas changer le score d''une partie');
select is((select etoiles::int from public.defis), 2, 'A voit ses défis');
select throws_ok($$insert into public.defis (user_id, defi, essais, etoiles, reussi_le) values ('00000000-0000-4000-8000-00000000000a', 'rc-1', 1, 3, now())$$, '42501', null, 'A ne peut pas se déclarer un défi réussi');
select throws_ok($$update public.defis set etoiles = 3, essais = 1$$, '42501', null, 'A ne peut pas se donner trois étoiles');
select throws_ok('select secret from public.quiz_sessions', '42501', null, 'A ne peut pas lire la partie secrète de sa session de quiz');
select throws_ok($$insert into public.droits (user_id, offre, origine) values ('00000000-0000-4000-8000-00000000000a', 'pass', 'administration')$$, '42501', null, 'A ne peut pas s''ouvrir un droit');
select throws_ok($$update public.profils set ds_offertes = 5 where user_id = '00000000-0000-4000-8000-00000000000a'$$, '42501', null, 'A ne peut pas se rendre sa préparation offerte');
select throws_ok($$insert into public.tentatives (user_id, cle, resultat, score) values ('00000000-0000-4000-8000-00000000000a', '9-q2', 'ok', 1)$$, '42501', null, 'A ne peut pas écrire une tentative lui-même');
reset role;

-- ---------- service : ajouts seulement là où c'est la règle ----------
select throws_ok($$update public.tentatives set resultat = 'ok' where cle = '9-q1'$$, '42501', null, 'une tentative ne se modifie pas, même par le serveur');

-- ---------- calibrage et jeux : les nouveaux genres passent, un genre inconnu est refusé ----------
select lives_ok($$insert into public.quiz_sessions (user_id, genre, questions) values ('00000000-0000-4000-8000-00000000000a', 'calibrage', '{CS-B01}'), ('00000000-0000-4000-8000-00000000000a', 'jeu', '{CS-B01}'), ('00000000-0000-4000-8000-00000000000a', 'melange', '{CS-B01}')$$, 'le serveur ouvre un calibrage, un jeu, un quiz mélangé');
select throws_ok($$insert into public.quiz_sessions (user_id, genre, questions) values ('00000000-0000-4000-8000-00000000000a', 'autre', '{CS-B01}')$$, '23514', null, 'un genre de quiz inconnu est refusé');
select lives_ok($$insert into public.tentatives (user_id, cle, resultat, score, contexte) values ('00000000-0000-4000-8000-00000000000a', 'quiz:CS-B01', 'ok', 1, 'calibrage'), ('00000000-0000-4000-8000-00000000000a', 'quiz:CS-B01', 'ko', 0, 'jeu')$$, 'une réponse de calibrage ou de jeu s''enregistre');
select throws_ok($$insert into public.parties (user_id, jeu, fiches, score, secondes) values ('00000000-0000-4000-8000-00000000000a', 'inconnu', '{1}', 10, 10)$$, '23514', null, 'un jeu inconnu est refusé');

-- ---------- défis : un défi réussi a ses étoiles, un défi non réussi n'en a pas ----------
select throws_ok($$insert into public.defis (user_id, defi, essais, etoiles) values ('00000000-0000-4000-8000-00000000000a', 'rc-2', 1, 3)$$, '23514', null, 'des étoiles sans réussite sont refusées');
select throws_ok($$insert into public.defis (user_id, defi, essais) values ('00000000-0000-4000-8000-00000000000a', 'Pas un défi', 1)$$, '23514', null, 'un identifiant de défi mal formé est refusé');

select * from finish();
rollback;
