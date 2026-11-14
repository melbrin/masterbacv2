import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const calorimetrie: Tp = {
  id: "calorimetrie", titre: "Mesurer une capacité thermique", matiere: "physique", famille: "Calorimétrie", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default calorimetrie;
