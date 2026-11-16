import { describe, expect, it } from "vitest";
import { ajouteJours, ecartEnJours, jourDeParis, jourDeSemaine, joursAvantLeBac } from "@/lib/commun/dates";

describe("dates de Paris", () => {
  it("donne le jour civil de Paris, pas celui du serveur", () => {
    expect(jourDeParis(new Date("2026-11-13T22:59:00Z"))).toBe("2026-11-13");
    expect(jourDeParis(new Date("2026-11-13T23:00:00Z"))).toBe("2026-11-14");
    expect(jourDeParis(new Date("2027-06-15T21:59:59Z"))).toBe("2027-06-15");
    expect(jourDeParis(new Date("2027-06-15T22:00:00Z"))).toBe("2027-06-16");
  });
  it("compte des jours entiers à travers les changements d'heure", () => {
    expect(ecartEnJours("2027-03-27", "2027-03-29")).toBe(2);
    expect(ecartEnJours("2026-10-24", "2026-10-26")).toBe(2);
    expect(ajouteJours("2026-12-31", 1)).toBe("2027-01-01");
    expect(ajouteJours("2028-02-28", 1)).toBe("2028-02-29");
    expect(ajouteJours("2026-11-13", -13)).toBe("2026-10-31");
    expect(jourDeSemaine("2026-11-13")).toBe(5);
  });
  it("compte les jours avant le bac du 16 juin 2027", () => {
    expect(joursAvantLeBac(new Date("2026-11-13T17:00:00Z"))).toBe(215);
    expect(joursAvantLeBac(new Date("2027-06-16T08:00:00Z"))).toBe(0);
    expect(joursAvantLeBac(new Date("2027-07-01T08:00:00Z"))).toBe(0);
  });
});
