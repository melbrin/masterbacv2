import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Entete, PillNiveau } from "@/components/appli/Morceaux";
import Labo from "@/components/simulations/Labo";
import { p2 } from "@/lib/commun/format";
import { avancementDesDefis, defiOuvert, relationsDuDefi, simulationsVisibles } from "@/lib/serveur/defis";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Défi du labo" };

// Un défi du labo. La page vérifie que le défi peut être montré et qu'il est ouvert, puis n'envoie au navigateur
// que son énoncé, ses grandeurs et les relations du cours qu'il rappelle. Le jugement de l'essai se fait sur le serveur.
export default async function PageDefi({ params }: { params: Promise<{ simulation: string; rang: string }> }) {
  const { session } = await espaceEleve();
  const { simulation: id, rang: texte } = await params;
  const visible = simulationsVisibles(session.admin).find((x) => x.simulation.id === id);
  const rang = /^[1-9]$/.test(texte) ? Number(texte) - 1 : -1;
  const defi = visible?.defis[rang];
  if (!visible || !defi) notFound();
  const { simulation, defis } = visible;
  const retour = `/app/jeux/labo/${simulation.id}`;
  const avancement = await avancementDesDefis(session.userId);
  if (!defiOuvert(defis, rang, avancement)) redirect(retour);
  const relations = await relationsDuDefi(simulation, defi);
  const suivant = defis[rang + 1];
  return (
    <>
      <Entete fil={<><Link href="/app/jeux">Jeux</Link> › <Link href={retour}>{simulation.nom}</Link></>}
        surtitre={`Défi ${rang + 1} sur ${defis.length}`} titre={defi.titre} />
      <p style={{ margin: "0 0 12px" }}><PillNiveau n={defi.niveau} /></p>
      <Labo key={defi.id} simulation={simulation.id} theme={simulation.theme}
        defi={{ id: defi.id, enonce: defi.enonce, donnees: defi.donnees, champs: defi.champs, fixes: defi.fixes }}
        relations={relations} cours={`/app/fiche/${p2(simulation.fiche)}`}
        depart={avancement.get(defi.id) ?? { essais: 0, etoiles: null }}
        suivant={suivant ? { href: `${retour}/${rang + 2}`, titre: suivant.titre } : null} retour={retour} />
    </>
  );
}
