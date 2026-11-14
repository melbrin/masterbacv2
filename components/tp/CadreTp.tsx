"use client";

// Le cadre d'un TP virtuel (décision 0012) : il déroule les étapes, envoie chaque réponse au serveur, montre la correction
// que le serveur renvoie, puis le bilan par compétence. Les réponses ne sont pas dans le navigateur.

import Link from "next/link";
import { useRef, useState } from "react";
import BoutonAction from "@/components/appli/BoutonAction";
import Confettis from "@/components/appli/Confettis";
import { Etapes } from "@/components/appli/Morceaux";
import { COMPETENCES, type Bilan, type EtapePublique, type ReponseEtape, type RetourEtape } from "@/lib/commun/tp/types";
import { repondreTp } from "@/lib/serveur/commandes/tp";
import { AvecIndices, Choix, Correction, Documents, Lecture, Materiel, Ordre, Valeur } from "./Etapes";
import PaillasseTitrage from "./PaillasseTitrage";

type Retour = { ok: true; valeur: unknown } | { ok: false; message: string };
interface Props {
  essai: string;
  etapes: EtapePublique[];
  /** ce que le serveur a déjà répondu : l'élève reprend à l'étape suivante */
  retours: RetourEtape[];
  bilan: Bilan | null;
  retour: string;
  refaire: () => Promise<Retour>;
}

const CONSEILS: Record<string, string> = {
  APP: "Relis la situation et ses documents avant de répondre : ce qu'on cherche y est écrit.",
  ANA: "Avant de manipuler, demande-toi à quoi sert chaque objet et dans quel ordre viennent les gestes.",
  REA: "Refais la manipulation en soignant chaque geste : rinçage, zéro, agitation, fin goutte à goutte.",
  VAL: "Reprends les calculs à partir de tes mesures, en écrivant la relation avant les nombres.",
};

export default function CadreTp({ essai, etapes, retours, bilan: bilanDepart, retour, refaire }: Props) {
  const [faits, setFaits] = useState<RetourEtape[]>(retours);
  const [bilan, setBilan] = useState<Bilan | null>(bilanDepart);
  /** après une réponse, la correction de l'étape reste à l'écran jusqu'à « Continuer » */
  const [corrige, setCorrige] = useState<{ reponse: ReponseEtape } | null>(null);
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  const [documents, setDocuments] = useState(false);
  const haut = useRef<HTMLDivElement>(null);

  const rang = corrige ? faits.length - 1 : faits.length;
  const fini = !corrige && faits.length >= etapes.length;
  const etape = etapes[Math.min(rang, etapes.length - 1)];
  const manip = etapes.findIndex((e) => e.genre === "paillasse");
  const phase = fini ? 3 : rang < manip ? 0 : rang === manip ? 1 : 2;
  const situation = etapes[0]?.genre === "lecture" ? etapes[0] : null;
  const releve = manip >= 0 && faits[manip]?.correction.genre === "paillasse" ? faits[manip].correction.mesures : null;

  const remonte = () => haut.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  const valide = (reponse: ReponseEtape) => {
    if (attente) return;
    setAttente(true);
    setErreur("");
    repondreTp({ essai, etape: faits.length, reponse }).then((r) => {
      setAttente(false);
      if (!r.ok) { setErreur(r.message); return; }
      setFaits((avant) => [...avant, r.valeur.retour]);
      if (r.valeur.bilan) setBilan(r.valeur.bilan);
      // lire la situation n'appelle pas de correction : on passe à la suite
      setCorrige(reponse.g === "lecture" ? null : { reponse });
      remonte();
    }, () => { setAttente(false); setErreur("Ta réponse n'a pas pu être envoyée. Vérifie ta connexion, puis recommence."); });
  };
  const continuer = () => { setCorrige(null); setDocuments(false); remonte(); };

  return (
    <div className="tp" ref={haut}>
      <Etapes noms={["Préparer", "Manipuler", "Exploiter"]} actif={phase} />
      {!fini && <p className="petit discret tp-rang">Étape {rang + 1} sur {etapes.length}</p>}

      {fini && bilan && (
        <section className="carte fete tp-bilan" aria-label="Bilan du TP">
          {Object.values(bilan).every((n) => n === "A" || n === "B") && <Confettis />}
          <h2>TP terminé</h2>
          <p>Voici ton niveau pour chaque compétence, comme sur la grille de l&apos;épreuve.</p>
          <ul className="tp-niveaux">
            {COMPETENCES.filter((c) => bilan[c.id]).map((c) => (
              <li key={c.id}><span className={`tp-niveau tp-niveau-${bilan[c.id]}`}>{bilan[c.id]}</span><span><b>{c.nom}</b><span className="petit discret">{c.quoi}</span></span></li>
            ))}
          </ul>
          <p className="petit discret">A : réussi sans aide. B : une erreur. C : plusieurs erreurs. D : à reprendre.</p>
          {COMPETENCES.filter((c) => bilan[c.id] === "C" || bilan[c.id] === "D").map((c) => <p key={c.id} className="tp-conseil"><b>{c.nom}.</b> {CONSEILS[c.id]}</p>)}
          <div className="actions">
            <BoutonAction lancer={refaire}>Refaire ce TP</BoutonAction>
            <Link className="btn btn-ligne" href={retour}>Tous les TP</Link>
          </div>
        </section>
      )}

      {!fini && !corrige && situation && rang > 0 && (
        <div className="tp-rappels">
          <button type="button" className="btn-texte" aria-expanded={documents} onClick={() => setDocuments((d) => !d)}>{documents ? "Masquer les documents" : "Revoir les documents"}</button>
          {documents && <Documents documents={situation.documents} />}
          {releve && rang > manip && <ul className="tp-mesures" aria-label="Tes mesures">{releve.map((m) => <li key={m}><AvecIndices texte={m} /></li>)}</ul>}
        </div>
      )}

      {!fini && corrige && (
        <>
          <Correction etape={etape} retour={faits[rang]} reponse={corrige.reponse} />
          <div className="actions tp-suite"><button type="button" className="btn btn-cuivre" onClick={continuer}>{faits.length >= etapes.length ? "Voir mon bilan" : "Continuer"}</button></div>
        </>
      )}

      {!fini && !corrige && (
        <div key={rang}>
          {etape.genre === "lecture" && <Lecture etape={etape} valide={valide} attente={attente} />}
          {etape.genre === "materiel" && <Materiel etape={etape} valide={valide} attente={attente} />}
          {etape.genre === "ordre" && <Ordre etape={etape} valide={valide} attente={attente} />}
          {etape.genre === "choix" && <Choix etape={etape} valide={valide} attente={attente} />}
          {etape.genre === "valeur" && <Valeur etape={etape} valide={valide} attente={attente} />}
          {etape.genre === "paillasse" && (
            <div className="tp-etape">
              <h2>À toi de manipuler</h2>
              <p>{etape.consigne}</p>
              {etape.paillasse.genre === "titrage" && <PaillasseTitrage reglages={etape.paillasse.reglages} attente={attente} fini={(gestes) => valide({ g: "paillasse", gestes })} />}
            </div>
          )}
        </div>
      )}
      {erreur && <p role="alert" className="labo-erreur">{erreur}</p>}
    </div>
  );
}
