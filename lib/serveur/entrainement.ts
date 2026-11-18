import "server-only";
import { cache } from "react";
import { bilanEntrainement, etatDeLOffre, type BilanEntrainement, type Faits, type Offre } from "@/lib/commun/bilan-entrainement";
import { sectionsOuvertes, type IdSection } from "@/lib/commun/entrainement";
import { ID_JEUX, type IdJeu } from "@/lib/commun/jeux";
import { jeuMemoire } from "@/lib/commun/memoire";
import type { Bilan } from "@/lib/commun/tp/types";
import { simulationsVisibles } from "@/lib/serveur/defis";
import { exercicesVisibles } from "@/lib/serveur/python";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";
import { essaisAReprendre, tpVisibles } from "@/lib/serveur/tp";

/** Les sous-sections de « S'entraîner » qui ont quelque chose à montrer à ce compte, dans l'ordre du menu. */
export const sectionsDe = (admin: boolean): IdSection[] =>
  sectionsOuvertes({ labo: simulationsVisibles(admin).length > 0, tp: tpVisibles(admin).length > 0, python: exercicesVisibles(admin).length > 0 }).map((s) => s.id);

// ---------- l'entraînement dans le parcours et les progrès (décision 0015) ----------

/** Ce que la section propose à ce compte, dans l'ordre de ses pages. Un brouillon ne se propose qu'en local ou à l'administrateur. */
export function offreDe(admin: boolean): Offre {
  return {
    // le rang d'un défi est sa place parmi les défis que ce compte voit : c'est celui de son adresse dans le labo
    defis: simulationsVisibles(admin).flatMap(({ simulation, defis }) => defis.map((d, i) => ({ id: d.id, simulation: simulation.id, rang: i + 1, fiche: simulation.fiche, niveau: d.niveau }))),
    tp: tpVisibles(admin).map((t) => ({ id: t.id, fiche: t.fiche })),
    python: exercicesVisibles(admin).map((e) => ({ id: e.id, fiche: e.fiche })),
  };
}

/** Les parties plus anciennes ne servent ni au bilan de la semaine ni à celui du mois. */
const JOURS_LUS = 45;

/**
 * Ce que l'élève a fait dans « S'entraîner » : ses défis réussis, ses TP terminés ou laissés en route, ses parties
 * récentes, ses exercices Python réussis. Lu avec ses propres droits, une seule fois par page.
 */
export const faitsDe = cache(async (userId: string): Promise<Faits> => {
  const base = await clientUtilisateur();
  const depuis = new Date(Date.now() - JOURS_LUS * 86_400_000).toISOString();
  const [defis, finis, ouverts, memoire, parties, python] = await Promise.all([
    base.from("defis").select("defi, etoiles, reussi_le").eq("user_id", userId).not("etoiles", "is", null),
    base.from("tp_essais").select("tp, niveaux, cree_le, termine_le").eq("user_id", userId).not("termine_le", "is", null).order("cree_le").limit(500),
    // un essai compte comme commencé dès sa première étape validée
    base.from("tp_essais").select("id, tp, cree_le").eq("user_id", userId).is("termine_le", null).neq("etapes", "[]").order("cree_le", { ascending: false }).limit(50),
    base.from("memoire").select("jeu, cree_le").eq("user_id", userId).gte("cree_le", depuis).limit(2000),
    base.from("parties").select("jeu, cree_le").eq("user_id", userId).gte("cree_le", depuis).limit(2000),
    base.from("python").select("exercice, reussi_le").eq("user_id", userId).not("reussi_le", "is", null),
  ]);
  for (const r of [defis, finis, ouverts, memoire, parties, python]) if (r.error) throw new Error("La base ne répond pas.");
  return {
    defis: (defis.data ?? []).map((l) => ({ id: l.defi, etoiles: l.etoiles as number, quand: Date.parse(l.reussi_le as string) })),
    tp: (finis.data ?? []).map((l) => ({ tp: l.tp, bilan: l.niveaux as Bilan, quand: Date.parse(l.termine_le as string) })),
    reprises: [...essaisAReprendre(finis.data ?? [], ouverts.data ?? [])].map(([tp, essai]) => ({ tp, essai })),
    memoire: (memoire.data ?? []).filter((l) => jeuMemoire(l.jeu)).map((l) => Date.parse(l.cree_le)),
    jeux: (parties.data ?? []).filter((l) => ID_JEUX.includes(l.jeu as IdJeu)).map((l) => Date.parse(l.cree_le)),
    python: (python.data ?? []).map((l) => ({ id: l.exercice, quand: Date.parse(l.reussi_le as string) })),
  };
});

/** Les noms à écrire pour un défi ou un TP que le parcours propose. */
export interface NomsEntrainement {
  defi: (id: string) => { simulation: string; titre: string } | null;
  tp: (id: string) => { titre: string; famille: string; minutes: number } | null;
}

export interface Entrainement {
  offre: Offre;
  bilan: BilanEntrainement;
  /** où l'élève en est sur chaque défi et chaque TP offerts : ce que le parcours reçoit */
  suivi: ReturnType<typeof etatDeLOffre>;
  noms: NomsEntrainement;
}

/** L'entraînement de l'élève à l'instant donné : ce qui lui est proposé, ce qu'il a fait, et les chiffres qui en sortent. */
export async function entrainementDe(session: { userId: string; admin: boolean }, maintenant: number): Promise<Entrainement> {
  const offre = offreDe(session.admin);
  const faits = await faitsDe(session.userId);
  const defis = new Map(simulationsVisibles(session.admin).flatMap(({ simulation, defis: liste }) => liste.map((d) => [d.id, { simulation: simulation.nom, titre: d.titre }] as const)));
  const tp = new Map(tpVisibles(session.admin).map((t) => [t.id, { titre: t.titre, famille: t.famille, minutes: t.minutes }] as const));
  return {
    offre, bilan: bilanEntrainement(offre, faits, maintenant), suivi: etatDeLOffre(offre, faits),
    noms: { defi: (id) => defis.get(id) ?? null, tp: (id) => tp.get(id) ?? null },
  };
}
