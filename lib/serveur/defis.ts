import "server-only";
import { lignesEssentiel } from "@/lib/commun/jeux";
import { cleNotion, regles, type Defi, type Simulation, type Valeurs } from "@/lib/commun/simulations";
import { SIMULATIONS } from "@/lib/serveur/contenu/defis";
import { ficheComplete } from "@/lib/serveur/contenu/lecture";
import { env } from "@/lib/serveur/env";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

/**
 * Un énoncé de défi écrit par Claude Code reste un brouillon tant que Yane ne l'a pas validé (docs/07-contenu.md).
 * Un brouillon ne se montre qu'en local, ou à l'administrateur : jamais à un élève sur la recette ou la production.
 */
export const defiVisible = (d: Defi, admin: boolean): boolean => d.etat === "valide" || admin || env().APP_ENV === "local";

/** Les simulations qui ont au moins un défi à montrer, avec ces défis. */
export function simulationsVisibles(admin: boolean): { simulation: Simulation; defis: Defi[] }[] {
  return SIMULATIONS.map((simulation) => ({ simulation, defis: simulation.defis.filter((d) => defiVisible(d, admin)) })).filter((x) => x.defis.length > 0);
}

export interface Avancement {
  essais: number;
  /** vide tant que le défi n'est pas réussi */
  etoiles: number | null;
}

/** Où l'élève en est sur chaque défi qu'il a essayé. Lu avec ses propres droits. */
export async function avancementDesDefis(userId: string): Promise<Map<string, Avancement>> {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("defis").select("defi, essais, etoiles").eq("user_id", userId);
  if (error) throw new Error("La base ne répond pas.");
  return new Map((data ?? []).map((l) => [l.defi, { essais: l.essais, etoiles: l.etoiles }]));
}

/** Un défi est ouvert si c'est le premier de sa simulation, ou si le précédent est réussi. */
export const defiOuvert = (defis: Defi[], rang: number, avancement: Map<string, Avancement>): boolean =>
  rang === 0 || (avancement.get(defis[rang - 1].id)?.etoiles ?? null) !== null;

/** Le bilan d'une liste de défis : combien sont réussis, les étoiles gagnées, et le rang du prochain défi à faire. */
export function bilanDesDefis(defis: Defi[], avancement: Map<string, Avancement>): { reussis: number; etoiles: number; prochain: number } {
  const etoiles = defis.map((d) => avancement.get(d.id)?.etoiles ?? null);
  const prochain = etoiles.findIndex((e) => e === null);
  return { reussis: etoiles.filter((e) => e !== null).length, etoiles: etoiles.reduce<number>((s, e) => s + (e ?? 0), 0), prochain: prochain < 0 ? 0 : prochain };
}

/**
 * Les relations du cours rappelées dans un défi : les lignes du tableau « À connaître par cœur » de la fiche que le défi cite.
 * C'est ce que l'onglet L'essentiel montre déjà à tout compte.
 */
export async function relationsDuDefi(simulation: Simulation, d: Defi): Promise<{ notion: string; relation: string; retenir: string }[]> {
  const fiche = await ficheComplete(simulation.fiche);
  if (!fiche) return [];
  const lignes = lignesEssentiel(fiche.essentiel_html, simulation.fiche);
  return d.rappel.flatMap((nom) => {
    const ligne = lignes.find((l) => cleNotion(l.notion) === cleNotion(nom));
    return ligne ? [{ notion: ligne.notion, relation: ligne.relation, retenir: ligne.retenir }] : [];
  });
}

/**
 * De quoi dessiner une simulation sur les pages du labo, sans rien dire de la réponse : les données d'un défi,
 * une valeur d'attente au milieu des bornes pour ce que l'élève doit calculer, et un instant en plein mouvement.
 */
export function apercuDe(simulation: Simulation, d: Defi): { p: Valeurs; t: number; inconnues: string[] } {
  const p: Valeurs = { ...d.fixes, ...Object.fromEntries(d.champs.map((c) => [c.id, (c.min + c.max) / 2])) };
  return { p, t: 0.55 * (regles(simulation.id)?.duree(p) ?? 0), inconnues: d.champs.map((c) => c.id) };
}
