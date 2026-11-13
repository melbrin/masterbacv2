"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as s from "@/lib/commun/schemas";
import { action, Refus } from "@/lib/serveur/fabriques";
import { clientAdmin, clientUtilisateur } from "@/lib/serveur/supabase/clients";

// ---- double authentification : accessible à un administrateur qui ne l'a pas encore passée ----

export const inscrireFacteur = action({
  nom: "admin.inscrireFacteur",
  acces: "compte",
  entree: z.object({}),
  limite: { max: 10, secondes: 3600 },
  async executer(_e, session) {
    if (!session!.admin) throw new Refus("interdit");
    const base = await clientUtilisateur();
    const { data: facteurs } = await base.auth.mfa.listFactors();
    if (facteurs?.totp.length) return { dejaInscrit: true as const, facteur: facteurs.totp[0].id };
    // un facteur commencé mais jamais vérifié est retiré avant d'en créer un neuf
    for (const f of facteurs?.all.filter((x) => x.status === "unverified") ?? []) await base.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await base.auth.mfa.enroll({ factorType: "totp", friendlyName: `MasterBac ${Date.now()}` });
    if (error || !data) throw new Refus("erreur");
    return { dejaInscrit: false as const, facteur: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  },
});

export const verifierFacteur = action({
  nom: "admin.verifierFacteur",
  acces: "compte",
  entree: z.object({ facteur: s.uuid, code: s.code }),
  limite: { max: 10, secondes: 600 },
  async executer(e, session) {
    if (!session!.admin) throw new Refus("interdit");
    const base = await clientUtilisateur();
    const { error } = await base.auth.mfa.challengeAndVerify({ factorId: e.facteur, code: e.code });
    if (error) throw new Refus("invalide", "Ce code n'est pas le bon. Vérifie l'heure de ton téléphone et recommence.");
    await clientAdmin().from("journal_audit").insert({ acteur: session!.userId, action: "admin.double_authentification" });
    return { suite: "/admin" };
  },
});

// ---- accès (décision 0002) : un droit ne naît que d'une action d'administrateur, journalisée ----

const offre = z.enum(["pass", "mensuel", "pack", "beta", "fiches"]);

export const ouvrirAcces = action({
  nom: "admin.ouvrirAcces",
  acces: "admin",
  entree: z.object({
    adresse: s.adresse,
    offre,
    fin: s.jour.nullable(),
    reference: z.string().trim().max(80).regex(/^[\w #./-]*$/),
    motif: z.string().trim().max(300),
  }),
  limite: { max: 200, secondes: 3600 },
  async executer(e, session) {
    const base = clientAdmin();
    const fin = e.fin ? new Date(`${e.fin}T23:59:59+01:00`).toISOString() : null;
    if (fin && Date.parse(fin) <= Date.now()) throw new Refus("invalide", "La date de fin doit être dans le futur.");
    const { data: compte } = await base.rpc("compte_par_adresse", { p_adresse: e.adresse });
    const cible = (compte as { user_id: string } | null)?.user_id ?? null;
    if (cible) {
      const { error } = await base.from("droits").insert({ user_id: cible, offre: e.offre, fin, origine: "administration", reference: e.reference || null, motif: e.motif || null, cree_par: session!.userId });
      if (error) throw new Refus("erreur");
    } else {
      // pas encore de compte : l'accès attend la première connexion avec cette adresse
      const { error } = await base.from("droits_en_attente").insert({ adresse: e.adresse, offre: e.offre, fin, reference: e.reference || null, motif: e.motif || null, cree_par: session!.userId });
      if (error) throw new Refus("erreur");
    }
    await base.from("journal_audit").insert({ acteur: session!.userId, action: cible ? "droit.ouvert" : "droit.prepare", cible, detail: { offre: e.offre, fin, reference: e.reference } });
    revalidatePath("/admin");
    return { etat: cible ? ("ouvert" as const) : ("en_attente" as const) };
  },
});

export const retirerAcces = action({
  nom: "admin.retirerAcces",
  acces: "admin",
  entree: z.object({ id: s.uuid, enAttente: z.boolean(), motif: z.string().trim().min(3).max(300) }),
  limite: { max: 200, secondes: 3600 },
  async executer(e, session) {
    const base = clientAdmin();
    if (e.enAttente) {
      const { data } = await base.from("droits_en_attente").delete().eq("id", e.id).is("reclame_le", null).select("offre");
      if (!data?.length) throw new Refus("introuvable");
      await base.from("journal_audit").insert({ acteur: session!.userId, action: "droit.attente_annulee", detail: { offre: data[0].offre, motif: e.motif } });
    } else {
      // un droit ne se supprime pas : il est marqué retiré, avec sa date et son motif
      const { data } = await base.from("droits").update({ retire_le: new Date().toISOString(), retire_motif: e.motif }).eq("id", e.id).is("retire_le", null).select("user_id, offre");
      if (!data?.length) throw new Refus("introuvable");
      await base.from("journal_audit").insert({ acteur: session!.userId, action: "droit.retire", cible: data[0].user_id, detail: { offre: data[0].offre, motif: e.motif } });
    }
    revalidatePath("/admin");
    return { retire: true };
  },
});

export const repondreSignalement = action({
  nom: "admin.repondreSignalement",
  acces: "admin",
  entree: z.object({ id: s.uuid, etat: z.enum(["en_cours", "traite", "refuse"]), reponse: z.string().trim().max(1000) }),
  limite: { max: 200, secondes: 3600 },
  async executer(e, session) {
    const base = clientAdmin();
    const { data } = await base.from("signalements").update({ etat: e.etat, reponse: e.reponse || null, traite_le: new Date().toISOString() }).eq("id", e.id).select("user_id");
    if (!data?.length) throw new Refus("introuvable");
    await base.from("journal_audit").insert({ acteur: session!.userId, action: "signalement.traite", cible: data[0].user_id, detail: { etat: e.etat } });
    revalidatePath("/admin");
    return { traite: true };
  },
});
