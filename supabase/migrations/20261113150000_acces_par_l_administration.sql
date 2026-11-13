-- Accès ouverts dans l'administration (décision 0002).
-- Ces fonctions lisent auth.users : elles s'exécutent avec les droits de leur propriétaire, fixent search_path à vide,
-- qualifient tous leurs noms, et ne sont exécutables que par le rôle de service.

alter function public.droits_reclame(uuid) security definer;
revoke execute on function public.droits_reclame(uuid) from public, anon, authenticated;

-- Le compte qui porte cette adresse, ou rien. Réservé au serveur, pour l'administration.
create function public.compte_par_adresse(p_adresse text) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('user_id', u.id, 'adresse', u.email, 'cree_le', u.created_at, 'derniere_connexion', u.last_sign_in_at,
    'prenom', p.prenom, 'note_visee', p.note_visee, 'etat', p.etat, 'ds_offertes', p.ds_offertes)
  from auth.users u left join public.profils p on p.user_id = u.id
  where lower(u.email) = lower(p_adresse)
$$;
revoke execute on function public.compte_par_adresse(text) from public, anon, authenticated;
grant execute on function public.compte_par_adresse(text) to service_role;

-- L'adresse d'un compte, pour afficher la liste des accès dans l'administration.
create function public.adresses_des_comptes(p_ids uuid[]) returns jsonb
language sql stable security definer set search_path = ''
as $$ select coalesce(jsonb_object_agg(u.id, u.email), '{}'::jsonb) from auth.users u where u.id = any (p_ids) $$;
revoke execute on function public.adresses_des_comptes(uuid[]) from public, anon, authenticated;
grant execute on function public.adresses_des_comptes(uuid[]) to service_role;
