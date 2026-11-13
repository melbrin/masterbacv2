# Planches de contrôle : met deux pages d'un PDF côte à côte dans une image, pour relire une mise en page.
# usage : planches.py <fichier.pdf> <dossier de sortie> <résolution, 95 par exemple> <page> <page> ...
import sys, subprocess, os, glob
from PIL import Image, ImageDraw
pdf, out, dpi = sys.argv[1], sys.argv[2], sys.argv[3]
pages = [int(x) for x in sys.argv[4:]]
os.makedirs(out, exist_ok=True)
ims = []
for n in pages:
    base = os.path.join(out, 'z%03d' % n)
    subprocess.run(['pdftoppm', '-jpeg', '-r', dpi, '-f', str(n), '-l', str(n), pdf, base], check=True)
    f = sorted(glob.glob(base + '*.jpg'))[0]
    ims.append((n, Image.open(f).convert('RGB'), f))
for k in range(0, len(ims), 2):
    grp = ims[k:k+2]
    w, h = grp[0][1].size
    sh = Image.new('RGB', (len(grp) * w + (len(grp) + 1) * 6, h + 12), (120, 120, 120))
    for i, (n, im, f) in enumerate(grp):
        x = 6 + i * (w + 6); sh.paste(im, (x, 6))
        d = ImageDraw.Draw(sh); d.rectangle([x, 6, x + 40, 24], fill=(0, 0, 0)); d.text((x + 5, 9), str(n), fill=(255, 255, 255))
    name = os.path.join(out, 'pair-' + '-'.join('%02d' % g[0] for g in grp) + '.jpg')
    sh.save(name, quality=88); print(name, sh.size)
for n, im, f in ims: os.remove(f)
