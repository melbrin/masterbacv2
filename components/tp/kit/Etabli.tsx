"use client";

// Le kit des paillasses : l'établi. C'est l'écran d'une manipulation : la paillasse prend tout l'écran, comme une vraie
// paillasse prend toute l'attention. En haut, son nom, le protocole, les sons. Au milieu, la scène. En bas, ce qui vient
// de se passer et l'appel au professeur. Chaque paillasse se monte dans un établi.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icone from "@/components/appli/Icone";
import { lisNombre } from "@/lib/commun/format";
import { IconeMain, useGuide, useTemoinDuGuide, type Indication } from "./guide";
import { regleSons, son, sonsEnMarche } from "./son";

export interface PropsEtabli {
  /** le nom de la paillasse, en haut de l'écran : « Titrage » */
  titre: string;
  /** les gestes à faire, donnés par le professeur après l'appel */
  protocole: string[];
  /** ce qui vient de se passer, en une phrase ; annoncé aux lecteurs d'écran */
  message: string;
  /** vrai pendant que le serveur regarde la manipulation */
  attente: boolean;
  /** l'élève appelle le professeur : la paillasse envoie alors ses gestes */
  fini: () => void;
  /** remet toute la paillasse dans son état de départ ; sans lui, pas de bouton pour recommencer */
  recommence?: () => void;
  /** des touches en plus, sous la scène : « Noter le volume ». Deux au plus : elles tiennent sur une ligne avec « J'ai fini ». */
  outils?: ReactNode;
  /** vrai quand les outils sont une saisie (Releve) : elle prend toute la largeur, et « J'ai fini » attend */
  saisie?: boolean;
  /**
   * Le guide : ce qu'il faut faire maintenant, calculé par la paillasse quand le guide est en marche (`useGuide`),
   * sinon null. Une paillasse qui n'a pas de guide ne passe rien : l'établi ne montre alors pas le bouton « Guide ».
   */
  indication?: Indication | null;
  /** la scène de la paillasse */
  children: ReactNode;
}

/**
 * L'écran d'une manipulation. Fermé, il montre une carte et le bouton « Ouvrir la paillasse ». Ouvert, il prend tout
 * l'écran ; sur un écran large, le protocole reste affiché à côté de la scène.
 */
