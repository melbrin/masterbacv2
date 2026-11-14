// Les deux TP de la paillasse Circuits, joués sans le navigateur : la manipulation soignée de chacun.
import { describe, expect, it } from "vitest";
import type { GesteBrut } from "@/lib/commun/tp/types";
import { tp } from "@/lib/serveur/contenu/tp";
import { GRAINES, joueJuste } from "../../outils/tp";

const GRAINE = GRAINES[0];
const relier = (fils: [string, string][]): GesteBrut[] => fils.map(([a, b]) => ({ g: "relier", a, b }));

// la manipulation soignée de chaque TP
const MANIPULATIONS: Record<string, GesteBrut[]> = {
  condensateur: [...relier([["g+", "k1"], ["k2", "r1"], ["r2", "c1"], ["c2", "g-"], ["voie", "c1"], ["masse", "c2"]]), { g: "acquerir" }, { g: "lire", tau: 3.3 }],
  jauge: [...relier([["d2", "r1"], ["r2", "c1"], ["c2", "gnd"], ["a0", "c1"]]), { g: "acquerir" }, { g: "niveau", h: 4 }, { g: "acquerir" }, { g: "niveau", h: 8 }, { g: "acquerir" }],
};

describe("les TP de la paillasse Circuits", () => {
  for (const id of Object.keys(MANIPULATIONS)) {
    it(`${id} : fait parfaitement, le TP donne A partout`, async () => {
      const partie = await joueJuste(tp(id)!, GRAINE, () => MANIPULATIONS[id]);
      expect(partie.scores.every((s) => s === 1), partie.scores.join(" ")).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
    });
  }
});
