// Les phrases du parcours (app/(appli)/app/parcours/textes.ts) : ce que chaque étape dit à l'élève, et où elle mène.
import { describe, expect, it } from "vitest";
import { afficheEtape, type NomsDesEtapes } from "@/app/(appli)/app/parcours/textes";
import type { EtapeParcours } from "@/lib/moteur";

const titreFiche = (n: number) => `Chapitre ${n}`;
const noms: NomsDesEtapes = {
  defi: (id) => (id === "basket-2" ? { simulation: "Le basketteur", titre: "Le tir à 45°" } : null),
  tp: (id) => (id === "chute" ? { titre: "Une chute filmée", famille: "Mécanique", minutes: 25 } : null),
};
const affiche = (e: EtapeParcours) => afficheEtape(e, titreFiche, 25, noms);

const TOUTES: EtapeParcours[] = [
  { type: "calibrage", raison: "jamais" }, { type: "calibrage", raison: "ancien" }, { type: "chapitres" },
  { type: "ds", id: "d1", seance: "s1", titre: "Exercices ciblés", jours: 3 }, { type: "ds", id: "d1", seance: "s1", titre: "Exercices ciblés", jours: 0 },
  { type: "seance" }, { type: "carnet", nombre: 2 }, { type: "passage", fiche: 3, niveau: 14 },
  { type: "objectif", fiche: 3, niveau: 14, faits: 0, total: 6, taux: 0 }, { type: "objectif", fiche: 3, niveau: 14, faits: 2, total: 6, taux: 0.5 },
  { type: "defi", fiche: 1, simulation: "basket", defi: "basket-2", rang: 2, niveau: 14 }, { type: "defi", fiche: 1, simulation: "autre", defi: "autre-1", rang: 1, niveau: 10 },
  { type: "tp", fiche: 1, tp: "chute", reprise: null }, { type: "tp", fiche: 1, tp: "chute", reprise: "abc" }, { type: "tp", fiche: 1, tp: "inconnu", reprise: null },
];

describe("phrases des étapes du parcours", () => {
  it("chaque étape a un titre, un détail, un bouton, une adresse dans l'application, et garde son genre", () => {
    for (const e of TOUTES) {
      const a = affiche(e);
      expect(a.type).toBe(e.type);
      expect(a.titre.length).toBeGreaterThan(8);
      expect(a.detail.length).toBeGreaterThan(8);
      expect(a.bouton.length).toBeGreaterThan(3);
      expect(a.href).toMatch(/^\/app(\/|$)/);
    }
  });
  it("respecte les règles de rédaction : pas de tiret long, ni « leçon », ni « découvre »", () => {
    for (const e of TOUTES) {
      const texte = Object.values(affiche(e)).join(" ");
      expect(texte).not.toMatch(/[—–]|leçon|découvr|prochainement/i);
    }
  });
  it("un défi du labo : la simulation, le chapitre, l'objectif, et l'adresse du défi", () => {
    expect(affiche({ type: "defi", fiche: 1, simulation: "basket", defi: "basket-2", rang: 2, niveau: 14 })).toEqual({
      type: "defi", titre: "Réussis un défi du labo : Le basketteur",
      detail: "Chapitre 1, objectif 14 : « Le tir à 45° ». Tu calcules, puis tu lances la simulation.",
      href: "/app/labo/basket/2", bouton: "Ouvrir le défi",
    });
    // un défi dont le nom manque garde une phrase entière et la bonne adresse
    expect(affiche({ type: "defi", fiche: 2, simulation: "autre", defi: "autre-1", rang: 1, niveau: 10 })).toMatchObject({
      titre: "Réussis un défi du labo : une simulation", detail: "Chapitre 2, objectif 10. Tu calcules, puis tu lances la simulation.", href: "/app/labo/autre/1",
    });
  });
  it("un TP : son titre, sa durée, et la page des TP à sa hauteur", () => {
    expect(affiche({ type: "tp", fiche: 1, tp: "chute", reprise: null })).toEqual({
      type: "tp", titre: "Fais un TP : Une chute filmée", detail: "Chapitre 1, 25 minutes. Tu manipules comme à l'épreuve d'ECE.",
      href: "/app/tp#tp-chute", bouton: "Voir ce TP",
    });
    expect(affiche({ type: "tp", fiche: 1, tp: "inconnu", reprise: null })).toMatchObject({ titre: "Fais un TP : un TP de ce chapitre", href: "/app/tp#tp-inconnu" });
  });
  it("un TP laissé en route : l'étape rouvre l'essai", () => {
    expect(affiche({ type: "tp", fiche: 1, tp: "chute", reprise: "abc" })).toEqual({
      type: "tp", titre: "Termine ton TP : Une chute filmée", detail: "Chapitre 1. Tu le reprends là où tu l'as laissé.",
      href: "/app/tp/essai/abc", bouton: "Reprendre le TP",
    });
  });
});
