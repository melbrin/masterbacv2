"use client";

// Le banc de chantier « ondes » : il ne charge que les paillasses de cette famille.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { GesteBrut, Paillasse, PropsPaillasse } from "@/lib/commun/tp/types";
import Banc, { type PropsBanc } from "../Banc";

type Vue = ComponentType<PropsPaillasse<never>>;
function Attente() {
  return <p className="tp-chargement" role="status">La paillasse se prépare.</p>;
}
const Ultrasons = dynamic(() => import("../paillasses/Ultrasons"), { ssr: false, loading: Attente }) as Vue;
const Pointage = dynamic(() => import("../paillasses/Pointage"), { ssr: false, loading: Attente }) as Vue;
const Doppler = dynamic(() => import("../paillasses/Doppler"), { ssr: false, loading: Attente }) as Vue;
const VUES: Record<string, Vue> = { ultrasons: Ultrasons, pointage: Pointage, doppler: Doppler };

function VueDuChantier({ paillasse, protocole, attente, fini }: { paillasse: Paillasse; protocole: string[]; attente: boolean; fini: (gestes: GesteBrut[]) => void }) {
  const V = Object.hasOwn(VUES, paillasse.genre) ? VUES[paillasse.genre] : null;
  if (!V) return <p role="alert" className="labo-erreur">La paillasse « {paillasse.genre} » n&apos;est pas dans ce chantier.</p>;
  return <V reglages={paillasse.reglages as never} protocole={protocole} attente={attente} fini={fini} />;
}

export default function BancOndes(props: PropsBanc) {
  return <Banc {...props} Vue={VueDuChantier} />;
}
