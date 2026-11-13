# Sort le texte d'un PDF d'origine, page par page, avec des repères : ⟦M:...⟧ formule, ⟦B:...⟧ gras, ⟦Cxxxxxx:...⟧ couleur.
# À lancer sur un PDF déjà passé par nettoie_pdf.py. Les lignes tout en haut et tout en bas de page sont écartées (en-tête, pied) :
# un titre de question placé en tête de page peut donc manquer, il faut relire chaque page en image (outils/planches.py).
# Les formules sortent dans le désordre : elles se relisent sur l'image, pas dans ce texte.
# usage : texte_pdf.py <fichier.pdf> <sortie.txt>
import sys, pymupdf, re
p = sys.argv[1]; out = sys.argv[2]
doc = pymupdf.open(p)
lines_out = []
for pno, page in enumerate(doc, 1):
    d = page.get_text("dict")
    H = page.rect.height
    lines_out.append(f"\n===== PAGE {pno} =====")
    items = []
    for b in d["blocks"]:
        if b["type"] == 1:
            x0, y0, x1, y1 = b["bbox"]
            items.append((y0, x0, f"[[IMAGE {int(x1-x0)}x{int(y1-y0)} at y={int(y0)}]]"))
            continue
        for l in b["lines"]:
            if (round(l["dir"][0], 2), round(l["dir"][1], 2)) != (1.0, 0.0):
                continue  # filigrane en diagonale
            y0 = l["bbox"][1]
            if y0 < 60 or y0 > H - 45:
                continue  # en-tête / pied
            txt = ""
            for s in l["spans"]:
                t = s["text"]
                if not t.strip():
                    txt += t; continue
                f = s["font"]; c = s["color"]; sz = round(s["size"])
                tag = ""
                if "Math" in f: tag = "M"
                elif c == 0x2f5496: tag = "BLEU"
                elif c not in (0, 0x000000):
                    tag = f"C{c:06x}"
                if "Bold" in f and tag == "": tag = "B"
                if sz >= 14 and tag in ("", "B"): tag += f"S{sz}"
                txt += (f"⟦{tag}:{t}⟧" if tag else t)
            items.append((y0, l["bbox"][0], txt))
    items.sort(key=lambda t: (round(t[0] / 3), t[1]))
    # merge items on same baseline
    cur_y = None; buf = ""
    for y, x, t in items:
        if cur_y is not None and abs(y - cur_y) < 3:
            buf += " " + t
        else:
            if buf.strip(): lines_out.append(buf)
            buf = t; cur_y = y
    if buf.strip(): lines_out.append(buf)
text = "\n".join(lines_out)
text = re.sub(r"⟧⟦(M|BLEU|B|C[0-9a-f]{6}):", "", text)  # fusion grossière des spans voisins de même type
open(out, "w", encoding="utf-8").write(text)
print(len(text), "chars,", text.count("\n"), "lines")
