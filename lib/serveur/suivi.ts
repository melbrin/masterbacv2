import "server-only";
import * as m from "@/lib/moteur";
import type { Travail } from "@/lib/serveur/etat";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

export interface CalibragePasse {
  id: string;
  /** l'instant où le test s'est terminé, en millisecondes */
  quand: number;
  bilan: m.BilanCalibrage;
}

/**
 * Les tests de calibrage de l'élève, du plus récent au plus ancien, et celui qu'il a laissé en cours s'il y en a un.
 * Lu avec ses propres droits : il ne voit que ses sessions, et jamais leur partie secrète.
 */
export async function calibragesDe(userId: string, travail: Travail): Promise<{ passes: CalibragePasse[]; enCours: string | null }> {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("quiz_sessions").select("id, reponses, debut, termine_le")
    .eq("user_id", userId).eq("genre", "calibrage").order("debut", { ascending: false }).limit(12);
  if (error) throw new Error("La base ne répond pas.");
  const lignes = data ?? [];
  const passes = lignes.filter((l) => l.termine_le).slice(0, 6).map((l) => ({
    id: l.id,
    quand: Date.parse(l.termine_le as string),
    bilan: m.bilanCalibrage(travail.catalogue.sommaire, l.reponses as unknown as { id: string; juste: boolean }[], travail.ctx.reglages),
  }));
  // un test commencé depuis plus d'un jour ne se reprend pas : on en refait un
  const recent = lignes.find((l) => !l.termine_le && Date.parse(l.debut) > travail.ctx.maintenant - 86_400_000);
  return { passes, enCours: recent?.id ?? null };
}

/** Ce que le parcours a besoin de savoir en plus de l'état : le dernier calibrage, et la séance de DS qui attend. */
export function suiviPour(travail: Travail, passes: CalibragePasse[]): m.Suivi {
  const ds = m.prochainDS(travail.ctx);
  const complet = ds ? travail.devoirs.find((d) => d.id === ds.id) : null;
  const seance = complet?.seances.find((s) => !m.seancePlanFaite(travail.ctx, complet.creeA, s));
  return {
    dernierCalibrage: passes[0]?.quand ?? null,
    seanceDs: complet && seance ? { id: complet.id, seance: seance.id, titre: seance.titre, date: seance.date } : null,
  };
}
