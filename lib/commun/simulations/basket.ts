// Les défis du basketteur (fiche 1 : chute libre et mouvement d'un projectile). Les calculs sont ceux de lib/commun/physique.ts.
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { dureeSaut, finDuVol, hauteurMaxSaut, hauteurSaut, positionTir, verdictTir, vitesseSaut, vitesseTir } from "@/lib/commun/physique";
import type { Regles, Valeurs } from "./types";

/** L'écart toléré sur la hauteur du saut, en mètres. */
const TOLERANCE_SAUT = 0.03;
const tir = (p: Valeurs) => ({ v0: p.v0, angle: p.angle, hauteur: p.hauteur });
const m = (x: number) => `${nombre(x, 2)} m`;

// mode 0 : le saut, où le joueur doit monter de `cible` mètres ; mode 1 : le tir vers le panier
export const reglesBasket: Regles = {
  issue(p) {
    if (p.mode === 0) {
      const h = hauteurMaxSaut(p.v0);
      if (Math.abs(h - p.cible) <= TOLERANCE_SAUT) return { reussi: true, message: `Le joueur monte de ${m(h)} : il attrape le ballon au sommet de son saut.` };
      return { reussi: false, message: h < p.cible ? `Trop bas : le joueur monte de ${m(h)}, le ballon passe à ${m(p.cible)}.` : `Trop haut : le joueur monte de ${m(h)}, il dépasse le ballon qui passe à ${m(p.cible)}.` };
    }
    const v = verdictTir(tir(p));
    if (v.resultat === "reussi") return { reussi: true, message: "Panier !" };
    if (v.resultat === "court") return { reussi: false, message: `Trop court de ${m(v.ecart)}.` };
    if (v.resultat === "long") return { reussi: false, message: `Trop long de ${m(v.ecart)}.` };
    return { reussi: false, message: `Le ballon ne monte pas assez haut : son sommet est à ${m(v.sommet)}.` };
  },
  duree: (p) => (p.mode === 0 ? dureeSaut(p.v0) : finDuVol(tir(p))) + 0.4,
  cadence: () => 1,
  mesures(p, t) {
    if (p.mode === 0) {
      const ts = Math.min(t, dureeSaut(p.v0));
      return [{ nom: "t", valeur: `${nombre(ts, 2)} s` }, { nom: "y", valeur: m(Math.max(0, hauteurSaut(p.v0, ts))) }, { nom: "v_y", valeur: `${nombreRelatif(vitesseSaut(p.v0, ts), 2)} m/s` }];
    }
    const ts = Math.min(t, finDuVol(tir(p)));
    const pos = positionTir(tir(p), ts);
    return [{ nom: "t", valeur: `${nombre(ts, 2)} s` }, { nom: "x", valeur: m(pos.x) }, { nom: "y", valeur: m(Math.max(0, pos.y)) }, { nom: "v_y", valeur: `${nombreRelatif(vitesseTir(tir(p), ts).vy, 2)} m/s` }];
  },
};
