// Quiz : six types de questions repris du test en ligne (QCM, vrai ou faux, texte à trous, association, mise en ordre, lecture graphique).
import { esc, ic, melange, toast } from './util.js';
import { quizParId } from './donnees.js';
import { enregistre } from './moteur.js';
import { chronoHtml, monteChrono, pillNiv } from './composants.js';

const norme = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s·.*×]/g, '');

export function quizHtml(ids, { chrono = 0 } = {}) {
  return `<div id="quiz" data-n="${ids.length}">
    <div class="progression-q"><span id="quiz-pos">Question 1 sur ${ids.length}</span><div class="barre"><i id="quiz-barre" style="width:0%"></i></div>${chrono ? chronoHtml(chrono, 'chrono-quiz') : ''}</div>
    <div id="quiz-zone" class="carte"></div>
  </div>`;
}

export function monteQuiz(racine, ids, { surFin, enregistrer = true, graine = 7 } = {}) {
  const zone = racine.querySelector('#quiz-zone');
  const res = [];
  let i = 0;
  monteChrono(racine, 'chrono-quiz', () => fin());
  const suivant = () => {
    i += 1;
    if (i >= ids.length) fin();
    else affiche();
  };
  function note(q, ok) {
    res.push({ id: q.id, ok, t: Date.now() });
    if (enregistrer) enregistre('quiz:' + q.id, ok ? 'ok' : 'ko');
  }
  function retour(ok, texte) {
    const div = document.createElement('div');
    div.className = 'retour-quiz ' + (ok ? 'bon' : 'faux');
    div.innerHTML = `<b>${ok ? 'Bonne réponse' : 'Ce n\'est pas ça'}</b>${texte ? esc(texte) : ''}`;
    zone.appendChild(div);
    const act = document.createElement('div');
    act.className = 'actions';
    act.style.marginTop = '12px';
    act.innerHTML = `<button class="btn" type="button">${i + 1 < ids.length ? 'Question suivante' : 'Voir mon résultat'}${ic('chevron')}</button>`;
    act.querySelector('button').addEventListener('click', suivant);
    zone.appendChild(act);
    act.querySelector('button').focus({ preventScroll: true });
  }
  function affiche() {
    const q = quizParId(ids[i]);
    racine.querySelector('#quiz-pos').textContent = `Question ${i + 1} sur ${ids.length}`;
    racine.querySelector('#quiz-barre').style.width = `${(100 * i) / ids.length}%`;
    const tete = `<div class="meta" style="margin-top:0">${pillNiv(q.niveau)}<span>${{ qcm: 'QCM', vrai_faux: 'Vrai ou faux', trou: 'Texte à trous', association: 'Association', ordre: 'Mise en ordre', graphique: 'Lecture graphique' }[q.type] || ''}</span></div>`;
    if (q.type === 'qcm' || q.type === 'graphique') {
      const ordre = melange(q.o.map((_, k) => k), graine + i);
      zone.innerHTML = `${tete}<p class="quiz-q">${esc(q.q)}</p>${q.graphDesc ? `<p class="discret petit">${esc(q.graphDesc)}</p>` : ''}
        <div class="options">${ordre.map((k, j) => `<button type="button" data-k="${k}"><span class="l">${'ABCD'[j]}</span><span>${esc(q.o[k])}</span></button>`).join('')}</div>`;
      zone.querySelectorAll('.options button').forEach((b) => b.addEventListener('click', () => {
        const ok = Number(b.dataset.k) === q.c;
        zone.querySelectorAll('.options button').forEach((x) => { x.disabled = true; if (Number(x.dataset.k) === q.c) x.classList.add('bon'); });
        if (!ok) b.classList.add('faux');
        note(q, ok);
        retour(ok, ok ? '' : `La bonne réponse : ${q.o[q.c]}`);
      }));
    } else if (q.type === 'vrai_faux') {
      zone.innerHTML = `${tete}<p class="quiz-q">${esc(q.q)}</p>
        <div class="options"><button type="button" data-v="true"><span class="l">V</span><span>Vrai</span></button><button type="button" data-v="false"><span class="l">F</span><span>Faux</span></button></div>`;
      zone.querySelectorAll('.options button').forEach((b) => b.addEventListener('click', () => {
        const ok = (b.dataset.v === 'true') === q.answer;
        zone.querySelectorAll('.options button').forEach((x) => { x.disabled = true; if ((x.dataset.v === 'true') === q.answer) x.classList.add('bon'); });
        if (!ok) b.classList.add('faux');
        note(q, ok);
        retour(ok, q.explanation || '');
      }));
    } else if (q.type === 'trou') {
      zone.innerHTML = `${tete}<p class="quiz-q">${esc(q.q)}</p>
        <form class="champ" id="f-trou"><label for="rep-trou">Ta réponse</label><input id="rep-trou" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="actions"><button class="btn" type="submit">Valider</button></div></form>`;
      const f = zone.querySelector('#f-trou');
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = f.querySelector('input').value.trim();
        if (!v) return;
        const ok = [q.answer, ...(q.acceptedAnswers || [])].some((a) => norme(a) === norme(v));
        f.querySelector('input').disabled = true;
        f.querySelector('button').disabled = true;
        note(q, ok);
        retour(ok, ok ? '' : `Réponse attendue : ${q.answer}`);
      });
      f.querySelector('input').focus({ preventScroll: true });
    } else if (q.type === 'association') {
      const droites = melange(q.pairs.map((p) => p.right), graine + i);
      zone.innerHTML = `${tete}<p class="quiz-q">${esc(q.q)}</p>
        <div class="assoc">${q.pairs.map((p, j) => `<div class="paire"><label for="as-${j}">${esc(p.left)}</label>
          <select id="as-${j}"><option value="">Choisir…</option>${droites.map((r) => `<option>${esc(r)}</option>`).join('')}</select></div>`).join('')}</div>
        <div class="actions" style="margin-top:12px"><button class="btn" type="button" id="val-as">Valider</button></div>`;
      zone.querySelector('#val-as').addEventListener('click', (e) => {
        const choix = q.pairs.map((p, j) => zone.querySelector('#as-' + j).value);
        if (choix.some((c) => !c)) { toast('Associe chaque élément avant de valider.'); return; }
        const ok = q.pairs.every((p, j) => choix[j] === p.right);
        zone.querySelectorAll('select').forEach((s) => { s.disabled = true; });
        e.target.disabled = true;
        note(q, ok);
        retour(ok, ok ? '' : 'Les bonnes paires : ' + q.pairs.map((p) => `${p.left} avec ${p.right}`).join(' ; '));
      });
    } else if (q.type === 'ordre') {
      let ordre = melange(q.items.map((_, k) => k), graine + i);
      if (ordre.every((k, j) => k === j)) ordre = ordre.slice().reverse();
      const dessine = () => {
        zone.querySelector('.ordre-liste').innerHTML = ordre.map((k, j) => `<li><span>${esc(q.items[k])}</span><span class="fl">
          <button type="button" data-m="-1" data-j="${j}" aria-label="Monter" ${j === 0 ? 'disabled' : ''}>&#8593;</button>
          <button type="button" data-m="1" data-j="${j}" aria-label="Descendre" ${j === ordre.length - 1 ? 'disabled' : ''}>&#8595;</button></span></li>`).join('');
        zone.querySelectorAll('.ordre-liste [data-m]').forEach((b) => b.addEventListener('click', () => {
          const j = Number(b.dataset.j), m = Number(b.dataset.m);
          [ordre[j], ordre[j + m]] = [ordre[j + m], ordre[j]];
          dessine();
        }));
      };
      zone.innerHTML = `${tete}<p class="quiz-q">${esc(q.q)}</p><ol class="ordre-liste"></ol>
        <div class="actions" style="margin-top:12px"><button class="btn" type="button" id="val-ordre">Valider l'ordre</button></div>`;
      dessine();
      zone.querySelector('#val-ordre').addEventListener('click', (e) => {
        const ok = ordre.every((k, j) => k === j);
        zone.querySelectorAll('.ordre-liste button').forEach((b) => { b.disabled = true; });
        e.target.disabled = true;
        note(q, ok);
        retour(ok, ok ? '' : 'Le bon ordre : ' + q.items.join(', puis '));
      });
    }
  }
  function fin() {
    if (zone.dataset.fini) return;
    zone.dataset.fini = '1';
    racine.querySelector('#quiz-barre').style.width = '100%';
    surFin?.(res, zone);
  }
  if (ids.length) affiche();
  else zone.innerHTML = '<p class="vide">Pas encore de quiz pour cette fiche : les questions par notion sont à écrire.</p>';
}

export function bilanQuiz(res, ids) {
  const bons = res.filter((r) => r.ok).length;
  const rates = res.filter((r) => !r.ok).map((r) => quizParId(r.id));
  return `<div class="score-final"><b class="chiffres">${bons}/${ids.length}</b><span>bonnes réponses</span></div>
    ${rates.length > 1 ? `<p>Les ${rates.length} questions ratées reviennent dans ton carnet d'erreurs dans 2 jours.</p>` : rates.length ? '<p>La question ratée revient dans ton carnet d\'erreurs dans 2 jours.</p>' : '<p>Tout est juste.</p>'}`;
}
