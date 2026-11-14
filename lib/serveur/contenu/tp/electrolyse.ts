import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const electrolyse: Tp = {
  id: "electrolyse", titre: "Déposer du cuivre par électrolyse", matiere: "chimie", famille: "Électrolyse", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default electrolyse;
