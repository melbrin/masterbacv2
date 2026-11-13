// Progrès : la note estimée et sa fourchette, la régularité, le niveau de chaque chapitre ; et le carnet d'erreurs.
import { esc, ic, jour, ajouteJours, dateSimple, dateCourte, nombre, quand, initialeJour } from '../util.js';
import { store, chapitresVus } from '../etat.js';
import { D, info, decoupe, leger, quizParId, nomItem } from '../donnees.js';
import { noteEstimee, niveauFiche, etatsFiche, carnet, carnetDu, lundi } from '../moteur.js';
import { entete, pillNiv, barreEtats, legendeEtats } from '../composants.js';

const p2 = (n) => String(n).padStart(2, '0');
// 0 ou 1 : singulier
const accord = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function graphe(note) {
  const ds = store.state.ds.filter((d) => d.note != null).sort((a, b) => a.date.localeCompare(b.date));
  const pts = ds.map((d) => ({ x: d.date, y: d.note, lib: dateSimple(d.date), court: dateCourte(d.date).split(' ').slice(1).join(' '), type: 'ds' }));
  if (note) pts.push({ x: jour(), y: note.valeur, bas: note.bas, haut: note.haut, lib: "aujourd'hui", type: 'est' });
  if (!pts.length) return '<p class="discret">Les notes de DS que tu saisis apparaîtront ici.</p>';
  // sur téléphone, un cadre plus étroit garde le texte à sa taille réelle
  const etroit = window.matchMedia('(max-width: 640px)').matches;
  const W = etroit ? 330 : 560, H = etroit ? 190 : 210, g = 30, d = 12, hBas = 30, hHaut = 14;
  const ymin = 6, ymax = 20;
  const t0 = new Date(pts[0].x).getTime(), t1 = new Date(pts[pts.length - 1].x).getTime();
  const X = (x) => (pts.length === 1 ? (g + W - d) / 2 : g + 14 + ((new Date(x).getTime() - t0) / (t1 - t0 || 1)) * (W - g - d - 44));
  const ancre = (x) => (x < g + 50 ? 'start' : x > W - d - 50 ? 'end' : 'middle');
  const decale = (x) => (x < g + 50 ? x - 6 : x > W - d - 50 ? x + 6 : x);
  const Y = (y) => hHaut + (1 - (y - ymin) / (ymax - ymin)) * (H - hHaut - hBas);
  const lignes = [10, 14, 18].map((v) => `<line class="axe" x1="${g}" x2="${W - d}" y1="${Y(v)}" y2="${Y(v)}" stroke-dasharray="3 4"/><text class="lib" x="${g - 8}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const dsPts = pts.filter((p) => p.type === 'ds');
  const chemin = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const est = pts.find((p) => p.type === 'est');
  return `<svg class="graphe" viewBox="0 0 ${W} ${H}" role="img" aria-label="Notes de DS et note estimée sur 20">
    ${lignes}
    <path class="courbe" d="${chemin}" stroke-dasharray="${est ? '0' : '0'}"/>
    ${est ? `<line x1="${X(est.x)}" x2="${X(est.x)}" y1="${Y(est.haut)}" y2="${Y(est.bas)}" stroke="var(--cuivre)" stroke-width="10" stroke-linecap="round" opacity=".35"/>` : ''}
    ${dsPts.map((p) => `<circle class="pt" cx="${X(p.x)}" cy="${Y(p.y)}" r="5"/><text class="val" x="${X(p.x)}" y="${Y(p.y) - 11}" text-anchor="middle">${nombre(p.y, 1)}</text><text class="lib" x="${decale(X(p.x))}" y="${H - 10}" text-anchor="${ancre(X(p.x))}">${etroit ? 'DS ' + p.court : 'DS du ' + p.lib}</text>`).join('')}
    ${est ? `<circle class="pt-fin" cx="${X(est.x)}" cy="${Y(est.y)}" r="6"/><text class="val" x="${X(est.x) - 10}" y="${Y(est.y) + 4}" text-anchor="end">${nombre(est.y, 1)}</text><text class="lib" x="${decale(X(est.x))}" y="${H - 10}" text-anchor="${ancre(X(est.x))}">estimée</text>` : ''}
  </svg>`;
}

export async function rendu() {
  const st = store.state;
  const note = noteEstimee();
  const vus = chapitresVus();
  const auj = jour();
  const debut = ajouteJours(lundi(), -21);
  const jours = Array.from({ length: 28 }, (_, i) => ajouteJours(debut, i));
  const total28 = jours.filter((j) => st.seances.some((s) => s.date === j)).length;
  const ordre = [...D.fiches].sort((a, b) => (vus.includes(b.num) ? 1 : 0) - (vus.includes(a.num) ? 1 : 0) || a.num - b.num);
  const tests = vus.map((n) => ({ n, nv: niveauFiche(n) })).filter((x) => x.nv.testDispo);
  return {
    titre: 'Progrès',
    html: `${entete({ surtitre: 'Progrès', titre: 'Où tu en es', repere: 'coach' })}
      <section class="carte">
        <div class="tete"><h2>Note estimée en physique-chimie</h2>${note ? `<span class="puce">entre ${note.bas} et ${note.haut}</span>` : ''}</div>
        ${note ? `<div class="score-final"><b class="chiffres">${nombre(note.valeur, 1)}</b><span>sur 20</span></div>` : ''}
        ${graphe(note)}
        <details style="margin-top:8px"><summary class="petit" style="cursor:pointer;font-weight:700">Comment est-elle calculée ?</summary>
          <p class="petit discret" style="margin:8px 0 0">Sur chaque chapitre vu en classe, le moteur regarde tes réussites aux niveaux 10, 14 et 18${note ? ` (${note.essais} réponses sur ${note.chapitres} chapitres)` : ''}, puis il recale le résultat sur tes trois dernières notes de DS. La fourchette se resserre à mesure que tu travailles. Ce calcul est une règle écrite, pas une IA : il est le même pour tous et se vérifie.</p></details>
      </section>
      <div class="grille-2" style="margin-top:14px">
        <section class="carte"><h2>Régularité</h2><p class="petit discret">${total28} séances sur les quatre dernières semaines.</p>
          <div class="regularite">${jours.map((j) => `<span class="j ${st.seances.some((s) => s.date === j) ? 'fait' : ''} ${j === auj ? 'auj' : ''}" title="${dateCourte(j)}">${initialeJour(j)}</span>`).join('')}</div></section>
        <section class="carte"><h2>Carnet d'erreurs</h2><p>${carnetDu().length} question${carnetDu().length > 1 ? 's' : ''} à revoir aujourd'hui, ${carnet().length} en tout.</p>
          <a class="btn btn-ligne" href="#carnet">${ic('carnet')}Ouvrir le carnet</a></section>
      </div>
      ${tests.length ? `<div class="section-titre"><h2>Tests de passage disponibles</h2></div><ul class="liste">${tests.map(({ n, nv }) => `<li><a class="ligne" href="#passage-${p2(n)}-${nv.prochain}"><span class="num">F.${n}</span><span><span class="tit">${esc(info(n).titre_court)} : passer à l'objectif ${nv.prochain}</span><span class="sous"><span>5 questions, 15 minutes, 70 % pour valider</span></span></span><span class="fin">${ic('chevron')}</span></a></li>`).join('')}</ul>` : ''}
      <div class="section-titre"><h2>Chapitre par chapitre</h2></div>
      <ul class="liste">${ordre.map((f) => {
        const nv = niveauFiche(f.num);
        const e = etatsFiche(f.num);
        return `<li><a class="ligne" href="#fiche-${p2(f.num)}-notions"><span class="num">F.${f.num}</span>
          <span><span class="tit">${esc(f.titre_court)}</span><span class="sous">${vus.includes(f.num) ? '<span class="puce puce-bleu">Vu en classe</span>' : ''}${nv.atteint ? pillNiv(nv.atteint) + ' atteint' : ''}<span>${e.solide + e.acquis + e['en-cours'] ? `${accord(e.solide, 'solide')}, ${accord(e.acquis, 'acquise')}, ${e['en-cours']} en cours sur ${e.total}` : `${e.total} notions, pas encore commencé`}</span></span>
          <span style="display:block;margin-top:8px;max-width:320px">${barreEtats(e)}</span></span><span class="fin">${ic('chevron')}</span></a></li>`;
      }).join('')}</ul>
      ${legendeEtats}`,
  };
}

function ligneCarnet(c) {
  if (c.k.startsWith('quiz:')) {
    const q = quizParId(c.k.slice(5));
    return `<li><div class="ligne"><span class="num">${ic('eclair')}</span><span><span class="tit">${esc(q?.q || '')}</span><span class="sous"><span>Quiz · fiche ${q?.fiche}</span>${pillNiv(q?.niveau || 10)}<span>revient ${quand(c.due)}</span></span></span><span class="fin"></span></div></li>`;
  }
  const d = decoupe(c.k);
  const i = d && leger(d.fiche, d.k, d.n);
  if (!i) return '';
  return `<li><a class="ligne" href="#fiche-${p2(d.fiche)}-${d.k}${d.n}"><span class="num">${d.k === 'q' ? 'Q.' + d.n : 'Ex. ' + d.n}</span>
    <span><span class="tit">${i.titre}</span><span class="sous"><span>Fiche ${d.fiche} · ${esc(info(d.fiche).titre_court)}</span>${pillNiv(i.niveau)}<span>${c.due <= jour() ? 'à revoir aujourd\'hui' : 'revient ' + quand(c.due)}</span><span>révision ${c.step + 1} sur 3</span></span></span>
    <span class="fin">${ic('chevron')}</span></a></li>`;
}

export async function carnet_() { return carnetVue(); }
export async function carnetVue() {
  const auj = jour();
  const tout = carnet();
  const du = tout.filter((c) => c.due <= auj);
  const plusTard = tout.filter((c) => c.due > auj);
  const quizDus = du.filter((c) => c.k.startsWith('quiz:')).length;
  return {
    titre: "Carnet d'erreurs",
    html: `${entete({ surtitre: "Carnet d'erreurs", titre: `${du.length} question${du.length > 1 ? 's' : ''} à revoir aujourd'hui`, sous: 'Chaque question ratée revient deux jours plus tard, puis une semaine, puis trois semaines. Réussie trois fois de suite, elle sort du carnet.', repere: 'beta' })}
      ${quizDus ? `<div class="actions" style="margin-bottom:14px"><a class="btn btn-cuivre" href="#revision">${ic('eclair')}Revoir les ${quizDus} questions de quiz</a></div>` : ''}
      ${du.length ? `<ul class="liste">${du.map(ligneCarnet).join('')}</ul>` : '<p class="vide">Rien à revoir aujourd\'hui.</p>'}
      ${plusTard.length ? `<div class="section-titre"><h2>Plus tard</h2><span class="petit discret">${plusTard.length} questions</span></div><ul class="liste">${plusTard.map(ligneCarnet).join('')}</ul>` : ''}`,
  };
}
export { carnetVue as carnet };