export function Etabli({ titre, protocole, message, attente, fini, recommence, outils, saisie = false, indication, children }: PropsEtabli) {
  const [ouvert, setOuvert] = useState(false);
  const [aide, setAide] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [sons, setSons] = useState(sonsEnMarche);
  /** vrai dès que l'élève a touché à la paillasse */
  const [commence, setCommence] = useState(false);
  /** vrai dès que le guide a servi : la manipulation est aidée */
  const [servi, setServi] = useState(false);
  /** ce que l'établi répond quand l'élève met le guide en marche ou le coupe ; le geste suivant l'efface */
  const [avis, setAvis] = useState("");
  /** vrai quand l'élève a demandé le guide en cours de route et doit encore confirmer */
  const [demande, setDemande] = useState(false);
  const guide = useGuide();
  const temoin = useTemoinDuGuide();
  const tete = useRef<HTMLHeadingElement>(null);
  const liste = useRef<HTMLOListElement>(null);
  const idProtocole = useId();
  const avecGuide = indication !== undefined;
  const etape = indication?.etape;

  // avec le guide, l'étape en cours du protocole reste sous les yeux, même quand le protocole est long
  useEffect(() => {
    if (etape === undefined) return;
    liste.current?.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest" });
  }, [etape, ouvert]);

  // la page derrière ne défile pas pendant la manipulation
  useEffect(() => {
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tete.current?.focus();
    return () => { document.body.style.overflow = avant; };
  }, [ouvert]);

  const marque = () => { setServi(true); temoin?.marque(); };
  /** Un geste de l'élève, dans la scène ou sous la scène. Fait avec le guide, il rend la manipulation aidée. */
  const geste = () => {
    if (!commence) setCommence(true);
    if (avis) setAvis("");
    if (demande) setDemande(false);
    if (avecGuide && guide.actif && !servi) marque();
  };
  const bascule = () => {
    const suite = !guide.actif;
    // demander le guide en cours de route, c'est demander de l'aide : l'élève est prévenu avant, et confirme
    if (suite && commence && !servi && !demande) {
      setDemande(true);
      setAvis("Le guide te montre chaque geste, mais « Réaliser » vaudra alors B au mieux. Touche encore « Guide » pour le mettre en marche.");
      return;
    }
    setDemande(false);
    guide.regle(suite);
    if (suite && commence && !servi) marque();
    setAvis(suite ? "Guide en marche : une main te montre chaque geste. Avec lui, « Réaliser » vaut B au mieux."
      : servi ? "Guide coupé. Il a déjà servi : pour viser le A, recommence la manipulation sans lui." : "Guide coupé : tu manipules seul, comme à l'épreuve.");
  };
  const toutRecommence = () => {
    setAide(false);
    setCommence(false);
    setServi(false);
    setAvis("");
    setDemande(false);
    temoin?.efface();
    recommence?.();
  };

  if (!ouvert) {
    return (
      <div className="carte pl-porte">
        {commence
          ? <p><b>Ta manipulation t&apos;attend.</b> Tu la reprends là où tu l&apos;as laissée.</p>
          : <p><b>Ta paillasse est prête.</b> Tu y manipules avec le doigt ou la souris : tu prends, tu verses, tu tournes, tu lis.</p>}
        {avecGuide && (
          <button type="button" role="switch" aria-checked={guide.actif} className="pl-interrupteur" onClick={bascule}>
            <span className="pl-interrupteur-rail" aria-hidden="true"><span /></span>
            <span className="pl-interrupteur-texte">
              <b>{guide.actif ? "Guide en marche" : "Guide coupé"}</b>
              <span>{guide.actif ? "Une main te montre chaque geste. Avec le guide, « Réaliser » vaut B au mieux."
                : servi ? "Il a déjà servi pendant cette manipulation : « Réaliser » vaut B au mieux. Pour viser le A, recommence-la sans lui."
                : "Tu manipules seul, comme à l'épreuve : le niveau A est possible."}</span>
            </span>
          </button>
        )}
        <button type="button" className="btn btn-cuivre" onClick={() => { setOuvert(true); setAvis(""); son("pose"); }}>{commence ? "Reprendre la manipulation" : "Ouvrir la paillasse"}</button>
      </div>
    );
  }
  // l'établi se monte tout en haut de la page : rien de ce qui l'entoure ne peut le rogner ni le décaler
  return createPortal(
    <div className="pl-etabli" role="dialog" aria-modal="true" aria-label={`Paillasse : ${titre}`}>
      <header className="pl-barre">
        <h2 className="pl-titre" tabIndex={-1} ref={tete}>{titre}</h2>
        {avecGuide && <button type="button" className="pl-bouton pl-bouton-guide" aria-pressed={guide.actif} onClick={bascule}><IconeMain /><span>Guide</span></button>}
        <button type="button" className="pl-bouton pl-bouton-protocole" aria-expanded={aide} aria-controls={idProtocole} onClick={() => setAide((a) => !a)}><Icone nom="papier" /><span>Protocole</span></button>
        <button type="button" className="pl-bouton" aria-pressed={sons} aria-label="Sons" onClick={() => { regleSons(!sons); setSons(!sons); if (!sons) son("bip"); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" />{sons ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
          </svg>
        </button>
        <button type="button" className="pl-bouton pl-bouton-quitter" aria-label="Quitter la paillasse" onClick={() => { setOuvert(false); setConfirme(false); }}><Icone nom="croix" /><span>Quitter</span></button>
      </header>
      <div className="pl-plan" onPointerDownCapture={geste} onKeyDownCapture={geste}>{children}</div>
      <aside id={idProtocole} className={`pl-cote${aide ? " est-ouvert" : ""}`} aria-label="Le protocole">
        <h3>Le protocole</h3>
        <ol ref={liste}>{protocole.map((ligne, i) => <li key={ligne} aria-current={etape === i ? "step" : undefined}>{ligne}</li>)}</ol>
        <div className="pl-cote-actions">
          {recommence && <button type="button" className="pl-bouton" onClick={toutRecommence}>Tout recommencer</button>}
          <button type="button" className="pl-bouton pl-cote-fermer" onClick={() => setAide(false)}>Fermer</button>
        </div>
      </aside>
      <footer className="pl-pied" onPointerDownCapture={geste} onKeyDownCapture={geste}>
        {indication && <p className="pl-guide" aria-live="polite" data-guide={indication.cle}><IconeMain /><span>{indication.texte}</span></p>}
        <p className={`pl-message${indication ? " pl-message-second" : ""}`} role="status">{avis || message}</p>
        {saisie && outils}
        {saisie ? null : confirme ? (
          <div className="pl-confirme">
            <span>Tu appelles le professeur ? Il regarde ta manipulation telle qu&apos;elle est.{servi ? " Tu as manipulé avec le guide : « Réaliser » vaut B au mieux." : ""}</span>
            <button type="button" className={`btn btn-cuivre${indication?.appel ? " pl-vise" : ""}`} disabled={attente} onClick={fini}>{attente ? "Le professeur regarde" : "Oui, j'ai fini"}</button>
            <button type="button" className="btn btn-ligne" disabled={attente} onClick={() => setConfirme(false)}>Pas encore</button>
          </div>
        ) : (
          <div className="pl-actions">
            {outils}
            <button type="button" className={`btn btn-cuivre${indication?.appel ? " pl-vise" : ""}`} onClick={() => setConfirme(true)}>J&apos;ai fini</button>
          </div>
        )}
      </footer>
    </div>,
    document.body,
  );
}

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0"];

/**
 * La saisie d'une lecture : l'élève écrit ce qu'il lit sur l'appareil. Elle a son propre pavé de chiffres : le clavier
 * du téléphone ne vient pas cacher la scène. Sur un ordinateur, le clavier marche aussi.
 * `valide` reçoit le nombre lu ; `annule` ferme la saisie sans rien noter. `exemple` sert au message d'erreur ;
 * `signe` ajoute la touche « plus ou moins », pour une valeur qui peut être négative.
 */
export function Releve({ nom, unite, valide, annule, exemple = "9,85", signe = false }: { nom: string; unite: string; valide: (valeur: number) => void; annule: () => void; exemple?: string; signe?: boolean }) {
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const id = useId();
  const envoie = () => {
    const moins = signe && /^[-−]/.test(texte);
    const valeur = lisNombre(texte.replace(/^[-−]/, ""));
    if (valeur === null) { setErreur(`Écris un nombre, par exemple ${exemple}.`); return; }
    valide(moins ? -valeur : valeur);
  };
  const tape = (touche: string) => { setErreur(""); setTexte((t) => (t.length >= 8 || (touche === "," && t.includes(",")) ? t : t + touche)); };
  /** la touche « plus ou moins » met ou retire le signe moins devant le nombre */
  const change = () => { setErreur(""); setTexte((t) => (/^[-−]/.test(t) ? t.slice(1) : `-${t}`)); };
  return (
    <form className="pl-releve" onSubmit={(e) => { e.preventDefault(); envoie(); }} noValidate>
      <label htmlFor={id}>{nom}</label>
      <div className="pl-releve-champ">
        {/* pas de valeur d'exemple dans le champ : elle se lirait comme une réponse soufflée */}
        <input id={id} type="text" inputMode="none" autoComplete="off" autoFocus value={texte} aria-invalid={erreur ? true : undefined}
          onChange={(e) => { setErreur(""); setTexte(e.target.value.replace(/[^0-9,.\-]/g, "").slice(0, 8)); }} />
        <span>{unite}</span>
      </div>
      {erreur && <p role="alert" className="pl-releve-erreur">{erreur}</p>}
      <div className="pl-pave" role="group" aria-label="Pavé de chiffres">
        {TOUCHES.map((t) => <button key={t} type="button" onClick={() => tape(t)}>{t}</button>)}
        {signe && <button type="button" aria-label="Changer le signe" onClick={change}>±</button>}
        <button type="button" aria-label="Effacer le dernier chiffre" onClick={() => { setErreur(""); setTexte((t) => t.slice(0, -1)); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M9 5h11v14H9l-6-7z" /><path d="m12 9.5 5 5M17 9.5l-5 5" /></svg>
        </button>
      </div>
      <div className="pl-actions">
        <button type="button" className="btn btn-ligne" onClick={annule}>Annuler</button>
        <button type="submit" className="btn btn-cuivre">Noter</button>
      </div>
    </form>
  );
}
