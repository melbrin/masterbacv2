// Le numéro de suivi d'une panne (lib/commun/pannes.ts) : la seule chose d'une erreur que l'application montre.
import { describe, expect, it } from "vitest";
import { numeroDeSuivi } from "@/lib/commun/pannes";

const erreur = (digest: unknown) => Object.assign(new Error("message qui ne doit jamais s'afficher"), { digest });

describe("numéro de suivi d'une panne", () => {
  it("rend le numéro que le serveur a donné à l'erreur", () => {
    expect(numeroDeSuivi(erreur("747191374"))).toBe("747191374");
    expect(numeroDeSuivi(erreur("a1B2-c3_d4"))).toBe("a1B2-c3_d4");
  });
  it("ne rend rien pour une erreur sans numéro, ou pour ce qui n'est pas une erreur", () => {
    expect(numeroDeSuivi(new Error("sans numéro"))).toBeNull();
    for (const autre of [null, undefined, "747191374", 42, { digest: "747191374" }]) expect(numeroDeSuivi(autre)).toBeNull();
  });
  it("ne rend rien si le numéro n'en est pas un : ni texte libre, ni balise, ni numéro trop long", () => {
    for (const faux of [747191374, "", "deux mots", "<b>x</b>", "NEXT_REDIRECT;replace;/app;307;", "x".repeat(41), null]) expect(numeroDeSuivi(erreur(faux))).toBeNull();
  });
  it("ne rend jamais le message de l'erreur", () => {
    expect(numeroDeSuivi(erreur("abc"))).not.toContain("message");
  });
});
