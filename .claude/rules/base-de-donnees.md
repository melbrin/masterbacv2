---
paths:
  - "supabase/**"
---

# Base de données

Référence : `docs/02-architecture.md` (section 6) et `docs/03-securite.md` (section 4.3).

- Une migration est un fichier ajouté dans `supabase/migrations/`. On ne modifie jamais une migration déjà appliquée : on en écrit une nouvelle.
- Une migration reste compatible avec le code déjà en ligne : on ajoute d'abord, on retire dans une version suivante. Une migration destructrice a un plan de retour écrit et l'accord de Yane.
- Chaque table créée active ses règles d'accès dans la même migration (`enable row level security`), même si elle n'a aucune politique.
- Les rôles `anon` et `authenticated` n'ont aucun droit d'écriture. Leurs lectures se limitent aux lignes de la personne (`user_id = auth.uid()`), ou au bilan d'un élève lié pour un parent.
- Le schéma `contenu` n'est accessible qu'au serveur. Il n'est pas exposé à l'interface de données.
- Une fonction `security definer` fixe `set search_path = ''`, qualifie tous ses noms, et n'est pas exécutable par un rôle du navigateur sans décision écrite.
- Chaque table porte ses contraintes : valeurs permises, bornes, longueurs, clés étrangères avec leur règle de suppression. La base refuse une donnée invalide.
- `tentatives` et `journal_audit` n'acceptent que des ajouts : un déclencheur refuse modification et suppression.
- Dates en `timestamptz`. Jours civils en `date`, à l'heure de Paris. Identifiants en `uuid` pour ce qui appartient à une personne.
- Un index sur chaque colonne de filtre (`user_id`, dates, clés).
- Chaque table a son fichier de test dans `supabase/tests/`, qui joue les sept rôles : visiteur, élève A, élève B, parent lié, parent non lié, administrateur, service.
- Après une migration : `npm run db:reinitialiser`, `npm run db:types`, `npm run test:db`.
- Les données d'essai de `supabase/graines/` sont inventées : aucun prénom, aucune adresse réels. Les corrigés et les clés de quiz d'essai portent un marqueur unique.
- Aucune commande vers une base distante (`link`, `db push`, `migration repair`) sans l'accord de Yane.
