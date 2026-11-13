import Link from "next/link";
import FormulaireDs from "@/components/appli/FormulaireDs";
import { Entete } from "@/components/appli/Morceaux";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Préparer un DS" };

export default async function NouveauDs() {
  const { catalogue, ctx, jour, droits, profil } = await espaceEleve();
  if (!droits.coach && profil.ds_offertes <= 0) {
    return <><Entete fil={<Link href="/app/ds">Mode DS</Link>} titre="Préparer un DS" />
      <p className="carte" style={{ borderColor: "var(--cuivre)" }}>Ta préparation offerte est utilisée. Le Pass ouvre le mode DS sans limite. <Link href="/app/offres">Voir les offres</Link></p></>;
  }
  return (
    <>
      <Entete fil={<Link href="/app/ds">Mode DS</Link>} titre="Préparer un DS" sous="Le format se choisit seul selon le temps qu'il reste." />
      <FormulaireDs aujourdhui={jour} objectif={profil.note_visee as 10 | 14 | 18} offerte={!droits.coach}
        fiches={catalogue.fiches.map((f) => ({ num: f.num, titre: f.titre_court, vu: !!ctx.etat.vuEnClasse[String(f.num)] }))} />
    </>
  );
}
