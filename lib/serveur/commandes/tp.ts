"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as s from "@/lib/commun/schemas";
import type { Bilan, ReponseEtape, RetourEtape } from "@/lib/commun/tp/types";
import { tp as trouveTp } from "@/lib/serveur/contenu/tp";
import { action, Refus } from "@/lib/serveur/fabriques";
import { nouvelleGraine } from "@/lib/serveur/quiz";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";
import { bilanDuTp, tpVisible, verifie } from "@/lib/serveur/tp";

async function eleveActif() {
  const profil = await profilCourant();
  if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
}

const borne = z.string().regex(/^[a-z0-9+-]{1,12}$/);
const geste = z.discriminatedUnion("g", [
  z.object({ g: z.literal("rincer") }), z.object({ g: z.literal("remplir") }), z.object({ g: z.literal("zero") }), z.object({ g: z.literal("prise") }),
  z.object({ g: z.literal("indicateur") }), z.object({ g: z.literal("sonde") }), z.object({ g: z.literal("agiter") }),
  z.object({ g: z.literal("verser"), v: z.number().min(0).max(5) }), z.object({ g: z.literal("noter"), v: z.number().min(0).max(30).optional() }), z.object({ g: z.literal("recommencer") }),
  z.object({ g: z.literal("relier"), a: borne, b: borne }), z.object({ g: z.literal("retirer"), a: borne, b: borne }), z.object({ g: z.literal("acquerir") }),
  z.object({ g: z.literal("niveau"), h: z.number().min(0).max(50) }), z.object({ g: z.literal("lire"), tau: z.number().min(0).max(10000) }),
]);
const reponse = z.discriminatedUnion("g", [
  z.object({ g: z.literal("lecture") }),
  z.object({ g: z.literal("materiel"), choisis: z.array(z.string().regex(/^[a-z]{2,20}$/)).max(20) }),
  z.object({ g: z.literal("ordre"), ordre: z.array(z.number().int().min(0).max(19)).max(20) }),
  z.object({ g: z.literal("choix"), choix: z.number().int().min(0).max(9) }),
  z.object({ g: z.literal("paillasse"), gestes: z.array(geste).max(1500) }),
  z.object({ g: z.literal("valeur"), valeur: z.number().min(-1e9).max(1e9) }),
]);

// Commence un TP : crée l'essai et y conduit l'élève.
export const demarrerTp = action({
  nom: "tp.demarrer",
  acces: "eleve",
  entree: z.object({ tp: z.string().regex(/^[a-z]{2,20}$/) }),
  limite: { max: 60, secondes: 3600 },
  async executer(e, session) {
    await eleveActif();
    const t = trouveTp(e.tp);
    if (!t || !tpVisible(t, session!.admin)) throw new Refus("introuvable");
    const { data, error } = await clientAdmin().from("tp_essais").insert({ user_id: session!.userId, tp: t.id, graine: nouvelleGraine() }).select("id").single();
    if (error || !data) throw new Refus("erreur");
    redirect(`/app/tp/essai/${data.id}`);
  },
});

// Valide une étape d'un TP. Le serveur vérifie la réponse comme le professeur à un appel : il rend le score et la correction.
// Les étapes se valident dans l'ordre, une seule fois chacune. À la dernière, le serveur calcule le bilan par compétence.
export const repondreTp = action({
  nom: "tp.repondre",
  acces: "eleve",
  entree: z.object({ essai: s.uuid, etape: z.number().int().min(0).max(40), reponse }),
  limite: { max: 600, secondes: 3600 },
  async executer(e, session): Promise<{ retour: RetourEtape; bilan: Bilan | null }> {
    await eleveActif();
    const base = clientAdmin();
    const userId = session!.userId;
    const { data: essai, error } = await base.from("tp_essais").select("tp, graine, etapes, mesures, termine_le").eq("id", e.essai).eq("user_id", userId).maybeSingle();
    if (error) throw new Refus("erreur");
    if (!essai) throw new Refus("introuvable");
    const t = trouveTp(essai.tp);
    if (!t || !tpVisible(t, session!.admin)) throw new Refus("introuvable");
    const retours = essai.etapes as unknown as RetourEtape[];
    if (essai.termine_le || e.etape !== retours.length || e.etape >= t.etapes.length) throw new Refus("invalide", "Cette étape est déjà validée. Recharge la page pour reprendre le TP.");
    const mesures = essai.mesures as Record<string, number>;
    const verdict = verifie(t.etapes[e.etape], e.reponse as ReponseEtape, mesures, essai.graine);
    if (!verdict) throw new Refus("invalide");
    const suite = [...retours, verdict.retour];
    const fini = suite.length === t.etapes.length;
    const bilan = fini ? bilanDuTp(t, suite.map((r) => r.score)) : null;
    const { error: ecriture } = await base.from("tp_essais")
      .update({ etapes: suite as unknown as never, mesures: { ...mesures, ...(verdict.mesures ?? {}) }, niveaux: bilan, termine_le: fini ? new Date().toISOString() : null })
      .eq("id", e.essai).eq("user_id", userId).is("termine_le", null);
    if (ecriture) throw new Refus("erreur");
    if (fini) revalidatePath("/app", "layout");
    return { retour: verdict.retour, bilan };
  },
});
