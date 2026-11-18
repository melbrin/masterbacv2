import Link from "next/link";
import { notFound } from "next/navigation";
import { Entete } from "@/components/appli/Morceaux";
import Atelier from "@/components/python/Atelier";
import { ENTRAINEMENT } from "@/lib/commun/entrainement";
import { exercicesVisibles } from "@/lib/serveur/python";
import { espaceEleve } from "@/lib/serveur/requetes/eleve";

export const metadata = { title: "L'atelier libre" };

const EXEMPLE = `# L'atelier libre : écris ce que tu veux, puis touche « Lancer ».
# Pour commencer : l'altitude d'une balle lâchée de 10 m,
# toutes les 0,1 s.
import matplotlib.pyplot as plt

g = 9.81                          # pesanteur, en m/s²
t = [0.1 * i for i in range(15)]  # dates, en s
z = [10 - 0.5 * g * ti**2 for ti in t]   # altitudes, en m

print("altitude à 1,4 s :", round(z[-1], 2), "m")

plt.plot(t, z, "o-")
plt.xlabel("t (s)")
plt.ylabel("z (m)")
plt.title("Chute libre sans vitesse initiale")
plt.grid()
plt.show()
`;

// L'atelier libre du hub Python (décision 0016) : un éditeur et Python, sans exercice ni vérification. Il suit le hub :
// fermé par l'interrupteur, ou sans exercice que ce compte peut voir, il n'existe pas.
export default async function AtelierLibre() {
  const { session } = await espaceEleve();
  if (exercicesVisibles(session.admin).length === 0) notFound();
  return (
    <>
      <Entete fil={<><Link href={ENTRAINEMENT.href}>{ENTRAINEMENT.nom}</Link><span aria-hidden="true">/</span><Link href="/app/python">Python</Link></>}
        surtitre="Python" titre="L'atelier libre" sous="Essaie un programme de ton cours ou d'un sujet. Il est gardé sur cet appareil à mesure que tu l'écris." />
      <Atelier cle={`mb-python:${session.userId}:libre`} depart={EXEMPLE} />
    </>
  );
}
