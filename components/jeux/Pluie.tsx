"use client";

// Pluie de formules : une relation tombe, il faut toucher sa notion avant qu'elle n'arrive en bas.

import { useEffect, useReducer, useState, type CSSProperties } from "react";
import ContenuHtml from "@/components/socle/ContenuHtml";
import { aUneFormule, type LigneEssentiel } from "@/lib/commun/jeux";
import CadreJeu, {
  Annonce, BandeauJeu, bilanReponses, brasse, Compteur, ECART, lignesDePartie, MINIMUM, OptionsJeu, optionNotion, PAS_ASSEZ, PAUSE_REPONSE,
  propositions, sansDoublon, useChrono, useDelai, useEnDirect, usePartie, ViesJeu, type OptionJeu, type PropsLignes,
} from "./CadreJeu";

const FORMULES = 10;
const VIES = 3;
/** La durée de la chute, en millisecondes : 8 s pour la première formule, 0,4 s de moins à chacune, jamais moins de 4,5 s. */
const dureeChute = (rang: number) => Math.max(4500, 8000 - 400 * rang);

const avecFormule = (lignes: readonly LigneEssentiel[]) => lignes.filter((l) => aUneFormule(l.relation));

interface Goutte { ligne: LigneEssentiel; options: OptionJeu[] }

/** Les formules de la partie, dans l'ordre où elles tombent, chacune avec trois notions : la sienne et deux autres. */
function prepare(lignes: readonly LigneEssentiel[], graine: number): Goutte[] {
  const formules = lignesDePartie(avecFormule(lignes), graine);
  // les mauvaises réponses se tirent dans toutes les lignes, avec ou sans formule
  const notions = lignesDePartie(lignes, graine + 1);
  const suite: LigneEssentiel[] = [];
  // avec moins de dix formules, la liste repart pour un tour, dans un autre ordre
  for (let tour = 0; formules.length > 0 && suite.length < FORMULES; tour++) {
    const lot = brasse(formules, graine + 31 * (tour + 1));
    // la même formule ne tombe pas deux fois de suite
    if (lot.length > 1 && suite.length > 0 && lot[0].id === suite[suite.length - 1].id) [lot[0], lot[1]] = [lot[1], lot[0]];
    suite.push(...lot);
  }
  return suite.slice(0, FORMULES).map((ligne, i) => {
    // une autre notion qui porte la même relation serait une bonne réponse elle aussi : elle n'est pas proposée
    const autres = notions.filter((l) => l.notion !== ligne.notion && l.relation !== ligne.relation).map(optionNotion);
    return { ligne, options: propositions(optionNotion(ligne), autres, 2, graine + ECART * (i + 1)) };
  });
}

interface Etat {
  rang: number;
  vies: number;
  bonnes: number;
  /** indéfinie pendant la chute ; null si la formule est arrivée en bas ; sinon la clé de la notion choisie */
  choisie: string | null | undefined;
}
type Action = { type: "reponse"; rang: number; cle: string; juste: boolean } | { type: "en-bas"; rang: number } | { type: "suivante" };

// Une formule n'a qu'une issue : la réponse de l'élève ou l'arrivée en bas, la première des deux.
// Le clic et le minuteur peuvent tomber au même instant : c'est ici que le second est ignoré.
function reduit(etat: Etat, action: Action): Etat {
  if (action.type === "suivante") return etat.choisie === undefined ? etat : { ...etat, rang: etat.rang + 1, choisie: undefined };
  if (etat.choisie !== undefined || action.rang !== etat.rang) return etat;
  if (action.type === "en-bas") return { ...etat, vies: etat.vies - 1, choisie: null };
  return action.juste ? { ...etat, bonnes: etat.bonnes + 1, choisie: action.cle } : { ...etat, vies: etat.vies - 1, choisie: action.cle };
}

