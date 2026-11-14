import "server-only";
import type { Tp } from "./types";

// En construction : ce TP ne se montre nulle part tant que `pret` est faux.
const ultrasons: Tp = {
  id: "ultrasons", titre: "Mesurer la célérité des ultrasons", matiere: "physique", famille: "Ondes sonores", fiche: 1, minutes: 20, etat: "brouillon", pret: false,
  accroche: "",
  etapes: () => [],
};

export default ultrasons;
