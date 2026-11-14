import "server-only";
import { cache } from "react";
import { jourDeParis } from "@/lib/commun/dates";
import { REGLAGES_ACTUELS, type Contexte, type Devoir, type Etat, type Format, type Resultat, type SeancePlan } from "@/lib/moteur";
import { catalogue, type Catalogue } from "@/lib/serveur/contenu/lecture";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

export interface DevoirComplet extends Devoir {
  seances: SeancePlan[];
  moyenneClasse: number | null;
  offert: boolean;
  creeLe: string;
  /** l'instant de création du plan, en millisecondes : une étape du plan est faite si l'élève y a répondu depuis */
  creeA: number;
}
export interface Travail {
  ctx: Contexte;
  catalogue: Catalogue;
  jour: string;
  devoirs: DevoirComplet[];
}

/**
 * L'état de l'élève, reconstruit depuis la base pour le moteur. Lu avec le client de la personne :
 * les règles d'accès garantissent qu'on ne lit que ses lignes. L'ordre des lignes fait partie des entrées du moteur.
 */
export const travailDe = cache(async (userId: string, objectif: number): Promise<Travail> => {
  const base = await clientUtilisateur();
  const maintenant = Date.now();
  const jour = jourDeParis(new Date(maintenant));
  const [cat, tentatives, carnet, vus, passages, ds, seances] = await Promise.all([
    catalogue(),
    base.from("tentatives").select("cle, resultat, score, cree_le").eq("user_id", userId).order("cree_le").order("id"),
    base.from("carnet").select("cle, echeance, etape").eq("user_id", userId).order("rang"),
    base.from("vu_en_classe").select("fiche").eq("user_id", userId).order("fiche"),
    base.from("passages").select("fiche, niveau, reussi_le").eq("user_id", userId),
    base.from("ds").select("*").eq("user_id", userId).order("cree_le"),
    base.from("seances_du_jour").select("*").eq("user_id", userId).order("jour"),
  ]);
  for (const r of [tentatives, carnet, vus, passages, ds, seances]) if (r.error) throw new Error("La base ne répond pas.");

  const etat: Etat = { profil: { objectif }, vuEnClasse: {}, tentatives: {}, carnet: {}, passages: {}, ds: [], seances: [], seance: null };
  for (const t of tentatives.data ?? []) (etat.tentatives[t.cle] ||= []).push({ t: Date.parse(t.cree_le), r: t.resultat as Resultat, s: Number(t.score) });
  for (const c of carnet.data ?? []) etat.carnet[c.cle] = { due: c.echeance, step: c.etape };
  for (const v of vus.data ?? []) etat.vuEnClasse[String(v.fiche)] = true;
  for (const p of passages.data ?? []) (etat.passages[String(p.fiche)] ||= {})[String(p.niveau)] = Date.parse(p.reussi_le);
  const devoirs: DevoirComplet[] = (ds.data ?? []).map((d) => ({
    id: d.id, date: d.jour_devoir, duree: d.duree, fiches: d.fiches, objectif: d.objectif, format: d.format as Format,
    note: d.note === null ? null : Number(d.note), seances: d.seances as unknown as SeancePlan[],
    moyenneClasse: d.moyenne_classe === null ? null : Number(d.moyenne_classe), offert: d.offert, creeLe: d.cree_le_jour, creeA: Date.parse(d.cree_le),
  }));
  etat.ds = devoirs;
  for (const s of seances.data ?? []) {
    if (s.faite) etat.seances.push({ date: s.jour, minutes: REGLAGES_ACTUELS.minutesSeance });
    if (s.jour === jour) etat.seance = { date: s.jour, revoir: s.revoir, exercice: s.exercice, etape: s.etape, faite: s.faite, raison: s.raison as "ds" | "classe" | "defaut", dsId: s.ds_id };
  }
  return { ctx: { etat, sommaire: cat.sommaire, maintenant, reglages: REGLAGES_ACTUELS }, catalogue: cat, jour, devoirs };
});
