"use client";

// Le banc d'essai d'un TP (en local seulement) : chaque paillasse du TP, et ce que le serveur dit de la manipulation.

import { useState } from "react";
import type { EtapePublique, GesteBrut, RetourEtape } from "@/lib/commun/tp/types";
import { essayerPaillasse } from "@/lib/serveur/commandes/tp";
import { AvecIndices } from "./Etapes";
import VuePaillasse from "./paillasses";

interface Verdict { retour: RetourEtape; mesures: Record<string, number>; gestes: GesteBrut[] }

function UnePaillasse({ tp, graine, rang, etape }: { tp: string; graine: number; rang: number; etape: Extract<EtapePublique, { genre: "paillasse" }> }) {
  const [attente, setAttente] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [erreur, setErreur] = useState("");
  const fini = (gestes: GesteBrut[]) => {
    setAttente(true);
    setErreur("");
    essayerPaillasse({ tp, graine, etape: rang, gestes }).then((r) => {
      setAttente(false);
      if (r.ok) setVerdict({ ...r.valeur, gestes }); else setErreur(r.message);
    }, () => { setAttente(false); setErreur("Le serveur n'a pas répondu."); });
  };
  const c = verdict?.retour.correction;
  return (
    <section className="tp-etape" data-banc={rang}>
      <h2>Étape {rang + 1} : {etape.paillasse.genre}</h2>
      <p>{etape.consigne}</p>
      <VuePaillasse paillasse={etape.paillasse} protocole={etape.protocole} attente={attente} fini={fini} />
      {erreur && <p role="alert" className="labo-erreur">{erreur}</p>}
      {verdict && c?.genre === "paillasse" && (
        <div className="tp-correction" role="status" data-score={verdict.retour.score}>
          <p><b>Score : {verdict.retour.score}.</b> {c.fautes.length === 0 ? "Aucune faute." : `${c.fautes.length} faute(s).`}</p>
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

export default function Banc({ tp, graine, paillasses }: { tp: string; graine: number; paillasses: { rang: number; etape: EtapePublique }[] }) {
  return (
    <div className="tp">
      {paillasses.map(({ rang, etape }) => (etape.genre === "paillasse" ? <UnePaillasse key={rang} tp={tp} graine={graine} rang={rang} etape={etape} /> : null))}
    </div>
  );
}
