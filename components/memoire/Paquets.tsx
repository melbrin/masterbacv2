"use client";

// Par paquets : un nombre long à retenir. Il s'affiche d'abord d'un bloc, puis découpé en paquets de deux ou trois
// chiffres, un paquet après l'autre. L'élève le retape. La méthode : découper en paquets aide à retenir.

import { useState } from "react";
import { prendFocus, useDelai } from "@/components/jeux/CadreJeu";
import { pluriel } from "@/lib/commun/format";
import type { PropsMemoire } from "@/lib/commun/memoire";
import { enPaquets, NIVEAUX_PAQUETS, nombreLong, taillesPaquets } from "@/lib/commun/memoire/methodes";
import { bilanNiveaux } from "@/lib/commun/memoire/regles";
import { memeSuite } from "@/lib/commun/memoire/tirage";
import { BandeauManches, CadreMemoire, Pave, Saisie, useManches, Verdict, type Manches } from "./Commun";

/** Les durées de la mémorisation, en millisecondes : l'attente, le nombre d'un bloc, le blanc, puis chaque paquet. */
const ATTENTE = 600;
const BLOC = 2400;
const BLANC = 350;
const PAQUET = 1350;

function Manche({ m, longueur }: { m: Manches; longueur: number }) {
  const chiffres = nombreLong(m.graine, longueur);
  const tailles = taillesPaquets(longueur);
  const paquets = enPaquets(chiffres, tailles);
  const [saisie, setSaisie] = useState<number[]>([]);
  // l'étape : 0 l'attente ; 1 le nombre d'un bloc ; 2 un blanc ; 3 + k le paquet k, qui rejoint les précédents
  const [etape, setEtape] = useState(0);
  useDelai(m.phase === "memorise" ? etape : null, etape === 0 ? ATTENTE : etape === 1 ? BLOC : etape === 2 ? BLANC : PAQUET, () => {
    if (etape >= 2 + paquets.length) m.rappelle();
    else setEtape(etape + 1);
  });
  /** le rang du dernier paquet montré */
  const dernier = etape - 3;
  return (
    <>
      <div className="carte mem-scene" data-phase={m.phase} tabIndex={-1} ref={m.rang > 0 ? prendFocus : undefined}>
        {m.phase === "memorise" && etape <= 2 && (
          <>
            <p className="jeu-etiquette">D&apos;un bloc</p>
            <div className="mem-vedette mem-vedette-nombre chiffres" aria-live="polite" aria-atomic="true">{etape === 1 && <span className="mem-pop">{chiffres.join("")}</span>}</div>
            <p className="mem-aide">Difficile à retenir tel quel.</p>
          </>
        )}
        {m.phase === "memorise" && etape > 2 && (
          <>
            <p className="jeu-etiquette">Par paquets</p>
            <div className="mem-paquets chiffres" aria-live="polite">
              {paquets.map((paquet, k) => (
                <span key={k} className={`mem-paquet-lu${k > dernier ? " mem-cachee" : k === dernier ? " mem-paquet-ici mem-pop" : ""}`} aria-hidden={k > dernier || undefined}>{paquet.join("")}</span>
              ))}
            </div>
            <p className="mem-aide">Lis chaque paquet comme un seul nombre.</p>
          </>
        )}
        {m.phase === "rappel" && (
          <>
            <p className="jeu-etiquette">À toi</p>
            <Saisie nom="Ta réponse" total={longueur} valeur={saisie} paquets={tailles} />
            <p className="mem-aide">Retape le nombre, paquet par paquet.</p>
          </>
        )}
        {m.phase === "verdict" && (
          <>
            <p className="jeu-etiquette">Le nombre</p>
            <Saisie nom="Le nombre" total={longueur} valeur={chiffres} paquets={tailles} juste />
            {!m.juste && (
              <>
                <p className="jeu-etiquette">Ta réponse</p>
                <Saisie nom="Ta réponse" total={longueur} valeur={saisie} paquets={tailles} attendu={chiffres} />
              </>
            )}
          </>
        )}
      </div>
      <Verdict m={m} />
      <Pave actif={m.phase === "rappel"} vide={saisie.length === 0} plein={saisie.length >= longueur} pret={saisie.length >= longueur}
        tape={(chiffre) => setSaisie([...saisie, Number(chiffre)])} efface={() => setSaisie(saisie.slice(0, -1))}
        valide={() => m.juge(memeSuite(saisie, chiffres))} />
    </>
  );
}

function Plateau() {
  const m = useManches(NIVEAUX_PAQUETS.length, (reussis) => bilanNiveaux(NIVEAUX_PAQUETS, reussis,
    (n) => `Tu as retenu un nombre de ${n} chiffres, paquet par paquet.`, "Aucun nombre retenu en entier cette fois."));
  const longueur = NIVEAUX_PAQUETS[m.niveau];
  return (
    <>
      <BandeauManches m={m} enjeu={pluriel(longueur, "chiffre", "chiffres")} />
      <Manche key={m.rang} m={m} longueur={longueur} />
    </>
  );
}

/**
 * Par paquets. Un nombre de 8 à 14 chiffres, montré d'un bloc, puis en paquets de trois et de deux chiffres.
 * La partie s'arrête à la deuxième erreur. Score : la part des sept longueurs réussies, sur 100.
 */
export default function Paquets(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="paquets" niveaux="De 8 à 14 chiffres"
      consigne={["La méthode\u00a0: découper un nombre long en petits paquets aide à le retenir.", "Le nombre s'affiche d'un bloc, puis par paquets\u00a0: retape-le."]}>
      <Plateau />
    </CadreMemoire>
  );
}
