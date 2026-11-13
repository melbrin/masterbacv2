# Range les 161 questions de quiz de physique-chimie (six anciennes fiches) dans les 14 nouvelles fiches.
# usage : python3 range_quiz.py <questions-physique.json> <sortie quiz.json>
import json, sys, collections
FICHE = {
    'chute_libre': 1, 'projectile': 1, 'energie': 2, 'champ_electrique': 2, 'mecanique_celeste': 3,
    'archimede': 4, 'debit': 4, 'bernoulli': 4, 'thermodynamique': 5, 'transferts_thermiques': 5,
    'diffraction': 6, 'interferences': 6, 'ondes_sonores': 6, 'ondes': 6, 'doppler': 6,
    'optique': 7, 'energie_atome': 7, 'photoelectrique': 7, 'condensateur': 8, 'circuit_RC': 8,
    'solutions': 9, 'pH': 9, 'acides_bases': 9, 'tableau_avancement': 9, 'conductivite': 10, 'titrages': 10,
    'cinetique': 11, 'radioactivite': 11, 'oxydo_reduction': 12, 'piles': 12,
    'nomenclature': 13, 'familles': 13, 'isomerie': 13, 'reactions': 13, 'protocole': 13, 'rendement': 13, 'spectroscopie': 13,
}
NIVEAU = {'basique': 10, 'classique': 14, 'expert': 18}
src = json.load(open(sys.argv[1], encoding='utf-8'))
out = []
for ch in src['chapters'].values():
    for q in ch['questions']:
        item = {k: v for k, v in q.items() if k not in ('d', 'ref')}
        item['fiche'] = FICHE[q['skill']]
        item['niveau'] = NIVEAU[q['d']]
        out.append(item)
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
c = collections.Counter(x['fiche'] for x in out)
print(len(out), 'questions ;', ', '.join('fiche %d : %d' % (k, c[k]) for k in sorted(c)))