// Le compte à rebours qui remplace la chute quand l'élève a demandé moins d'animations. Sinon la feuille de style le cache.
function Rebours({ ms, arrete }: { ms: number; arrete: boolean }) {
  const [reste, setReste] = useState(Math.ceil(ms / 1000));
  useEffect(() => {
    if (arrete) return;
    const terme = Date.now() + ms;
    const id = setInterval(() => setReste(Math.max(0, Math.ceil((terme - Date.now()) / 1000))), 200);
    return () => clearInterval(id);
  }, [ms, arrete]);
  return <span className="jeu-rebours chiffres" role="timer" aria-live="off" aria-label="Secondes restantes">{reste}&nbsp;s</span>;
}

function Plateau({ lignes }: { lignes: LigneEssentiel[] }) {
  const partie = usePartie();
  // les formules sont tirées une fois, quand le plateau apparaît
  const [gouttes] = useState(() => prepare(lignes, partie.graine));
  const [etat, agit] = useReducer(reduit, { rang: 0, vies: VIES, bonnes: 0, choisie: undefined });
  const lis = useChrono();
  const enDirect = useEnDirect();
  const goutte = gouttes[etat.rang];
  const repondu = etat.choisie !== undefined;
  // la formule tombe tant qu'il n'y a pas de réponse ; elle attend en haut tant que la page du serveur n'est pas encore vivante
  const enChute = enDirect && !repondu;
  const juste = etat.choisie === goutte.ligne.id;
  const duree = dureeChute(etat.rang);

  // la formule arrive en bas : une vie en moins
  useDelai(enChute ? `chute-${etat.rang}` : null, duree, () => agit({ type: "en-bas", rang: etat.rang }));
  // la bonne réponse reste montrée un instant ; puis la formule suivante tombe, ou la partie se termine
  useDelai(repondu ? `suite-${etat.rang}` : null, PAUSE_REPONSE, () => {
    if (etat.vies > 0 && etat.rang + 1 < gouttes.length) { agit({ type: "suivante" }); return; }
    const bilan = bilanReponses(etat.bonnes, gouttes.length);
    partie.termine(10 * etat.bonnes, lis(), etat.vies > 0 ? bilan : `Plus de vie. ${bilan}`);
  });

  return (
    <>
      <BandeauJeu>
        <Compteur nom="Score" valeur={10 * etat.bonnes} />
        <Compteur nom="Formule" valeur={etat.rang + 1} suite={`sur ${gouttes.length}`} />
        <ViesJeu reste={etat.vies} total={VIES} />
      </BandeauJeu>
      <div className="jeu-pluie" aria-live="polite">
        <div key={`goutte-${etat.rang}`} style={{ "--jeu-duree": `${duree}ms` } as CSSProperties}
          className={`jeu-goutte${enChute ? "" : " jeu-goutte-arretee"}${!repondu ? "" : juste ? " jeu-goutte-juste" : " jeu-goutte-fausse"}`}>
          <ContenuHtml className="jeu-goutte-formule" html={goutte.ligne.relation} />
        </div>
        <Rebours key={`rebours-${etat.rang}`} ms={duree} arrete={!enChute} />
      </div>
      <OptionsJeu nom="Notions proposées" options={goutte.options} bonne={goutte.ligne.id} choisie={etat.choisie}
        repond={(cle) => agit({ type: "reponse", rang: etat.rang, cle, juste: cle === goutte.ligne.id })} />
      <Annonce verdict={!repondu ? null : juste ? "bon" : "faux"} titre={juste ? "Bonne réponse" : etat.choisie === null ? "Trop tard" : "Ce n'est pas ça"}>
        {!juste && <span>La bonne notion&nbsp;: <ContenuHtml html={goutte.ligne.notion} /></span>}
      </Annonce>
    </>
  );
}

/**
 * Pluie de formules. Dix relations tombent, tirées parmi les lignes qui portent une formule ; il en faut au moins quatre.
 * Trois vies ; la partie s'arrête à dix formules ou à zéro vie. Score : 10 × bonnes réponses.
 */
export default function Pluie({ lignes, graine, fin, retour }: PropsLignes) {
  return (
    <CadreJeu graine={graine} fin={fin} retour={retour} manque={sansDoublon(avecFormule(lignes)).length < MINIMUM ? PAS_ASSEZ : null}>
      <Plateau lignes={lignes} />
    </CadreJeu>
  );
}
