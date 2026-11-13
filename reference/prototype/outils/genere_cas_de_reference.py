# Cas de référence du moteur : fait tourner les règles du prototype à date fixe et enregistre leurs résultats.
# La réécriture du moteur dans l'application doit redonner exactement ces résultats à partir des mêmes entrées.
#
# usage, depuis reference/prototype/ :
#   (dans un premier terminal)  cd site && python3 -m http.server 8765 --bind 127.0.0.1
#   (dans un second)            python3 outils/genere_cas_de_reference.py ../moteur-cas-de-reference.json
# Demande Playwright (pip install playwright) et Chrome : voir CHROME ci-dessous.
#
# Les données de contenu sont celles du prototype, figées : site/data/fiches.json et site/data/quiz.json.
# Leur empreinte est écrite dans le fichier produit, pour que les tests refusent des données modifiées.
#
# Trois scénarios :
#   demo      l'élève de démonstration (Inès), le 13 novembre 2026 à 18 h, heure de Paris
#   nouveau   un nouvel élève sans aucune réponse, même date
#   sequence  un nouvel élève suivi sur un mois : chaque étape applique des actions datées, puis relève l'état
import sys, os, json, asyncio, hashlib
from playwright.async_api import async_playwright

SORTIE = sys.argv[1]
URL = 'http://127.0.0.1:8765/index.html'
CHROME = '/usr/bin/google-chrome'   # chemin de Chrome ; mettre None pour utiliser le Chromium installé par Playwright
DONNEES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'site', 'data')


