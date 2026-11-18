// Le thème de l'application (lib/commun/theme.ts) : ce que le cookie dit, et ce que la page en fait.
import { describe, expect, it } from "vitest";
import { attributTheme, lisChoixTheme } from "@/lib/commun/theme";

describe("thème", () => {
  it("lit un choix clair ou sombre ; toute autre valeur vaut automatique", () => {
    expect(lisChoixTheme("clair")).toBe("clair");
    expect(lisChoixTheme("sombre")).toBe("sombre");
    for (const autre of [undefined, null, "", "auto", "dark", "SOMBRE", "<script>"]) expect(lisChoixTheme(autre)).toBe("auto");
  });
  it("donne l'attribut de la page ; en automatique, aucun : la page suit le téléphone", () => {
    expect(attributTheme("clair")).toBe("light");
    expect(attributTheme("sombre")).toBe("dark");
    expect(attributTheme("auto")).toBeUndefined();
  });
});
