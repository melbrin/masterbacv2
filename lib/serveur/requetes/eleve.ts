import "server-only";
import { redirect } from "next/navigation";
import { droitsDe } from "@/lib/serveur/acces";
import { travailDe } from "@/lib/serveur/etat";
import { requete } from "@/lib/serveur/fabriques";
import { profilCourant } from "@/lib/serveur/requetes/profil";

/** Tout ce qu'une page de l'élève lit : session vérifiée, profil, état de travail, droits. */
export const espaceEleve = requete({ nom: "eleve.espace", acces: "eleve" }, async (session) => {
  const profil = await profilCourant();
  if (!profil) redirect("/compte/profil");
  const [travail, droits] = await Promise.all([travailDe(session.userId, profil.note_visee), droitsDe(session.userId)]);
  return { session, profil, droits, ...travail };
});
