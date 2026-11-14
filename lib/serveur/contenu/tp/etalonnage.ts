import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const etalonnage: Tp = {
  id: "etalonnage", titre: "Doser un colorant par étalonnage", matiere: "chimie", famille: "Dosage par étalonnage", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default etalonnage;
