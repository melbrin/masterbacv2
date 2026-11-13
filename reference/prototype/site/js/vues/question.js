// Une question de cours ou un exercice type BAC, avec sa zone de travail.
import { esc, ic } from '../util.js';
import { info, ordre, nomItem } from '../donnees.js';
import { entete, chronoHtml, monteChrono } from '../composants.js';
import { travail } from '../travail.js';

const p2 = (n) => String(n).padStart(2, '0');

export async function rendu(num, k, n) {
  const f = info(num);
  if (!f) return { titre: 'Introuvable', html: '<p class="vide">Cette fiche n\'existe pas.</p>' };
  const t = await travail(num, k, n, { chrono: k === 'ex' && f.parCle.get('ex' + n)?.duree ? chronoHtml(f.parCle.get('ex' + n).duree, 'chrono-ex') : '' });
  const o = ordre(num);
  const i = o.findIndex(([a, b]) => a === k && b === n);
  const prec = o[i - 1];
  const suiv = o[i + 1];
  const lien = (x, sens) => x ? `<a class="btn btn-ligne" href="#fiche-${p2(num)}-${x[0]}${x[1]}">${sens === 'p' ? ic('retour') : ''}${nomItem(x[0], x[1])}${sens === 's' ? ic('chevron') : ''}</a>` : '<span></span>';
  return {
    titre: `${nomItem(k, n)} · Fiche ${num}`,
    html: `${entete({ fil: `<a href="#cours">Cours</a> › <a href="#fiche-${p2(num)}">Fiche ${num} · ${esc(f.titre_court)}</a> › <a href="#fiche-${p2(num)}-${k === 'q' ? 'questions' : 'exercices'}">${k === 'q' ? 'Questions de cours' : 'Exercices'}</a>`, titre: '', repere: 'beta' }).replace('<h1></h1>', '')}
      ${t.html}
      <div class="actions" style="justify-content:space-between;margin-top:22px">${lien(prec, 'p')}${lien(suiv, 's')}</div>`,
    monte(v) {
      t.monte(v);
      monteChrono(v, 'chrono-ex');
    },
  };
}
