"use client";

// Le banc de chantier « thermo » : il ne charge que les paillasses de cette famille.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { GesteBrut, Paillasse, PropsPaillasse } from "@/lib/commun/tp/types";
import Banc, { type PropsBanc } from "../Banc";

type Vue = ComponentType<PropsPaillasse<never>>;
function Attente() {
  return <p className="tp-chargement" role="status">La paillasse se prépare.</p>;
}
const Archimede = dynamic(() => import("../paillasses/Archimede"), { ssr: false, loading: Attente }) as Vue;
const Calorimetre = dynamic(() => import("../paillasses/Calorimetre"), { ssr: false, loading: Attente }) as Vue;
const Pile = dynamic(() => import("../paillasses/Pile"), { ssr: false, loading: Attente }) as Vue;
const Electrolyse = dynamic(() => import("../paillasses/Electrolyse"), { ssr: false, loading: Attente }) as Vue;
const VUES: Record<string, Vue> = { archimede: Archimede, calorimetre: Calorimetre, pile: Pile, electrolyse: Electrolyse };

function VueDuChantier({ paillasse, protocole, attente, fini }: { paillasse: Paillasse; protocole: string[]; attente: boolean; fini: (gestes: GesteBrut[]) => void }) {
  const V = Object.hasOwn(VUES, paillasse.genre) ? VUES[paillasse.genre] : null;
  if (!V) return <p role="alert" className="labo-erreur">La paillasse « {paillasse.genre} » n&apos;est pas dans ce chantier.</p>;
  return <V reglages={paillasse.reglages as never} protocole={protocole} attente={attente} fini={fini} />;
}

export default function BancThermo(props: PropsBanc) {
  return <Banc {...props} Vue={VueDuChantier} />;
}
