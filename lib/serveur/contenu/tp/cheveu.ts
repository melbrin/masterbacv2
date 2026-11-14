import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const cheveu: Tp = {
  id: "cheveu", titre: "Mesurer un fil très fin par diffraction", matiere: "physique", famille: "Diffraction", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default cheveu;
