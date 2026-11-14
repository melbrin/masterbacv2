import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const focale: Tp = {
  id: "focale", titre: "Mesurer une distance focale", matiere: "physique", famille: "Lentilles", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default focale;
