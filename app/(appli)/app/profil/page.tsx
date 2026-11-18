import Link from "next/link";
import BoutonAction from "@/components/appli/BoutonAction";
import FormulaireReglages from "@/components/appli/FormulaireReglages";
import { Entete } from "@/components/appli/Morceaux";
import { seDeconnecter } from "@/lib/serveur/commandes/compte";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Profil" };
const NOM_OFFRE: Record<string, string> = { gratuit: "Offre gratuite", pass: "Pass Bac 2027", mensuel: "Mensuel", pack: "Pack BAC", beta: "Bêta", fiches: "Fiches achetées sur la boutique" };

export default async function Profil() {
  const { profil, session, droits } = await espaceEleve();
  const ici = async () => { "use server"; return seDeconnecter({ partout: false }); };
  const partout = async () => { "use server"; return seDeconnecter({ partout: true }); };
  return (
    <>
      <Entete titre="Ton profil" sous={session.email} />
      <div className="carte"><div className="tete"><h2>Ton offre</h2><span className="puce">{NOM_OFFRE[droits.offre]}</span></div>
        <p className="discret" style={{ margin: 0 }}>{droits.coach ? "Tu as l'application complète." : droits.tousLesCorriges ? "Tous les corrigés sont ouverts. Le mode DS sans limite et le coach demandent le Pass." : "Tu as le test de niveau, une préparation de DS offerte et l'exercice du jour."} <Link href="/app/offres">Voir les offres</Link></p></div>
      <div className="section-titre"><h2>Tes réglages</h2></div>
      <FormulaireReglages prenom={profil.prenom} noteVisee={profil.note_visee as 10 | 14 | 18} rappels={profil.rappels} />
      <div className="section-titre"><h2>Ta session</h2></div>
      <div className="carte"><div className="actions">
        <BoutonAction className="btn btn-ligne" lancer={ici} oublier>Me déconnecter</BoutonAction>
        <BoutonAction className="btn-texte" lancer={partout} confirmer="Confirmer" oublier>Déconnecter tous mes appareils</BoutonAction>
      </div></div>
    </>
  );
}
