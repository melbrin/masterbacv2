# Ouvre le prototype dans Chrome sans tête, relève les erreurs JavaScript et prend des captures.
# usage : python3 capture.py <dossier sortie> <largeur> <hauteur> <route> [<route> ...]   (route sans #, "" pour l'accueil)
import sys, asyncio, json
from playwright.async_api import async_playwright
CHROME = '/usr/bin/google-chrome'   # chemin de Chrome ; mettre None pour utiliser le Chromium installé par Playwright
out, W, H, routes = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, locale='fr-FR', color_scheme=('dark' if '--sombre' in out else 'light'))
        page = await ctx.new_page()
        erreurs = []
        page.on('pageerror', lambda e: erreurs.append('pageerror: ' + str(e)))
        page.on('console', lambda m: erreurs.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        await page.goto('http://127.0.0.1:8765/index.html', wait_until='networkidle')
        await page.wait_for_timeout(600)
        for r in routes:
            await page.evaluate("h => { location.hash = h }", r)
            await page.wait_for_timeout(900)
            nom = (r or 'accueil').replace('/', '_')
            await page.screenshot(path=f'{out}/{nom}.png', full_page=True)
            print(r or 'accueil', 'ok')
        print('\n'.join(erreurs) or 'aucune erreur')
        await b.close()
asyncio.run(main())
