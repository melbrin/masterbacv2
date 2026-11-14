"use client";

// À l'envers : les mêmes chiffres que « Suite de chiffres », à taper du dernier au premier.

import type { PropsMemoire } from "@/lib/commun/memoire";
import { NIVEAUX_ENVERS } from "@/lib/commun/memoire/suites";
import { PlateauChiffres } from "./Chiffres";
import { CadreMemoire } from "./Commun";

/**
 * À l'envers. De 2 à 10 chiffres, un par seconde, à redonner dans l'ordre inverse.
 * La partie s'arrête à la deuxième erreur. Score : la part des neuf longueurs réussies, sur 100.
 */
export default function Envers(props: PropsMemoire) {
  return (
    <CadreMemoire {...props} jeu="envers" niveaux="De 2 à 10 chiffres"
      consigne={["Des chiffres s'affichent un par un.", "Retiens-les, puis tape-les à l'envers, du dernier au premier."]}>
      <PlateauChiffres niveaux={NIVEAUX_ENVERS} envers />
    </CadreMemoire>
  );
}
