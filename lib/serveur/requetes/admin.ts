import "server-only";
import { requete } from "@/lib/serveur/fabriques";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

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
  return {
    droits: (droits.data ?? []).map((d) => ({ ...d, adresse: parId[d.user_id] ?? "compte supprimé" })),
    maintenant, attente: attente.data ?? [], signalements: signalements.data ?? [], journal: journal.data ?? [], compte, recherche,
  };
});
