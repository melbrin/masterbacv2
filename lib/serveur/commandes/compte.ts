"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import * as s from "@/lib/commun/schemas";
import { action, Refus } from "@/lib/serveur/fabriques";
import { clientAdmin, clientUtilisateur } from "@/lib/serveur/supabase/clients";

// Les limites de départ (docs/03-securite.md, section 4.1). Supabase applique en plus les siennes.
export const demanderCode = action({
  nom: "compte.demanderCode",
  acces: "public",
  entree: z.object({ adresse: s.adresse }),
  limite: { max: 10, secondes: 3600 },
  async executer({ adresse }) {
    const { data: sousLaLimite } = await clientAdmin().rpc("limite_consomme", { p_cle: `code:${adresse}`, p_max: 5, p_secondes: 3600 });
    if (sousLaLimite) {
      const base = await clientUtilisateur();
      // le résultat n'est pas renvoyé : l'écran dit la même chose que l'adresse ait un compte ou non
      await base.auth.signInWithOtp({ email: adresse, options: { shouldCreateUser: true } });
    }
    return { envoye: true };
  },
});

export const verifierCode = action({
  nom: "compte.verifierCode",
  acces: "public",
  entree: z.object({ adresse: s.adresse, code: s.code }),
  limite: { max: 10, secondes: 600 },
  async executer({ adresse, code }) {
    const { data: sousLaLimite } = await clientAdmin().rpc("limite_consomme", { p_cle: `essai:${adresse}`, p_max: 5, p_secondes: 600 });
    if (!sousLaLimite) throw new Refus("trop_de_demandes", "Trop d'essais. Demande un nouveau code dans dix minutes.");
    const base = await clientUtilisateur();
    const { data, error } = await base.auth.verifyOtp({ email: adresse, token: code, type: "email" });
    if (error || !data.user) throw new Refus("invalide", "Ce code n'est pas le bon, ou il a expiré. Vérifie-le ou demande-en un nouveau.");
    const admin = clientAdmin();
    // les accès préparés pour cette adresse dans l'administration s'attachent au compte
    const { error: refus } = await admin.rpc("droits_reclame", { p_user: data.user.id });
    if (refus) throw new Error("droits_reclame a échoué");
    const { data: profil } = await admin.from("profils").select("user_id").eq("user_id", data.user.id).maybeSingle();
    return { suite: profil ? "/app" : "/compte/profil" };
  },
});

export const creerProfil = action({
  nom: "compte.creerProfil",
  acces: "compte",
  entree: z.object({ prenom: s.prenom, classe: z.enum(["terminale", "premiere"]), noteVisee: s.noteVisee, quinzeAnsOuPlus: z.boolean() }),
  limite: { max: 10, secondes: 3600 },
  async executer(e, session) {
    const { error } = await clientAdmin().from("profils").upsert(
      {
        user_id: session!.userId, prenom: e.prenom, classe: e.classe, note_visee: e.noteVisee, quinze_ans_ou_plus: e.quinzeAnsOuPlus,
        // avant 15 ans, le compte reste limité tant qu'un parent n'a pas donné son accord
        etat: e.quinzeAnsOuPlus ? "actif" : "limite",
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
    if (error) throw new Refus("invalide");
    // à la première connexion, l'élève passe son test de calibrage : il donne son point de départ et son parcours
    return { suite: e.quinzeAnsOuPlus ? "/app/calibrage?bienvenue=1" : "/app" };
  },
});

export const seDeconnecter = action({
  nom: "compte.seDeconnecter",
  acces: "compte",
  entree: z.object({ partout: z.boolean().default(false) }),
  async executer({ partout }) {
    const base = await clientUtilisateur();
    // la session est révoquée sur le serveur, pas seulement oubliée par le navigateur
    await base.auth.signOut({ scope: partout ? "global" : "local" });
    redirect("/compte/connexion");
  },
});
