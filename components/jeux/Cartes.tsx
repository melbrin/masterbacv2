"use client";

// Cartes mémoire : une notion au recto, sa relation et ce qu'il faut retenir au verso. L'élève dit s'il la savait.

import { useEffect, useId, useRef, useState } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { pluriel } from "@/lib/commun/format";
import type { LigneEssentiel } from "@/lib/commun/jeux";
import CadreJeu, { Annonce, BandeauJeu, brasse, Compteur, MINIMUM, PAS_ASSEZ, prendFocus, useChrono, usePartie, type PropsLignes } from "./CadreJeu";

const CARTES = 10;

// Une carte du paquet. Elle est montée à neuf à chaque passage : elle arrive toujours côté notion.
function CarteMemoire({ ligne, chapitre, suite, repond }: {
  ligne: LigneEssentiel;
  /** le numéro de la fiche, donné quand le paquet mêle plusieurs chapitres : deux chapitres peuvent porter la même notion */
  chapitre: number | null;
  /** vrai après la première carte : le bouton « Retourner la carte » prend le focus, pour jouer au clavier */
  suite: boolean;
  repond: (sue: boolean) => void;
}) {
  const [retournee, setRetournee] = useState(false);
  const idNotion = useId();
  const verso = useRef<HTMLDivElement>(null);
  // Une fois la carte retournée, le focus va sur la réponse : un lecteur d'écran la lit, et la touche Entrée ne valide rien par mégarde.
  useEffect(() => {
    if (retournee) verso.current?.focus({ preventScroll: true });
  }, [retournee]);

  return (
    <div className="jeu-memo apparait">
      <div className={`jeu-fiche${retournee ? " jeu-retournee" : ""}`}>
        <div className="jeu-fiche-int">
          <div className="jeu-fiche-face jeu-fiche-recto" aria-hidden={retournee}>
            <span className="jeu-etiquette">{chapitre === null ? "Notion" : `Notion · fiche ${chapitre}`}</span>
            <span className="jeu-fiche-notion" id={idNotion}><ContenuHtml html={ligne.notion} /></span>
          </div>
          <div className="jeu-fiche-face jeu-fiche-verso" aria-hidden={!retournee} tabIndex={-1} ref={verso}>
            <ContenuHtml className="jeu-fiche-rappel" html={ligne.notion} />
            <span className="jeu-etiquette">Relation</span>
            <ContenuHtml bloc className="jeu-formule" html={ligne.relation} />
            <span className="jeu-etiquette">{ligne.nature === "retrouver" ? "Comment la retrouver" : "À retenir"}</span>
            <ContenuHtml bloc className="jeu-fiche-retenir" html={ligne.retenir} />
          </div>
        </div>
      </div>
      {retournee ? (
        <div className="actions jeu-actions">
          <button type="button" className="btn btn-cuivre" onClick={() => repond(true)}>Je la savais</button>
          <button type="button" className="btn btn-ligne" onClick={() => repond(false)}>Pas encore</button>
        </div>
      ) : (
        <div className="actions jeu-actions">
          <button type="button" className="btn btn-cuivre" aria-describedby={idNotion} ref={suite ? prendFocus : undefined} onClick={() => setRetournee(true)}>Retourner la carte</button>
        </div>
      )}
    </div>
  );
}

function Plateau({ lignes }: { lignes: LigneEssentiel[] }) {
  const partie = usePartie();
  // le paquet est tiré une fois, quand le plateau apparaît
  const [depart] = useState(() => {
    const cartes = brasse(lignes, partie.graine).slice(0, CARTES);
    return { cartes, plusieursChapitres: new Set(cartes.map((l) => l.fiche)).size > 1 };
  });
  /** le paquet : la première carte est celle qu'on voit ; une carte « pas encore » repart à la fin */
  const [paquet, setPaquet] = useState(depart.cartes);
  /** les cartes qui ont reçu « Pas encore » au moins une fois : elles ne comptent plus comme sues du premier coup */
  const [revues, setRevues] = useState<string[]>([]);
  const [sues, setSues] = useState(0);
  /** le nombre de réponses données : il sert de clé à la carte affichée */
  const [tour, setTour] = useState(0);
  const [annonce, setAnnonce] = useState<{ verdict: "bon" | "neutre"; titre: string } | null>(null);
  const lis = useChrono();
  const total = depart.cartes.length;

  const repond = (sue: boolean) => {
    if (paquet.length === 0) return;
    const [carte, ...reste] = paquet;
    const premierCoup = !revues.includes(carte.id);
    setTour(tour + 1);
    if (!sue) {
      setPaquet([...reste, carte]);
      if (premierCoup) setRevues([...revues, carte.id]);
      setAnnonce({ verdict: "neutre", titre: "Cette carte reviendra à la fin du paquet" });
      return;
    }
    const bonnes = sues + (premierCoup ? 1 : 0);
    setSues(bonnes);
    setPaquet(reste);
    if (reste.length > 0) {
      setAnnonce({ verdict: "bon", titre: `Carte sue\u00a0: il en reste ${reste.length}` });
      return;
    }
    partie.termine(Math.round((100 * bonnes) / total), lis(), `${pluriel(bonnes, "carte sue", "cartes sues")} du premier coup sur ${total}.`);
  };

  if (paquet.length === 0) return null;
  return (
    <>
      <BandeauJeu>
        <Compteur nom="Cartes restantes" valeur={paquet.length} />
      </BandeauJeu>
      <CarteMemoire key={tour} ligne={paquet[0]} chapitre={depart.plusieursChapitres ? paquet[0].fiche : null} suite={tour > 0} repond={repond} />
      <Annonce verdict={annonce?.verdict ?? null} titre={annonce?.titre ?? ""} />
    </>
  );
}

/**
 * Cartes mémoire. Jusqu'à dix lignes ; il en faut au moins quatre. Une carte « pas encore » revient jusqu'à ce qu'elle soit sue.
 * Score : arrondi de 100 × cartes sues du premier coup / nombre de cartes.
 */
export default function Cartes({ lignes, graine, fin, retour }: PropsLignes) {
  return (
    <CadreJeu graine={graine} fin={fin} retour={retour} manque={lignes.length < MINIMUM ? PAS_ASSEZ : null}>
      <Plateau lignes={lignes} />
    </CadreJeu>
  );
}
