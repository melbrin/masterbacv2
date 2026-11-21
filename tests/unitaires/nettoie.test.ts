import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nettoie, texDe } from "@/lib/commun/html/nettoie";

const brut = (html: string) => nettoie(html, { rendreFormules: false });

describe("nettoyage du HTML : ce qui est permis passe tel quel", () => {
  it("garde un contenu conforme sans rien signaler", () => {
    const html = '<div class="cs-enonce"><p>Un <strong>texte</strong> avec H<sub>2</sub>O.</p></div><table style="width: 60%"><colgroup><col style="width: 33%"></colgroup><tbody><tr class="odd"><td>a</td></tr></tbody></table><ol start="2" type="a"><li>b</li></ol>';
    const r = brut(html);
    expect(r.problemes).toEqual([]);
    expect(r.html).toBe(html);
  });
  it("garde une figure de l'export et note son nom ; son adresse peut être réécrite", () => {
    const html = '<img src="figs/pc-09-acides-bases/fig_ph.webp" alt="Échelle de pH" class="fig" style="--w:70%" loading="lazy">';
    expect(brut(html)).toMatchObject({ problemes: [], figures: ["pc-09-acides-bases/fig_ph.webp"] });
    const r = nettoie(html, { adresseFigure: (f, n) => `/api/figures/${f}/${n}` });
    expect(r.html).toContain('src="/api/figures/pc-09-acides-bases/fig_ph.webp"');
  });
  it("rend une formule avec KaTeX et garde les couleurs de la charte", () => {
    const r = nettoie('<p><span class="math inline">\\(\\cR{x} = 2{,}0\\ \\text{mol}\\)</span></p>');
    expect(r.problemes).toEqual([]);
    expect(r.formules).toBe(1);
    expect(r.html).toContain('class="katex"');
    expect(r.html).toContain("c-r");
    expect(r.html).not.toContain("\\(");
  });
  it("signale une formule que KaTeX refuse, sans planter", () => {
    const r = nettoie('<span class="math inline">\\(\\frac{1}{\\)</span>');
    expect(r.problemes[0]).toMatch(/formule refusée/);
  });
  it("retire les délimiteurs d'une formule et décode les entités", () => {
    expect(texDe("\\(a &lt; b\\)")).toBe("a < b");
    expect(texDe("\\[x\\]")).toBe("x");
    expect(texDe("x")).toBe("x");
  });
});

describe("nettoyage du HTML : ce qui n'est pas dans la liste est retiré et signalé", () => {
  const cas: [string, string, RegExp][] = [
    ["un script et son contenu", '<p>a</p><script>alert("MARQUEUR")</script>', /balise refusée : script/],
    ["un style et son contenu", "<style>p{color:red;MARQUEUR}</style><p>a</p>", /balise refusée : style/],
    ["un lien", '<p><a href="https://exemple.fr">MARQUEUR-HREF</a></p>', /balise refusée : a/],
    ["un gestionnaire d'événement", '<p onclick="MARQUEUR()">a</p>', /attribut refusé : onclick/],
    ["un style libre", '<p style="background:url(MARQUEUR)">a</p>', /attribut refusé : style/],
    ["une image externe", '<img src="https://exemple.fr/MARQUEUR.png" alt="x">', /attribut refusé : src/],
    ["une image en javascript", '<img src="javascript:MARQUEUR" alt="x">', /attribut refusé : src/],
    ["une remontée de dossier dans une figure", '<img src="figs/../MARQUEUR/x.webp">', /attribut refusé : src/],
    ["une classe inconnue", '<p class="MARQUEUR cs-enonce">a</p>', /classe refusée/],
    ["un cadre", '<iframe src="MARQUEUR"></iframe>', /balise refusée : iframe/],
    ["un svg porteur de script", "<svg><script>MARQUEUR</script></svg>", /balise refusée : svg/],
    ["un commentaire", "<p>a</p><!-- MARQUEUR -->", /commentaire retiré/],
    ["une largeur aberrante", '<col style="width: 5000%;position:fixed">', /attribut refusé : style/],
    ["un alignement suivi d'autre chose", '<td style="text-align: center; position: fixed">a</td>', /attribut refusé : style/],
    ["un style libre sur une case", '<th style="color: red">a</th>', /attribut refusé : style/],
    ["un identifiant hors d'un titre", '<p id="MARQUEUR">a</p>', /attribut refusé : id/],
  ];
  for (const [nom, html, attendu] of cas) {
    it(nom, () => {
      const r = brut(html);
      expect(r.problemes.join(" | ")).toMatch(attendu);
      if (nom !== "un lien") expect(r.html).not.toContain("MARQUEUR");
      expect(r.html).not.toMatch(/<(script|style|a|iframe|svg)\b/i);
      expect(r.html).not.toMatch(/\son[a-z]+=/i);
    });
  }
  it("garde le texte d'un lien, sans le lien", () => {
    expect(brut('<p><a href="https://exemple.fr">texte</a></p>').html).toBe("<p>texte</p>");
  });
  it("referme ce qui est resté ouvert et ignore une fermeture en trop", () => {
    expect(brut("<p><strong>a</p>").html).toBe("<p><strong>a</strong></p>");
    expect(brut("a</div>").html).toBe("a");
    expect(brut("a < b").html).toBe("a &lt; b");
  });
  it("échappe un attribut qui tente de sortir de ses guillemets", () => {
    const r = brut("<img src='figs/a/b.webp' alt='x\" onerror=\"MARQUEUR'>");
    expect(r.html).toBe('<img src="figs/a/b.webp" alt="x&quot; onerror=&quot;MARQUEUR">');
  });
});

describe("nettoyage du HTML : propriétés", () => {
  const morceau = fc.oneof(
    fc.string(),
    fc.constantFrom("<p>", "</p>", "<script>", "</script>", "<img src=x onerror=alert(1)>", "<a href='javascript:x'>", "<div class=\"cs-enonce\">", "</div>",
      "<svg/onload=alert(1)>", "<p onclick=x>", "<!--", "-->", "<", ">", "\"", "'", "<style>", "<iframe>", "<span class=\"math inline\">", "</span>", "&lt;script&gt;"),
  );
  const entree = fc.array(morceau, { maxLength: 30 }).map((m) => m.join(""));
  it("quelle que soit l'entrée, la sortie ne contient ni balise hors liste, ni gestionnaire d'événement, ni adresse externe", () => {
    fc.assert(fc.property(entree, (html) => {
      const r = brut(html);
      for (const m of r.html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)) {
        expect(["p", "div", "span", "strong", "em", "sub", "sup", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col", "h3", "img", "code", "pre"]).toContain(m[1]);
      }
      expect(r.html).not.toMatch(/<[^>]*\son[a-z]+\s*=/i);
      expect(r.html).not.toMatch(/<[^>]*(javascript:|https?:)/i);
    }), { numRuns: 500 });
  });
  it("nettoyer deux fois donne le même résultat", () => {
    fc.assert(fc.property(entree, (html) => {
      const une = brut(html).html;
      expect(brut(une).html).toBe(une);
    }), { numRuns: 300 });
  });
});

describe("l'alignement des colonnes de tableau", () => {
  it("garde seulement text-align à gauche, au centre ou à droite, sur th et td", () => {
    const r = nettoie('<table><thead><tr><th style="text-align: center;">a</th></tr></thead><tbody><tr><td style="text-align:right">b</td></tr></tbody></table>');
    expect(r.problemes).toEqual([]);
    expect(r.html).toContain('<th style="text-align: center">');
    expect(r.html).toContain('<td style="text-align: right">');
  });
});
