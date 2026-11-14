"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ID_JEUX, tire } from "@/lib/commun/jeux";
import * as s from "@/lib/commun/schemas";
import { catalogue } from "@/lib/serveur/contenu/lecture";
import { action, Refus } from "@/lib/serveur/fabriques";
import { ecritPartie } from "@/lib/serveur/jeux";
import { cloturePartie, nouvelleGraine, sessionDe } from "@/lib/serveur/quiz";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

async function profilActif() {
  const profil = await profilCourant();
  if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
  return profil;
}

const fiches = z.array(s.numFiche).min(1).max(14);
const JEUX_NAVIGATEUR = ID_JEUX.filter((j) => j !== "chrono" && j !== "vraifaux" && j !== "ordre") as [string, ...string[]];

// Les jeux qui tournent dans le navigateur annoncent eux-mêmes leur score. Il ne sert qu'au record de l'élève :
// il n'y a ni classement ni récompense, donc rien à gagner à tricher. Les bornes évitent quand même n'importe quoi.
export const enregistrerPartie = action({
  nom: "jeux.enregistrerPartie",
  acces: "eleve",
  entree: z.object({ jeu: z.enum(JEUX_NAVIGATEUR), fiches, score: z.number().int().min(0).max(100), secondes: z.number().int().min(0).max(3600) }),
  limite: { max: 240, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    return ecritPartie(session!.userId, { jeu: e.jeu as (typeof ID_JEUX)[number], fiches: e.fiches, score: e.score, secondes: e.secondes, verifiee: false });
  },
});

// Ce que chaque jeu corrigé par le serveur demande : les genres de question, leur nombre, le minimum pour jouer.
const REGLES = {
  chrono: { types: ["qcm", "vrai_faux"], nombre: 30, minimum: 5, secondes: 90 },
  vraifaux: { types: ["vrai_faux"], nombre: 12, minimum: 4, secondes: 0 },
  ordre: { types: ["ordre"], nombre: 6, minimum: 2, secondes: 0 },
} as const;

// Une partie d'un jeu sur les questions de quiz est une session de quiz : le serveur garde les bonnes réponses,
// corrige chaque réponse et compte le score lui-même.
export const demarrerJeu = action({
  nom: "jeux.demarrer",
  acces: "eleve",
  entree: z.object({ jeu: z.enum(["chrono", "vraifaux", "ordre"]), fiches }),
  limite: { max: 120, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    const regle = REGLES[e.jeu];
    const cat = await catalogue();
    const choisies = [...new Set(e.fiches)].filter((n) => cat.sommaire.parNum.has(n));
    const types: readonly string[] = regle.types;
    const reserve = cat.quiz.filter((q) => choisies.includes(q.fiche) && types.includes(q.type)).map((q) => q.id);
    if (reserve.length < regle.minimum) throw new Refus("introuvable", "Il n'y a pas assez de questions pour ce jeu dans ces chapitres. Choisis plus de chapitres.");
    const graine = nouvelleGraine();
    const questions = tire(reserve, regle.nombre, graine);
    // le temps du jeu se compte sur le serveur ; trois secondes de marge couvrent l'aller-retour de la dernière réponse
    const limite = regle.secondes ? new Date(Date.now() + (regle.secondes + 3) * 1000).toISOString() : null;
    const { data, error } = await clientAdmin().from("quiz_sessions")
      .insert({ user_id: session!.userId, genre: "jeu", questions, secret: { graine, jeu: e.jeu, fiches: choisies }, limite })
      .select("id").single();
    if (error || !data) throw new Refus("erreur");
    redirect(`/app/jeux/partie/${data.id}`);
  },
});

// Le temps est écoulé ou l'élève arrête : la partie se termine sur ce qui a été répondu.
export const terminerJeu = action({
  nom: "jeux.terminer",
  acces: "eleve",
  entree: z.object({ session: s.uuid }),
  limite: { max: 240, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    const sq = await sessionDe(session!.userId, e.session);
    if (!sq || sq.genre !== "jeu") throw new Refus("introuvable");
    return cloturePartie(sq, sq.reponses);
  },
});
