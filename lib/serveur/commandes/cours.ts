"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as s from "@/lib/commun/schemas";
import { decoupe, resultatDuScore } from "@/lib/moteur";
import { peutOuvrirCorrige } from "@/lib/serveur/acces";
import { itemsComplets } from "@/lib/serveur/contenu/lecture";
import { action, Refus } from "@/lib/serveur/fabriques";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";
import { enregistreTentative } from "@/lib/serveur/travail";

async function profilActif() {
  const profil = await profilCourant();
  if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
  return profil;
}

export const cocherVu = action({
  nom: "cours.cocherVu",
  acces: "eleve",
  entree: z.object({ fiche: s.numFiche, vu: z.boolean() }),
  limite: { max: 120, secondes: 3600 },
  async executer({ fiche, vu }, session) {
    await profilActif();
    const base = clientAdmin();
    if (vu) await base.from("vu_en_classe").upsert({ user_id: session!.userId, fiche }, { onConflict: "user_id,fiche", ignoreDuplicates: true });
    else await base.from("vu_en_classe").delete().eq("user_id", session!.userId).eq("fiche", fiche);
    revalidatePath("/app", "layout");
    return { vu };
  },
});

export const ouvrirIndice = action({
  nom: "cours.ouvrirIndice",
  acces: "eleve",
  entree: z.object({ cle: s.cleItem, rang: z.union([z.literal(1), z.literal(2)]) }),
  limite: { max: 300, secondes: 3600 },
  async executer({ cle, rang }) {
    await profilActif();
    const [item] = await itemsComplets([cle]);
    const indice = item?.indices[rang - 1];
    if (!indice) throw new Refus("introuvable");
    const libelle = indice.genre === "notions" ? "Les notions en jeu" : indice.genre === "methode" ? "La méthode" : "Le piège à éviter";
    return { libelle, html: indice.html };
  },
});

// Le corrigé ne sort du serveur qu'ici, après contrôle du droit. Chaque ouverture est comptée.
export const ouvrirCorrige = action({
  nom: "cours.ouvrirCorrige",
  acces: "eleve",
  entree: z.object({ cle: s.cleItem }),
  limite: { max: 150, secondes: 3600 },
  async executer({ cle }, session) {
    await profilActif();
    if (!(await peutOuvrirCorrige(session!.userId, cle))) throw new Refus("reserve");
    const [item] = await itemsComplets([cle]);
    if (!item) throw new Refus("introuvable");
    return { genre: item.genre, corrige: item.corrige_html, intro: item.intro_html, etapes: item.etapes, points: item.points };
  },
});

export const seCorriger = action({
  nom: "cours.seCorriger",
  acces: "eleve",
  entree: z.object({
    cle: s.cleItem,
    // une question de cours : un seul jugement ; un exercice : un jugement par question du barème, plus la ligne « Rédaction »
    resultat: s.resultat.optional(),
    etapes: z.array(z.union([z.literal(1), z.literal(0.5), z.literal(0)])).min(1).max(30).optional(),
    redaction: z.union([z.literal(1), z.literal(0.5), z.literal(0)]).optional(),
    contexte: z.enum(["libre", "seance", "ds", "carnet"]).default("libre"),
  }),
  limite: { max: 300, secondes: 3600 },
  async executer(e, session) {
    const profil = await profilActif();
    // on ne se corrige que sur un corrigé qu'on a le droit de lire
    if (!(await peutOuvrirCorrige(session!.userId, e.cle))) throw new Refus("reserve");
    const [item] = await itemsComplets([e.cle]);
    if (!item) throw new Refus("introuvable");
    const estExercice = decoupe(e.cle)?.k === "ex" && item.etapes.length > 0;
    if (estExercice) {
      if (!e.etapes || e.etapes.length !== item.etapes.length || e.redaction === undefined) throw new Refus("invalide");
      // barème provisoire : les points à parts égales entre les questions, la rédaction comptant comme une question
      const lignes = [...e.etapes, e.redaction];
      const score = lignes.reduce((a: number, b) => a + b, 0) / lignes.length;
      const resultat = resultatDuScore(score);
      await enregistreTentative(session!.userId, profil.note_visee, e.cle, resultat, score, e.contexte, { etapes: e.etapes, redaction: e.redaction });
      revalidatePath("/app", "layout");
      return { resultat, score };
    }
    if (!e.resultat) throw new Refus("invalide");
    await enregistreTentative(session!.userId, profil.note_visee, e.cle, e.resultat, null, e.contexte);
    revalidatePath("/app", "layout");
    return { resultat: e.resultat, score: e.resultat === "ok" ? 1 : e.resultat === "partiel" ? 0.5 : 0 };
  },
});

export const signaler = action({
  nom: "cours.signaler",
  acces: "eleve",
  entree: z.object({ reference: z.string().min(1).max(80).regex(/^[\w:. -]+$/), ou: z.enum(["enonce", "corrige", "figure", "autre"]), message: z.string().trim().min(1).max(1000) }),
  limite: { max: 10, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    const { error } = await clientAdmin().from("signalements").insert({ user_id: session!.userId, reference: e.reference, ou: e.ou, message: e.message });
    if (error) throw new Refus("invalide");
    return { note: true };
  },
});
