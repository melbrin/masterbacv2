-- Le test de catalogue a montré que les fonctions de public restaient exécutables par les rôles du navigateur :
-- Postgres accorde EXECUTE à PUBLIC à la création d'une fonction, et un réglage par schéma ne retire pas ce droit global.
-- Elles ne donnaient accès à rien (les tables refusaient derrière), mais le refus par défaut doit tenir à chaque barrière.

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
-- la seule fonction utile à un compte connecté : savoir s'il est administrateur, pour les règles d'accès
grant execute on function public.est_admin() to authenticated;

-- pour toute fonction créée ensuite par les migrations
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public grant execute on functions to service_role;
