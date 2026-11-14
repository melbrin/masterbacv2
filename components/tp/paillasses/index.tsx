"use client";

// Les vues des paillasses, par genre. Chaque vue se charge à la demande : le navigateur ne reçoit que la paillasse
// du TP en cours, et une paillasse en panne n'arrête pas les autres.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { GesteBrut, Paillasse, PropsPaillasse } from "@/lib/commun/tp/types";
import { SuiviDuGuide } from "../kit/guide";

type Vue = ComponentType<PropsPaillasse<unknown>>;

function Attente() {
  return <p className="tp-chargement" role="status">La paillasse se prépare.</p>;
}

/** Une vue chargée à la demande. Chaque vue connaît le type de ses réglages ; le registre, lui, ne le connaît pas. */
function vue<R>(importe: () => Promise<{ default: ComponentType<PropsPaillasse<R>> }>): Vue {
  return dynamic(importe, { ssr: false, loading: Attente }) as unknown as Vue;
}

// Seules les paillasses relues et essayées sont inscrites ici. Une paillasse en construction se met au point sur son
// banc de chantier (app/(appli)/app/tp/chantier/) : un fichier à moitié écrit ne doit jamais atteindre les pages des élèves.
const VUES: Record<string, Vue> = {
  titrage: vue(() => import("./Titrage")),
};

/** La paillasse d'une étape de manipulation. */
export default function VuePaillasse({ paillasse, protocole, attente, fini }: { paillasse: Paillasse; protocole: string[]; attente: boolean; fini: (gestes: GesteBrut[]) => void }) {
  const Vue = VUES[paillasse.genre];
  if (!Vue) return <p role="alert" className="labo-erreur">Cette paillasse n&apos;est pas encore installée.</p>;
  // si le guide sert pendant la manipulation, les gestes partent avec sa marque
  return <SuiviDuGuide fini={fini}>{(envoie) => <Vue reglages={paillasse.reglages} protocole={protocole} attente={attente} fini={envoie} />}</SuiviDuGuide>;
}
