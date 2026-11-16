"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { corrige, type Reponse } from "@/lib/commun/quiz";
import * as s from "@/lib/commun/schemas";
import { action, Refus } from "@/lib/serveur/fabriques";
import { quizComplets } from "@/lib/serveur/contenu/lecture";
import { vueDe, type QuestionVue } from "@/lib/serveur/quiz";
import { creeTest, noteReponse, questionDuTest, testDuVisiteur, testFini } from "@/lib/serveur/test-accueil";

// Le test de la page d'accueil, pour un visiteur sans compte. Ces deux actions sont publiques : elles ne lisent et
// n'écrivent que le test désigné par le cookie du visiteur, et leur débit est limité par adresse IP.
export const demarrerTestAccueil = action({
  nom: "testAccueil.demarrer",
  acces: "public",
  entree: z.object({ fiches: z.array(s.numFiche).min(1).max(14) }),
  limite: { max: 10, secondes: 3600 },
  async executer(e) {
    if (!(await creeTest(e.fiches))) throw new Refus("introuvable", "Ces chapitres n'ont pas encore de question pour le test. Coche un autre chapitre.");
    redirect("/test");
  },
});

const reponse = z.discriminatedUnion("type", [
  z.object({ type: z.literal("qcm"), choix: z.number().int().min(0).max(9) }),
  z.object({ type: z.literal("vrai_faux"), valeur: z.boolean() }),
  z.object({ type: z.literal("trou"), texte: z.string().max(120) }),
  z.object({ type: z.literal("association"), droites: z.array(z.string().max(300)).max(12) }),
  z.object({ type: z.literal("ordre"), elements: z.array(z.string().max(300)).max(12) }),
]);

/** Ce que le visiteur reçoit après une réponse : la question suivante, jamais la correction ni le score. */
export interface SuiteDuTest { suivante: QuestionVue | null; rang: number; fini: boolean }

export const repondreTestAccueil = action({
  nom: "testAccueil.repondre",
  acces: "public",
  entree: z.object({ rang: z.number().int().min(0).max(40), reponse }),
  limite: { max: 300, secondes: 3600 },
  async executer(e): Promise<SuiteDuTest> {
    const t = await testDuVisiteur();
    if (!t) throw new Refus("introuvable", "Ce test n'existe plus. Recommence-le depuis la page d'accueil.");
    if (testFini(t)) return { suivante: null, rang: t.reponses.length, fini: true };
    // une réponse ne vaut que pour la question attendue : ni rejeu, ni saut
    if (e.rang !== t.reponses.length) throw new Refus("invalide", "Cette question a déjà reçu une réponse.");
    const [q] = await quizComplets([t.questions[e.rang]]);
    if (!q) throw new Refus("erreur");
    const vue = vueDe(q, t.graine, e.rang);
    const verdict = corrige(q.type, vue.choix, q.type === "qcm" ? { c: vue.choix?.indexOf(q.enonce.choix?.[q.correction.c ?? -1] ?? "") } : q.correction, e.reponse as Reponse);
    const suite = await noteReponse(t, { id: q.id, juste: verdict.juste });
    const prochaine = await questionDuTest(suite);
    return { suivante: prochaine?.vue ?? null, rang: suite.reponses.length, fini: prochaine === null };
  },
});
