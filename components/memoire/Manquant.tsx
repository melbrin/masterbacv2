"use client";

// L'objet manquant : des pictogrammes à regarder quelques secondes. Ils reviennent mélangés, un en moins ;
// l'élève dit lequel manque, parmi quatre.

import { useState } from "react";
import { prendFocus } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { NIVEAUX_MANQUANT, objetManquant } from "@/lib/commun/memoire/images";
import { nomPicto } from "@/lib/commun/memoire/pictos";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { BandeauManches, CadreMemoire, Choix, PictoNomme, Planche, Sablier, useExposition, useManches, Verdict, type Manches } from "./Commun";

/** Le temps pour regarder, en millisecondes. */
const regard = (nombre: number) => 1200 + 700 * nombre;
/** L'écran vide entre les deux planches, en millisecondes. */
const BLANC = 500;

function Manche({ m, nombre }: { m: Manches; nombre: number }) {
  const jeu = objetManquant(m.graine, nombre);
  const [choisie, setChoisie] = useState<string | undefined>(undefined);
  const etape = useExposition(m.phase === "memorise", regard(nombre), m.rappelle, BLANC);
  const repond = (cle: string) => {
    if (m.phase !== "rappel") return;
    setChoisie(cle);
    m.juge(cle === jeu.manquant);
  };
  return (
    <>
      <div className="carte mem-scene mem-scene-planche" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {etape === "montre" && m.phase === "memorise" && <Sablier ms={regard(nombre)} />}
        <p className="jeu-etiquette" aria-live="polite">{m.phase === "memorise" ? "Retiens ces objets" : "Lequel manque\u00a0?"}</p>
        {m.phase === "memorise"
          ? <Planche nom="Objets à retenir" pictos={jeu.montres} cachee={etape !== "montre"} />
          : <Planche nom="Les objets qui restent" pictos={jeu.restants} />}
      </div>
      <Verdict m={m}>{!m.juste && <span>Il manquait {nomPicto(jeu.manquant)}.</span>}</Verdict>
      {m.phase !== "memorise" && (
        <Choix nom="Objets proposés" options={jeu.choix.map((id) => ({ cle: id, contenu: <PictoNomme id={id} /> }))}
          bonne={jeu.manquant} choisie={choisie} repond={repond} />
      )}
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_MANQUANT.length, (reussis) => bilanNiveaux(NIVEAUX_MANQUANT, reussis,
    (n) => `Tu as trouvé l'objet manquant parmi ${n}.`, "Aucun objet manquant trouvé cette fois."));
  const nombre = NIVEAUX_MANQUANT[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(nombre, "objet", "objets")} />
      <Manche key={m.rang} m={m} nombre={nombre} />
    </>
  );
}

/**
 * L'objet manquant. De 5 à 10 objets montrés quelques secondes ; ils reviennent mélangés, un en moins.
 * Quatre réponses : l'objet qui manque et trois objets jamais montrés. La partie s'arrête à la deuxième erreur.
 * Score : la part des six nombres d'objets réussis, sur 100.
 */
export default function Manquant(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="manquant" niveaux="De 5 à 10 objets"
      consigne={["Des objets s'affichent quelques secondes.", "Ils reviennent mélangés, un en moins\u00a0: trouve lequel manque."]}>
      <Plateau />
    </CadreMemoire>
  );
}
