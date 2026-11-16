import "server-only";
import { droitsDepuis, type Droits } from "@/lib/serveur/acces";
import { requete } from "@/lib/serveur/fabriques";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

/** Un compte, tel que l'administration le liste : qui c'est, et ce que son offre lui ouvre. */
export interface CompteListe { id: string; adresse: string; prenom: string | null; etat: string | null; admin: boolean; cree_le: string; vu_le: string | null; droits: Droits }
/** Le nombre de comptes listés d'un coup, les plus récents d'abord. */
const COMPTES_LISTES = 200;

/** Ce que l'administration affiche : accès, accès en attente, signalements, journal. Réservé au rôle administrateur avec double authentification. */
export const tableauAdmin = requete({ nom: "admin.tableau", acces: "admin" }, async (session, recherche: string) => {
  const base = clientAdmin();
  const [droits, attente, signalements, journal] = await Promise.all([
    base.from("droits").select("*").order("debut", { ascending: false }).limit(100),
    base.from("droits_en_attente").select("*").is("reclame_le", null).order("cree_le", { ascending: false }).limit(100),
    base.from("signalements").select("*").order("cree_le", { ascending: false }).limit(50),
    base.from("journal_audit").select("*").order("cree_le", { ascending: false }).limit(30),
  ]);
  const ids = [...new Set((droits.data ?? []).map((d) => d.user_id))];
  const { data: adresses } = await base.rpc("adresses_des_comptes", { p_ids: ids });
  const parId = (adresses ?? {}) as Record<string, string>;
  type Compte = { user_id: string; adresse: string; prenom: string | null; etat: string | null; cree_le: string };
  let compte: Compte | null = null;
  if (recherche) {
    const { data } = await base.rpc("compte_par_adresse", { p_adresse: recherche });
    compte = (data as unknown as Compte | null) ?? null;
    // chaque consultation d'un compte est journalisée
    await base.from("journal_audit").insert({ acteur: session.userId, action: "compte.consulte", cible: compte ? compte.user_id : null });
  }
  const maintenant = Date.now();
  // tous les comptes, les plus récents d'abord, avec ce que leur offre ouvre. Les droits se calculent comme pour l'élève.
  const { data: liste, error: refus } = await base.auth.admin.listUsers({ page: 1, perPage: COMPTES_LISTES });
  if (refus) throw new Error("La base ne répond pas.");
  const tous = liste.users;
  const idsComptes = tous.map((u) => u.id);
  const [profils, tousDroits] = await Promise.all([
    base.from("profils").select("user_id, prenom, etat").in("user_id", idsComptes),
    base.from("droits").select("user_id, offre, debut, fin, retire_le").in("user_id", idsComptes),
  ]);
  const profil = new Map((profils.data ?? []).map((x) => [x.user_id, x]));
  const comptes: CompteListe[] = tous.map((u) => ({
    id: u.id, adresse: u.email ?? "sans adresse", prenom: profil.get(u.id)?.prenom ?? null, etat: profil.get(u.id)?.etat ?? null,
    admin: (u.app_metadata as Record<string, unknown> | undefined)?.role === "admin", cree_le: u.created_at, vu_le: u.last_sign_in_at ?? null,
    droits: droitsDepuis((tousDroits.data ?? []).filter((d) => d.user_id === u.id), maintenant),
  })).sort((a, b) => b.cree_le.localeCompare(a.cree_le));
  return {
    comptes, comptesTronques: tous.length >= COMPTES_LISTES,
    droits: (droits.data ?? []).map((d) => ({ ...d, adresse: parId[d.user_id] ?? "compte supprimé" })),
    maintenant, attente: attente.data ?? [], signalements: signalements.data ?? [], journal: journal.data ?? [], compte, recherche,
  };
});
