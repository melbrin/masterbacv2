"use client";

// Les vues des paillasses, par genre. Chaque vue se charge à la demande : le navigateur ne reçoit que la paillasse
// du TP en cours, et une paillasse en panne n'arrête pas les autres.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { GesteBrut, Paillasse, PropsPaillasse } from "@/lib/commun/tp/types";

type Vue = ComponentType<PropsPaillasse<unknown>>;

function Attente() {
  return <p className="tp-chargement" role="status">La paillasse se prépare.</p>;
}

/** Une vue chargée à la demande. Chaque vue connaît le type de ses réglages ; le registre, lui, ne le connaît pas. */
function vue<R>(importe: () => Promise<{ default: ComponentType<PropsPaillasse<R>> }>): Vue {
  return dynamic(importe, { ssr: false, loading: Attente }) as unknown as Vue;
}

const VUES: Record<string, Vue> = {
  titrage: vue(() => import("./Titrage")),
  circuit: vue(() => import("./Circuit")),
  microcontroleur: vue(() => import("./Microcontroleur")),
  solutions: vue(() => import("./Solutions")),
  spectro: vue(() => import("./Spectro")),
  optique: vue(() => import("./Optique")),
  diffraction: vue(() => import("./Diffraction")),
  ultrasons: vue(() => import("./Ultrasons")),
  doppler: vue(() => import("./Doppler")),
  pointage: vue(() => import("./Pointage")),
  calorimetre: vue(() => import("./Calorimetre")),
  pile: vue(() => import("./Pile")),
  electrolyse: vue(() => import("./Electrolyse")),
  archimede: vue(() => import("./Archimede")),
  reflux: vue(() => import("./Reflux")),
  ccm: vue(() => import("./Ccm")),
};

/** La paillasse d'une étape de manipulation. */
export default function VuePaillasse({ paillasse, protocole, attente, fini }: { paillasse: Paillasse; protocole: string[]; attente: boolean; fini: (gestes: GesteBrut[]) => void }) {
  const Vue = VUES[paillasse.genre];
  if (!Vue) return <p role="alert" className="labo-erreur">Cette paillasse n&apos;est pas encore installée.</p>;
  return <Vue reglages={paillasse.reglages} protocole={protocole} attente={attente} fini={fini} />;
}
