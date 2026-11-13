# Parcours cliqués dans le prototype : vérifie qu'aucune erreur JavaScript ne survient et prend des captures.
import sys, asyncio
from playwright.async_api import async_playwright
CHROME = '/usr/bin/google-chrome'   # chemin de Chrome ; mettre None pour utiliser le Chromium installé par Playwright
OUT = sys.argv[1]
W, H = int(sys.argv[2]), int(sys.argv[3])
SCHEMA = sys.argv[4] if len(sys.argv) > 4 else 'light'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, locale='fr-FR', color_scheme=SCHEMA)
        page = await ctx.new_page()
        err = []
        page.on('pageerror', lambda e: err.append('pageerror: ' + str(e)))
        page.on('console', lambda m: err.append(m.type + ': ' + m.text) if m.type in ('error',) and 'favicon' not in m.text else None)
        async def va(h):
            await page.evaluate("h => { location.hash = h }", h)
            await page.wait_for_timeout(700)
        async def cap(nom, full=True):
            await page.screenshot(path=f'{OUT}/{nom}.png', full_page=full)
        await page.goto('http://127.0.0.1:8765/index.html', wait_until='networkidle')
        await page.wait_for_timeout(500)
        # 1. question : indices, corrigé, autoévaluation
        await va('fiche-09-q12')
        await page.click('[data-indice="1"]')
        await page.click('#voir-corrige')
        await page.wait_for_timeout(400)
        await page.click('.choix button[data-r="partiel"]')
        await page.wait_for_timeout(300)
        await cap('q12-corrige')
        # 2. exercice au barème
        await va('fiche-09-ex1')
        await page.click('#voir-corrige')
        await page.wait_for_timeout(300)
        n = await page.locator('.etape').count()
        for i in range(n):
            await page.locator('.etape').nth(i).locator('.seg button').nth(i % 2).click()
            await page.wait_for_timeout(150)
        await page.click('#valider-bareme')
        await page.wait_for_timeout(300)
        await cap('ex1-bareme')
        # 3. quiz du chapitre
        await va('quiz-09')
        for i in range(12):
            z = page.locator('#quiz-zone')
            if await z.locator('.options button:not([disabled])').count():
                await z.locator('.options button:not([disabled])').first.click()
            elif await z.locator('#rep-trou').count() and await z.locator('#rep-trou').is_enabled():
                await z.locator('#rep-trou').fill('test')
                await z.locator('#f-trou button').click()
            elif await z.locator('select').count() and await z.locator('select').first.is_enabled():
                for s in await z.locator('select').all():
                    await s.select_option(index=1)
                await z.locator('#val-as').click()
            elif await z.locator('#val-ordre').count() and await z.locator('#val-ordre').is_enabled():
                await z.locator('#val-ordre').click()
            await page.wait_for_timeout(150)
            btn = z.locator('.actions .btn').last
            if await btn.count() and 'suivante' in (await btn.inner_text()).lower() or 'résultat' in (await btn.inner_text()).lower():
                await btn.click()
                await page.wait_for_timeout(150)
            if await z.locator('.score-final').count():
                break
        await cap('quiz-fin')
        # 4. nouveau DS
        await va('ds-nouveau')
        await page.check('input[name="fiche"][value="10"]')
        await page.click('[data-obj="14"]')
        await page.click('#f-ds button[type="submit"]')
        await page.wait_for_timeout(800)
        await cap('ds-cree')
        # 5. séance du jour : passer les étapes
        await va('seance')
        await cap('seance-1', full=False)
        # 6. thème sombre
        await va('profil')
        await page.click('[data-theme-choix="dark"]')
        await page.wait_for_timeout(300)
        await va('aujourdhui')
        await cap('sombre-accueil')
        await va('fiche-09-q12')
        await page.click('#voir-corrige')
        await page.wait_for_timeout(300)
        await cap('sombre-q12')
        await va('profil')
        await page.click('[data-theme-choix="auto"]')
        # 7. nouvel élève
        await va('bienvenue')
        await cap('bienvenue', full=False)
        await va('test')
        for i in range(14):
            z = page.locator('#quiz-zone')
            if await z.locator('.score-final').count():
                break
            if await z.locator('.options button:not([disabled])').count():
                await z.locator('.options button:not([disabled])').first.click()
            elif await z.locator('#rep-trou').count() and await z.locator('#rep-trou').is_enabled():
                await z.locator('#rep-trou').fill('d')
                await z.locator('#f-trou button').click()
            elif await z.locator('select').count() and await z.locator('select').first.is_enabled():
                for s in await z.locator('select').all():
                    await s.select_option(index=1)
                await z.locator('#val-as').click()
            elif await z.locator('#val-ordre').count() and await z.locator('#val-ordre').is_enabled():
                await z.locator('#val-ordre').click()
            await page.wait_for_timeout(120)
            btn = z.locator('.actions .btn').last
            if await btn.count():
                await btn.click()
                await page.wait_for_timeout(120)
        await cap('test-resultat')
        await va('compte')
        await page.fill('#c-mail', 'eleve@exemple.fr')
        await page.click('#envoi-code')
        await page.fill('#c-code', '418205')
        await page.click('#verif-code')
        await page.fill('#c-prenom', 'Sami')
        await page.click('#f-compte button[type="submit"]')
        await page.wait_for_timeout(800)
        await cap('nouveau-cours', full=False)
        await va('aujourdhui')
        await cap('nouveau-accueil')
        await va('fiche-05-q3')
        await page.click('#voir-corrige')
        await page.wait_for_timeout(300)
        await cap('nouveau-verrou', full=False)
        print('\n'.join(err) or 'aucune erreur')
        await b.close()
asyncio.run(main())
