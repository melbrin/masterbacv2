"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ecartEnJours } from "@/lib/commun/dates";
import * as s from "@/lib/commun/schemas";
import * as m from "@/lib/moteur";
import { droitsDe } from "@/lib/serveur/acces";
import { travailDe } from "@/lib/serveur/etat";
import { action, Refus } from "@/lib/serveur/fabriques";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

async function profilActif() {
  const profil = await profilCourant();
  if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
  return profil;
}

export const creerDs = action({
  nom: "ds.creer",
  acces: "eleve",
  entree: z.object({ jourDevoir: s.jour, duree: z.union([z.literal(1), z.literal(2), z.literal(4)]), objectif: s.noteVisee, fiches: z.array(s.numFiche).min(1).max(6) }),
  limite: { max: 20, secondes: 3600 },
  async executer(e, session) {
    const profil = await profilActif();
    const userId = session!.userId;
    const { ctx, jour, catalogue } = await travailDe(userId, profil.note_visee);
    const fiches = [...new Set(e.fiches)].sort((a, b) => a - b);
    if (fiches.some((n) => !catalogue.sommaire.parNum.has(n))) throw new Refus("invalide");
    const dans = ecartEnJours(jour, e.jourDevoir);
    if (dans < 0 || dans > 120) throw new Refus("invalide", "La date du devoir doit être aujourd'hui ou dans les quatre mois.");
    const droits = await droitsDe(userId);
    const base = clientAdmin();
    let offert = false;
    if (!droits.coach) {
      // offre gratuite : une préparation offerte par compte, décomptée dans la base en une seule opération
      const { data: consommee } = await base.rpc("ds_offerte_consomme", { p_user: userId });
      if (!consommee) throw new Refus("reserve", "Ta préparation de DS offerte est déjà utilisée. Le Pass ouvre le mode DS sans limite.");
      offert = true;
    }
    const id = crypto.randomUUID();
    // le plan est construit une fois, par le serveur, et gardé tel quel
    const plan = m.construitPlan(ctx, { id, date: e.jourDevoir, duree: e.duree, fiches, objectif: e.objectif });
    const { error } = await base.from("ds").insert({
      id, user_id: userId, jour_devoir: e.jourDevoir, duree: e.duree, fiches, objectif: e.objectif, format: plan.format,
      seances: plan.seances as never, offert, cree_le_jour: jour,
    });
    if (error) throw new Refus("erreur");
    revalidatePath("/app", "layout");
    redirect(`/app/ds/${id}`);
  },
});

export const cocherSeance = action({
  nom: "ds.cocherSeance",
  acces: "eleve",
  entree: z.object({ id: s.uuid, seance: z.string().regex(/^s\d{1,2}$/), faite: z.boolean() }),
  limite: { max: 200, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    const base = clientAdmin();
    const { data } = await base.from("ds").select("seances").eq("id", e.id).eq("user_id", session!.userId).maybeSingle();
    if (!data) throw new Refus("introuvable");
    const seances = (data.seances as unknown as m.SeancePlan[]).map((x) => (x.id === e.seance ? { ...x, faite: e.faite } : x));
    await base.from("ds").update({ seances: seances as never }).eq("id", e.id).eq("user_id", session!.userId);
    revalidatePath("/app", "layout");
    return { faite: e.faite };
  },
});

// Une étape de lecture (l'essentiel, les pièges, le carnet, l'épreuve du DS blanc) se coche à la main.
// Les questions et le test se constatent dans les réponses de l'élève : ils ne passent pas par ici.
export const cocherEtape = action({
  nom: "ds.cocherEtape",
  acces: "eleve",
  entree: z.object({ id: s.uuid, seance: z.string().regex(/^s\d{1,2}$/), etape: z.string().regex(/^(essentiel:\d{1,2}|pieges|carnet|blanc)$/) }),
  limite: { max: 300, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    const base = clientAdmin();
    const { data } = await base.from("ds").select("seances").eq("id", e.id).eq("user_id", session!.userId).maybeSingle();
    if (!data) throw new Refus("introuvable");
    const seances = data.seances as unknown as m.SeancePlan[];
    const visee = seances.find((x) => x.id === e.seance);
    if (!visee || !m.etapesDeSeance(visee).some((x) => x.id === e.etape && m.etapeACocher(x))) throw new Refus("introuvable");
    const suite = seances.map((x) => (x.id === e.seance ? { ...x, lues: [...new Set([...(x.lues ?? []), e.etape])] } : x));
    const { error } = await base.from("ds").update({ seances: suite as never }).eq("id", e.id).eq("user_id", session!.userId);
    if (error) throw new Refus("erreur");
    revalidatePath("/app", "layout");
    // la page de la séance renvoie vers la première étape qui reste à faire, ou vers le plan si tout est fait
    redirect(`/app/ds/${e.id}/${e.seance}`);
  },
});

export const noterDs = action({
  nom: "ds.noter",
  acces: "eleve",
  entree: z.object({ id: s.uuid, note: z.number().min(0).max(20), moyenneClasse: z.number().min(0).max(20).nullable() }),
  limite: { max: 30, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    const { data, error } = await clientAdmin().from("ds")
      .update({ note: Math.round(e.note * 10) / 10, moyenne_classe: e.moyenneClasse === null ? null : Math.round(e.moyenneClasse * 10) / 10 })
      .eq("id", e.id).eq("user_id", session!.userId).select("id");
    if (error || !data?.length) throw new Refus("introuvable");
    revalidatePath("/app", "layout");
    return { note: true };
  },
});

export const supprimerDs = action({
  nom: "ds.supprimer",
  acces: "eleve",
  entree: z.object({ id: s.uuid }),
  limite: { max: 20, secondes: 3600 },
  async executer(e, session) {
    await profilActif();
    // la préparation offerte reste consommée : supprimer un DS ne la rend pas
    await clientAdmin().from("ds").delete().eq("id", e.id).eq("user_id", session!.userId);
    revalidatePath("/app", "layout");
    redirect("/app/ds");
  },
});