def empreinte(nom):
    with open(os.path.join(DONNEES, nom), 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()
MAINTENANT = '2026-11-13T18:00:00+01:00'

# Les plans de DS demandés dans chaque scénario : « dans » = nombre de jours avant le devoir.
PLANS = [
    {'id': 'ref-express', 'dans': 1, 'fiches': [9], 'duree': 1, 'objectif': 10},
    {'id': 'ref-trois-jours', 'dans': 3, 'fiches': [1], 'duree': 2, 'objectif': 14},
    {'id': 'ref-semaine', 'dans': 7, 'fiches': [11], 'duree': 2, 'objectif': 14},
    {'id': 'ref-deux-chapitres', 'dans': 10, 'fiches': [6, 7], 'duree': 4, 'objectif': 18},
    {'id': 'ref-sans-quiz', 'dans': 5, 'fiches': [14], 'duree': 2, 'objectif': 14},
    {'id': 'ref-peu-de-quiz', 'dans': 2, 'fiches': [10], 'duree': 1, 'objectif': 10},
    {'id': 'ref-semaine-viser-10', 'dans': 7, 'fiches': [9], 'duree': 1, 'objectif': 10},
]
QUIZ = [
    {'fiches': [9], 'n': 10, 'objectif': 14, 'graine': 12345},
    {'fiches': [10], 'n': 10, 'objectif': 10, 'graine': 777},
    {'fiches': [1, 3], 'n': 6, 'objectif': 18, 'graine': 42},
    {'fiches': [14], 'n': 10, 'objectif': 14, 'graine': 1},
]
PASSAGES = [[1, 14], [9, 14], [11, 18]]
FAIBLES = [{'fiches': [9], 'objectif': 14, 'n': 5}, {'fiches': [1, 3], 'objectif': 10, 'n': 4}]

# Relève tout ce que le moteur calcule pour l'état courant. La séance du jour est calculée en dernier,
# sur un état où elle n'existe pas encore, puis retirée pour laisser l'état d'entrée intact.
RELEVE = """async ({ plans, quiz, passages, faibles, notions }) => {
  const etat = await import('./js/etat.js');
  const m = await import('./js/moteur.js');
  const u = await import('./js/util.js');
  const d = await import('./js/donnees.js');
  const st = etat.store.state;
  st.seance = null;
  const copie = (x) => JSON.parse(JSON.stringify(x));
  const auj = u.jour();
  const fiches = {};
  for (const f of d.D.fiches) fiches[f.num] = { etats: m.etatsFiche(f.num), niveau: m.niveauFiche(f.num) };
  const etatsNotions = {};
  for (const [num, ids] of Object.entries(notions || {})) {
    etatsNotions[num] = {};
    for (const id of ids) etatsNotions[num][id] = m.etatNotion(Number(num), d.info(Number(num)).liste_notions.find((n) => n.id === id));
  }
  const sortie = {
    jour: auj,
    carnet: m.carnet(),
    carnetDuJour: m.carnetDu(),
    fiches,
    etatsNotions,
    noteEstimee: m.noteEstimee(),
    prochainDS: m.prochainDS()?.id ?? null,
    dsANoter: m.dsANoter().map((x) => x.id),
    lundi: m.lundi(),
    seancesSemaine: m.seancesSemaine(),
    periode: m.periodeActuelle().id,
    formatPour: Array.from({ length: 11 }, (_, j) => m.formatPour(j)),
    plans: plans.map((p) => {
      const ds = { id: p.id, date: u.ajouteJours(auj, p.dans), duree: p.duree, fiches: p.fiches, objectif: p.objectif, cree: auj, note: null };
      return { entree: ds, sortie: m.construitPlan(ds) };
    }),
    quizPour: quiz.map((q) => ({ entree: q, sortie: m.quizPour(q.fiches, q.n, q.objectif, q.graine) })),
    questionsPassage: passages.map(([num, L]) => ({ entree: { fiche: num, niveau: L }, sortie: m.questionsPassage(num, L) })),
    pointsFaibles: faibles.map((p) => ({ entree: p, sortie: m.pointsFaibles(p.fiches, p.objectif, p.n) })),
  };
  const s = copie(m.seanceDuJour());
  sortie.seanceDuJour = { revoir: s.revoir, exercice: s.exercice, raison: s.raison, dsId: s.dsId };
  st.seance = null;
  etat.sauve();
  return copie(sortie);
}"""

ETAT = """async () => {
  const etat = await import('./js/etat.js');
  const st = JSON.parse(JSON.stringify(etat.store.state));
  st.seance = null;
  return st;
}"""

NOUVEAU = """async (profil) => {
  const etat = await import('./js/etat.js');
  etat.remet(etat.etatNouveau(profil));
}"""

# Une action de la séquence, appliquée à l'heure courante du navigateur.
ACTION = """async (a) => {
  const etat = await import('./js/etat.js');
  const m = await import('./js/moteur.js');
  const st = etat.store.state;
  if (a.type === 'vu') st.vuEnClasse[a.fiche] = a.valeur;
  else if (a.type === 'reponse') m.enregistre(a.cle, a.resultat, a.score);
  else if (a.type === 'passage') (st.passages[a.fiche] ||= {})[a.niveau] = Date.now();
  else if (a.type === 'ds') st.ds.push(a.ds);
  else if (a.type === 'seance-faite') m.marqueSeanceFaite();
  else throw new Error('action inconnue : ' + a.type);
  etat.sauve();
}"""

PROFIL = {'prenom': 'Sami', 'classe': 'Terminale', 'objectif': 14}
R = lambda cle, resultat, score=None: {'type': 'reponse', 'cle': cle, 'resultat': resultat, **({'score': score} if score is not None else {})}
SEQUENCE = [
    {'maintenant': '2026-11-02T18:00:00+01:00', 'titre': 'Premier soir : le chapitre 9 est coché, cinq réponses dont trois ratées ou incomplètes',
     'actions': [{'type': 'vu', 'fiche': 9, 'valeur': True}, R('9-q1', 'ok'), R('9-q2', 'ko'), R('9-q4', 'partiel'), R('quiz:CS-B01', 'ok'), R('quiz:CS-B02', 'ko')]},
    {'maintenant': '2026-11-04T18:00:00+01:00', 'titre': 'Deux jours après : les trois erreurs sont revues et réussies, une question de plus',
     'actions': [R('9-q2', 'ok'), R('9-q4', 'ok'), R('quiz:CS-B02', 'ok'), R('9-q6', 'ok'), {'type': 'seance-faite'}]},
    {'maintenant': '2026-11-11T18:00:00+01:00', 'titre': 'Une semaine après : une révision réussie, une rechute, trois questions d\'objectif 14',
     'actions': [R('9-q2', 'ok'), R('9-q4', 'ko'), R('9-q1', 'ok'), R('9-q3', 'ok'), R('9-q5', 'ok'), R('9-q7', 'partiel'), {'type': 'seance-faite'}]},
    {'maintenant': '2026-11-12T18:00:00+01:00', 'titre': 'Le lendemain : test de passage réussi vers l\'objectif 14, un DS noté, un exercice corrigé au barème',
     'actions': [{'type': 'passage', 'fiche': 9, 'niveau': 14},
                 {'type': 'ds', 'ds': {'id': 'ds-seq', 'date': '2026-11-10', 'duree': 2, 'fiches': [9], 'objectif': 14, 'format': 'trois-jours', 'note': 12, 'cree': '2026-11-07', 'seances': []}},
                 R('9-ex1', 'partiel', 0.6)]},
    {'maintenant': '2026-12-03T18:00:00+01:00', 'titre': 'Trois semaines après : troisième révision réussie, la question sort du carnet',
     'actions': [R('9-q2', 'ok')]},
]
NOTIONS_SUIVIES = {'9': ['n4', 'n8', 'n19', 'n20']}


async def main():
    async with async_playwright() as p:
        nav = await p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}), args=['--no-sandbox'])
        ctx = await nav.new_context(locale='fr-FR', timezone_id='Europe/Paris')
        page = await ctx.new_page()
        erreurs = []
        page.on('pageerror', lambda e: erreurs.append(str(e)))
        args = {'plans': PLANS, 'quiz': QUIZ, 'passages': PASSAGES, 'faibles': FAIBLES, 'notions': {}}

        # --- démonstration ---
        await page.clock.set_fixed_time(MAINTENANT)
        await page.goto(URL, wait_until='networkidle')
        await page.wait_for_timeout(500)
        heure = await page.evaluate("() => new Date().toString()")
        assert 'Nov 13 2026 18:00' in heure, heure
        demo_etat = await page.evaluate(ETAT)
        demo = await page.evaluate(RELEVE, args)

        # --- nouvel élève ---
        await page.evaluate(NOUVEAU, PROFIL)
        nouveau_etat = await page.evaluate(ETAT)
        nouveau = await page.evaluate(RELEVE, args)

        # --- séquence ---
        await page.clock.set_fixed_time(SEQUENCE[0]['maintenant'])
        await page.evaluate(NOUVEAU, PROFIL)
        depart = await page.evaluate(ETAT)
        etapes = []
        for e in SEQUENCE:
            await page.clock.set_fixed_time(e['maintenant'])
            for a in e['actions']:
                await page.evaluate(ACTION, a)
            releve = await page.evaluate(RELEVE, {**args, 'plans': PLANS[:2], 'quiz': QUIZ[:1], 'passages': PASSAGES[1:2], 'faibles': FAIBLES[:1], 'notions': NOTIONS_SUIVIES})
            etapes.append({'titre': e['titre'], 'maintenant': e['maintenant'], 'actions': e['actions'], 'attendus': releve})
        etat_final = await page.evaluate(ETAT)
        await nav.close()
        assert not erreurs, erreurs

    doc = {
        'version': 1,
        'objet': "Cas de référence du moteur de préparation. Ils décrivent le comportement du prototype du 13 novembre 2026 ; la réécriture doit les reproduire avant toute évolution des règles.",
        'donnees': {
            'description': "Contenu figé du prototype (export du 13 novembre 2026). Un autre contenu donne d'autres tirages : les tests du moteur lisent ces deux fichiers, pas le contenu vivant.",
            'dossier': 'reference/prototype/site/data',
            'sha256': {'fiches.json': empreinte('fiches.json'), 'quiz.json': empreinte('quiz.json')},
        },
        'fuseau': 'Europe/Paris',
        'conventions': {
            'cle': "« <fiche>-q<numéro> » pour une question, « <fiche>-ex<numéro> » pour un exercice, « quiz:<identifiant> » pour une question de quiz",
            'resultat': "ok = 1, partiel = 0,5, ko = 0 ; un exercice corrigé au barème porte son propre score entre 0 et 1",
            'jour': 'AAAA-MM-JJ, heure de Paris',
            'tirages': "Les tirages suivent melange() et graineDuJour() de reference/prototype/site/js/util.js ; les reprendre à l'identique.",
            'flottants': "Comparer les taux et la note estimée avec une tolérance de 1e-9.",
        },
        'fonctions': {
            'carnet / carnetDuJour': 'moteur.js : carnet(), carnetDu()',
            'fiches[n].etats': 'etatsFiche(n) ; etatsNotions : etatNotion(n, notion)',
            'fiches[n].niveau': 'niveauFiche(n)',
            'noteEstimee': 'noteEstimee()',
            'plans': 'construitPlan(ds)',
            'quizPour': 'quizPour(fiches, n, objectif, graine)',
            'questionsPassage': 'questionsPassage(fiche, niveau)',
            'pointsFaibles': 'pointsFaibles(fiches, objectif, n)',
            'seanceDuJour': 'seanceDuJour(), calculée sur un état sans séance du jour',
            'actions de la séquence': 'reponse : enregistre(cle, resultat, score) ; seance-faite : marqueSeanceFaite() ; vu, passage, ds : écriture directe dans l\'état',
        },
        'scenarios': [
            {'nom': 'demo', 'description': "L'élève de démonstration : quatre chapitres vus, deux DS notés, un DS dans six jours préparé sur une semaine.", 'maintenant': MAINTENANT, 'etat': demo_etat, 'attendus': demo},
            {'nom': 'nouveau', 'description': 'Un nouvel élève en offre gratuite, sans aucune réponse.', 'maintenant': MAINTENANT, 'etat': nouveau_etat, 'attendus': nouveau},
        ],
        'sequence': {'description': "Un nouvel élève suivi du 2 novembre au 3 décembre 2026 : carnet d'erreurs, état des notions, niveau du chapitre 9, note estimée.",
                     'depart': depart, 'etapes': etapes, 'etat_final': etat_final},
    }
    with open(SORTIE, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print('écrit', SORTIE)

asyncio.run(main())
