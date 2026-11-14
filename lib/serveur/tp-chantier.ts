import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { EtapePublique, GesteBrut, RetourEtape } from "@/lib/commun/tp/types";
import type { Tp } from "@/lib/serveur/contenu/tp/types";
import { env } from "@/lib/serveur/env";
import { action, Refus } from "@/lib/serveur/fabriques";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { etapePublique, verifie, type Regles } from "@/lib/serveur/tp";
import { gestes } from "@/lib/serveur/tp-gestes";

// Le chantier des TP, en local seulement. Une paillasse en construction ne s'inscrit pas dans l'application : elle a
// son banc de chantier, qui ne charge que ses propres fichiers (app/(appli)/app/tp/chantier/<famille>/). Un fichier à
// moitié écrit ne peut alors casser que son propre banc, jamais les pages des élèves ni les bancs des autres.

/** Le TP d'un chantier que l'adresse demande (« ?tp=focale&graine=3 »), et ses étapes de paillasse. */
export async function bancDeChantier(tps: Record<string, Tp>, demande: { tp?: string; graine?: string }): Promise<{ t: Tp; graine: number; paillasses: { rang: number; etape: EtapePublique }[]; autres: string[] }> {
  if (env().APP_ENV !== "local") notFound();
  await espaceEleve();
  const ids = Object.keys(tps);
  const id = demande.tp && Object.hasOwn(tps, demande.tp) ? demande.tp : ids[0];
  if (!id) notFound();
  const graine = Math.max(1, Math.min(2 ** 31 - 1, Math.trunc(Number(demande.graine)) || 1));
  const t = tps[id];
  const paillasses = t.etapes(graine).flatMap((etape, rang) => (etape.genre === "paillasse" ? [{ rang, etape: etapePublique(etape, graine) }] : []));
  return { t, graine, paillasses, autres: ids };
}

/**
 * La commande d'un banc de chantier : elle juge la manipulation d'une étape de paillasse avec les règles du chantier,
 * sans créer d'essai ni rien écrire. Elle ne répond qu'en local.
 */
export function actionDeChantier(famille: string, tps: Record<string, Tp>, regles: Record<string, Regles>) {
  return action({
    nom: `tp.chantier.${famille}`,
    acces: "eleve",
    entree: z.object({ tp: z.string().regex(/^[a-z]{2,20}$/), graine: z.number().int().min(0).max(2 ** 31), etape: z.number().int().min(0).max(40), gestes }),
    limite: { max: 1200, secondes: 3600 },
    async executer(e): Promise<{ retour: RetourEtape; mesures: Record<string, number> }> {
      if (env().APP_ENV !== "local") throw new Refus("introuvable");
      const profil = await profilCourant();
      if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
      const t = Object.hasOwn(tps, e.tp) ? tps[e.tp] : null;
      const etape = t?.etapes(e.graine)[e.etape];
      if (!etape || etape.genre !== "paillasse") throw new Refus("invalide");
      const verdict = await verifie(etape, { g: "paillasse", gestes: e.gestes as GesteBrut[] }, {}, e.graine, async (genre) => (Object.hasOwn(regles, genre) ? regles[genre] : null));
      if (!verdict) throw new Refus("invalide");
      return { retour: verdict.retour, mesures: verdict.mesures ?? {} };
    },
  });
}
