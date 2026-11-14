"use client";

// Le kit des paillasses : l'établi. C'est l'écran d'une manipulation : la paillasse prend tout l'écran, comme une vraie
// paillasse prend toute l'attention. En haut, son nom, le protocole, les sons. Au milieu, la scène. En bas, ce qui vient
// de se passer et l'appel au professeur. Chaque paillasse se monte dans un établi.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icone from "@/components/appli/Icone";
import { lisNombre } from "@/lib/commun/format";
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
  /** la scène de la paillasse */
  children: ReactNode;
}

/**
 * L'écran d'une manipulation. Fermé, il montre une carte et le bouton « Ouvrir la paillasse ». Ouvert, il prend tout
 * l'écran ; sur un écran large, le protocole reste affiché à côté de la scène.
 */
export function Etabli({ titre, protocole, message, attente, fini, recommence, outils, saisie = false, children }: PropsEtabli) {
  const [ouvert, setOuvert] = useState(false);
  const [aide, setAide] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [sons, setSons] = useState(sonsEnMarche);
  const tete = useRef<HTMLHeadingElement>(null);
  const idProtocole = useId();

  // la page derrière ne défile pas pendant la manipulation
  useEffect(() => {
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    tete.current?.focus();
    return () => { document.body.style.overflow = avant; };
  }, [ouvert]);

  if (!ouvert) {
    return (
      <div className="carte pl-porte">
        <p><b>Ta paillasse est prête.</b> Tu y manipules avec le doigt ou la souris : tu prends, tu verses, tu tournes, tu lis.</p>
        <button type="button" className="btn btn-cuivre" onClick={() => { setOuvert(true); son("pose"); }}>Ouvrir la paillasse</button>
      </div>
    );
  }
  // l'établi se monte tout en haut de la page : rien de ce qui l'entoure ne peut le rogner ni le décaler
  return createPortal(
    <div className="pl-etabli" role="dialog" aria-modal="true" aria-label={`Paillasse : ${titre}`}>
      <header className="pl-barre">
        <h2 className="pl-titre" tabIndex={-1} ref={tete}>{titre}</h2>
        <button type="button" className="pl-bouton pl-bouton-protocole" aria-expanded={aide} aria-controls={idProtocole} onClick={() => setAide((a) => !a)}><Icone nom="papier" /><span>Protocole</span></button>
        <button type="button" className="pl-bouton" aria-pressed={sons} aria-label="Sons" onClick={() => { regleSons(!sons); setSons(!sons); if (!sons) son("bip"); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" />{sons ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
          </svg>
        </button>
        <button type="button" className="pl-bouton" onClick={() => { setOuvert(false); setConfirme(false); }}><Icone nom="croix" /><span>Quitter</span></button>
      </header>
      <div className="pl-plan">{children}</div>
      <aside id={idProtocole} className={`pl-cote${aide ? " est-ouvert" : ""}`} aria-label="Le protocole">
        <h3>Le protocole</h3>
        <ol>{protocole.map((ligne) => <li key={ligne}>{ligne}</li>)}</ol>
        <div className="pl-cote-actions">
          {recommence && <button type="button" className="pl-bouton" onClick={() => { setAide(false); recommence(); }}>Tout recommencer</button>}
          <button type="button" className="pl-bouton pl-cote-fermer" onClick={() => setAide(false)}>Fermer</button>
        </div>
      </aside>
      <footer className="pl-pied">
        <p className="pl-message" role="status">{message}</p>
        {saisie && outils}
        {saisie ? null : confirme ? (
          <div className="pl-confirme">
            <span>Tu appelles le professeur ? Il regarde ta manipulation telle qu&apos;elle est.</span>
            <button type="button" className="btn btn-cuivre" disabled={attente} onClick={fini}>{attente ? "Le professeur regarde" : "Oui, j'ai fini"}</button>
            <button type="button" className="btn btn-ligne" disabled={attente} onClick={() => setConfirme(false)}>Pas encore</button>
          </div>
        ) : (
          <div className="pl-actions">
            {outils}
            <button type="button" className="btn btn-cuivre" onClick={() => setConfirme(true)}>J&apos;ai fini</button>
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
 * `valide` reçoit le nombre lu ; `annule` ferme la saisie sans rien noter.
 */
export function Releve({ nom, unite, valide, annule, exemple = "9,85" }: { nom: string; unite: string; valide: (valeur: number) => void; annule: () => void; exemple?: string }) {
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const id = useId();
  const envoie = () => {
    const valeur = lisNombre(texte);
    if (valeur === null) { setErreur(`Écris un nombre, par exemple ${exemple}.`); return; }
    valide(valeur);
  };
  const tape = (signe: string) => { setErreur(""); setTexte((t) => (t.length >= 8 || (signe === "," && t.includes(",")) ? t : t + signe)); };
  return (
    <form className="pl-releve" onSubmit={(e) => { e.preventDefault(); envoie(); }} noValidate>
      <label htmlFor={id}>{nom}</label>
      <div className="pl-releve-champ">
        <input id={id} type="text" inputMode="none" autoComplete="off" autoFocus value={texte} placeholder={exemple} aria-invalid={erreur ? true : undefined}
          onChange={(e) => { setErreur(""); setTexte(e.target.value.replace(/[^0-9,.\-]/g, "").slice(0, 8)); }} />
        <span>{unite}</span>
      </div>
      {erreur && <p role="alert" className="pl-releve-erreur">{erreur}</p>}
      <div className="pl-pave" role="group" aria-label="Pavé de chiffres">
        {TOUCHES.map((t) => <button key={t} type="button" onClick={() => tape(t)}>{t}</button>)}
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
