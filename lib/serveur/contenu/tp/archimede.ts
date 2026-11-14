import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const archimede: Tp = {
  id: "archimede", titre: "Mesurer une poussée d'Archimède", matiere: "physique", famille: "Fluides", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default archimede;
