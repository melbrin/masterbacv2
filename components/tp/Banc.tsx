"use client";

// Le banc d'essai d'un TP (en local seulement) : chaque paillasse du TP, et ce que le serveur dit de la manipulation.
// Il sert aux TP de l'application (app/(appli)/app/tp/banc/) et à chaque chantier (app/(appli)/app/tp/chantier/).

import { useState, type ComponentType } from "react";
import type { EtapePublique, GesteBrut, Paillasse, RetourEtape } from "@/lib/commun/tp/types";
import { AvecIndices } from "./Etapes";
import { SuiviDuGuide } from "./kit/guide";

type Retour = { ok: true; valeur: { retour: RetourEtape; mesures: Record<string, number> } } | { ok: false; message: string };
/** La commande qui juge une manipulation : celle de l'application, ou celle d'un chantier. */
export type Essayer = (entree: { tp: string; graine: number; etape: number; gestes: GesteBrut[] }) => Promise<Retour>;
/** Ce qui dessine la paillasse d'une étape. */
export type VueDuBanc = ComponentType<{ paillasse: Paillasse; protocole: string[]; attente: boolean; fini: (gestes: GesteBrut[]) => void }>;

interface Verdict { retour: RetourEtape; mesures: Record<string, number>; gestes: GesteBrut[] }

function UnePaillasse({ tp, graine, rang, etape, essayer, Vue }: { tp: string; graine: number; rang: number; etape: Extract<EtapePublique, { genre: "paillasse" }>; essayer: Essayer; Vue: VueDuBanc }) {
  const [attente, setAttente] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [erreur, setErreur] = useState("");
  const fini = (gestes: GesteBrut[]) => {
    setAttente(true);
    setErreur("");
    essayer({ tp, graine, etape: rang, gestes }).then((r) => {
      setAttente(false);
      if (r.ok) setVerdict({ ...r.valeur, gestes }); else setErreur(r.message);
    }, () => { setAttente(false); setErreur("Le serveur n'a pas répondu."); });
  };
  const c = verdict?.retour.correction;
  return (
    <section className="tp-etape" data-banc={rang}>
      <h2>Étape {rang + 1} : {etape.paillasse.genre}</h2>
      <p>{etape.consigne}</p>
      {/* sur un banc de chantier, la vue n'est pas entourée par le registre de l'application : le suivi du guide se pose ici */}
      <SuiviDuGuide fini={fini}>{(envoie) => <Vue paillasse={etape.paillasse} protocole={etape.protocole} attente={attente} fini={envoie} />}</SuiviDuGuide>
      {erreur && <p role="alert" className="labo-erreur">{erreur}</p>}
      {verdict && c?.genre === "paillasse" && (
        <div className="tp-correction" role="status" data-score={verdict.retour.score}>
          <p><b>Score : {verdict.retour.score}.</b> {c.fautes.length === 0 ? "Aucune faute." : `${c.fautes.length} faute(s).`}{c.guide ? " Manipulation faite avec le guide." : ""}</p>
          <ul className="tp-liste-corrigee">{c.fautes.map((f) => <li key={f.code + f.texte} className={f.grave ? "est-faux" : ""}><b>{f.grave ? "Faute importante" : "Faute légère"} ({f.code}).</b> {f.texte}</li>)}</ul>
          <ul className="tp-mesures">{c.mesures.map((m) => <li key={m}><AvecIndices texte={m} /></li>)}</ul>
          <details>
            <summary>Les mesures et les {verdict.gestes.length} gestes</summary>
            <pre className="tp-banc-journal" data-mesures>{JSON.stringify(verdict.mesures)}</pre>
            <pre className="tp-banc-journal" data-gestes>{JSON.stringify(verdict.gestes)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}

export interface PropsBanc { tp: string; graine: number; paillasses: { rang: number; etape: EtapePublique }[]; essayer: Essayer }

export default function Banc({ tp, graine, paillasses, essayer, Vue }: PropsBanc & { Vue: VueDuBanc }) {
  return (
    <div className="tp">
      {paillasses.length === 0 && <p className="carte">Ce TP n&apos;a pas encore d&apos;étape de paillasse.</p>}
      {paillasses.map(({ rang, etape }) => (etape.genre === "paillasse" ? <UnePaillasse key={rang} tp={tp} graine={graine} rang={rang} etape={etape} essayer={essayer} Vue={Vue} /> : null))}
    </div>
  );
}
