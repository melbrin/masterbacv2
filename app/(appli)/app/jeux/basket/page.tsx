import Link from "next/link";
import { Entete } from "@/components/appli/Morceaux";
import Basket from "@/components/simulations/Basket";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "Le basketteur" };

// La simulation tourne dans le navigateur et ne lit aucune donnée de l'élève : la page ne fait que contrôler la session.
export default async function PageBasket() {
  await espaceEleve();
  return (
    <>
      <Entete fil={<Link href="/app/jeux">Jeux</Link>} surtitre="Simulation" titre="Le basketteur"
        sous="Fais sauter le joueur. Puis règle son tir pour marquer un panier." />
      <Basket />
      <div className="actions simu-suite">
        <Link className="btn btn-ligne" href="/app/fiche/01">Revoir le cours : chute libre et mouvement d&apos;un projectile</Link>
      </div>
    </>
  );
}
