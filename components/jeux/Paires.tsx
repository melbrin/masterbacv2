"use client";

// Paires : des cartes face cachée, une notion et sa relation à retrouver ensemble.

import { useState } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { pluriel } from "@/lib/commun/format";
import { aUneFormule, type LigneEssentiel } from "@/lib/commun/jeux";
import CadreJeu, { Annonce, BandeauJeu, brasse, Compteur, lignesDePartie, MINIMUM, PAS_ASSEZ, sansDoublon, TempsJeu, tempsDit, useChrono, useDelai, usePartie, type PropsLignes } from "./CadreJeu";

interface Carte { cle: string; ligne: string; html: string }

const PAIRES = 6;
/** Le temps pendant lequel deux cartes qui ne vont pas ensemble restent visibles, en millisecondes. */
const ATTENTE = 900;

/** Les lignes du jeu : celles dont la relation porte une formule s'il y en a assez pour jouer, sinon toutes. */
function lignesDuJeu(lignes: readonly LigneEssentiel[]): LigneEssentiel[] {
  const formules = lignes.filter((l) => aUneFormule(l.relation));
  return sansDoublon(formules).length >= MINIMUM ? formules : [...lignes];
}

/** Deux cartes par ligne tirée, sa notion et sa relation, dans un ordre mélangé. */
function distribue(lignes: readonly LigneEssentiel[], graine: number): Carte[] {
  const cartes = lignesDePartie(lignes, graine).slice(0, PAIRES).flatMap((l): Carte[] => [
    { cle: `${l.id}-notion`, ligne: l.id, html: l.notion },
    { cle: `${l.id}-relation`, ligne: l.id, html: l.relation },
  ]);
  return brasse(cartes, graine + 1);
}

function Plateau({ lignes }: { lignes: LigneEssentiel[] }) {
  const partie = usePartie();
  // les cartes sont tirées une fois, quand le plateau apparaît : elles ne bougent plus si la page se recharge derrière
  const [cartes] = useState(() => distribue(lignes, partie.graine));
  /** les cartes retournées qui ne forment pas encore une paire : deux au plus */
  const [visibles, setVisibles] = useState<number[]>([]);
  /** les lignes dont la paire est trouvée */
  const [trouvees, setTrouvees] = useState<string[]>([]);
  const [coups, setCoups] = useState(0);
  const [annonce, setAnnonce] = useState<{ verdict: "bon" | "faux"; titre: string } | null>(null);
  /** le temps relevé à la dernière paire : la partie est gagnée */
  const [duree, setDuree] = useState<number | null>(null);
  const lis = useChrono();
  const paires = cartes.length / 2;

  // deux cartes qui ne vont pas ensemble se retournent après un court moment
  useDelai(visibles.length === 2 ? coups : null, ATTENTE, () => setVisibles([]));
  // la dernière paire reste un instant à l'écran, puis la partie se termine
  useDelai(duree, ATTENTE, () => partie.termine(
    Math.max(10, 100 - 6 * (coups - paires)), duree ?? 0,
    `${pluriel(paires, "paire trouvée", "paires trouvées")} en ${pluriel(coups, "coup", "coups")} et ${tempsDit(duree ?? 0)}.`,
  ));

  const retourne = (i: number) => {
    const carte = cartes[i];
    if (duree !== null || visibles.length === 2 || visibles.includes(i) || trouvees.includes(carte.ligne)) return;
    if (visibles.length === 0) { setVisibles([i]); setAnnonce(null); return; }
    setCoups(coups + 1);
    if (cartes[visibles[0]].ligne !== carte.ligne) {
      setVisibles([visibles[0], i]);
      setAnnonce({ verdict: "faux", titre: "Ce n'est pas une paire" });
      return;
    }
    const faites = [...trouvees, carte.ligne];
    setTrouvees(faites);
    setVisibles([]);
    setAnnonce({ verdict: "bon", titre: `Paire trouvée\u00a0: ${faites.length} sur ${paires}` });
    if (faites.length === paires) setDuree(lis());
  };

  return (
    <>
      <BandeauJeu>
        <Compteur nom="Coups" valeur={coups} />
        <TempsJeu lis={lis} arret={duree} />
      </BandeauJeu>
      <div className={`jeu-paires${cartes.length > 10 ? " jeu-paires-serrees" : ""}`} role="group" aria-label="Cartes à retourner">
        {cartes.map((carte, i) => {
          const trouvee = trouvees.includes(carte.ligne);
          const visible = trouvee || visibles.includes(i);
          const ratee = visibles.length === 2 && visibles.includes(i);
          return (
            <button key={carte.cle} type="button" aria-disabled={visible} aria-label={visible ? undefined : `Carte ${i + 1}, face cachée`}
              className={`jeu-paire${visible ? " jeu-retournee" : ""}${trouvee ? " jeu-trouvee" : ""}${ratee ? " jeu-ratee" : ""}`}
              onClick={() => retourne(i)}>
              <span className="jeu-paire-int">
                <span className="jeu-paire-dos" aria-hidden="true">?</span>
                <span className="jeu-paire-face" aria-hidden={!visible}>
                  <span className="jeu-sr">Carte {i + 1}&nbsp;: </span>
                  <ContenuHtml html={carte.html} />
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <Annonce verdict={annonce?.verdict ?? null} titre={annonce?.titre ?? ""} />
    </>
  );
}

/**
 * Paires. Jusqu'à six lignes, deux cartes par ligne ; il faut au moins quatre lignes.
 * Score : max(10, 100 - 6 × (coups - nombre de paires)).
 */
export default function Paires({ lignes, graine, fin, retour }: PropsLignes) {
  const jouables = lignesDuJeu(lignes);
  return (
    <CadreJeu graine={graine} fin={fin} retour={retour} manque={sansDoublon(jouables).length < MINIMUM ? PAS_ASSEZ : null}>
      <Plateau lignes={jouables} />
    </CadreJeu>
  );
}
