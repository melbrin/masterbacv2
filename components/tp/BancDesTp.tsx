"use client";

// Le banc d'essai des TP inscrits dans l'application : il se sert des paillasses de l'application.

import { essayerPaillasse } from "@/lib/serveur/commandes/tp";
import Banc, { type PropsBanc } from "./Banc";
import VuePaillasse from "./paillasses";

export default function BancDesTp(props: Omit<PropsBanc, "essayer">) {
  return <Banc {...props} essayer={essayerPaillasse} Vue={VuePaillasse} />;
}
