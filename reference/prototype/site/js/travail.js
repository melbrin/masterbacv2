// Zone de travail d'une question ou d'un exercice : énoncé, indices, corrigé, autocorrection au barème.
// L'élève rédige sur papier ; le téléphone donne l'énoncé, le chronomètre et la correction.
import { esc, ic, nombre, maths, toast, nbPts } from './util.js';
import { store } from './etat.js';
import { fiche, trouve, cle, nomItem } from './donnees.js';
import { enregistre, statut, derniere } from './moteur.js';
import { pillNiv, signaler, verrou } from './composants.js';
import { aLePass } from './etat.js';

// le corrigé est ouvert avec le Pass ; en gratuit : l'exercice du jour et la première question de chaque fiche
export function corrigeOuvert(num, k, n) {
  if (aLePass()) return true;
  const s = store.state.seance;
  return (k === 'q' && Number(n) === 1) || (s && s.exercice === cle(num, k, n));
}

export async function travail(num, k, n, opts = {}) {
  const f = await fiche(num);
  const t = trouve(f, k, n);
  if (!t) return { html: '<p class="vide">Cet élément n\'existe pas dans la fiche.</p>', monte() {} };
  const { item, theme } = t;
  const kk = cle(num, k, n);
  const nomsNotions = item.notions.map((id) => f.notions.find((x) => x.id === id)?.nom).filter(Boolean);
  const indice1 = item.notions_meta || nomsNotions.join(', ');
  const indice2 = item.indice_methode ? { lib: 'La méthode', html: item.indice_methode } : item.indice_piege ? { lib: 'Le piège à éviter', html: item.indice_piege } : null;
  const contexte = k === 'q' && theme.preambule && (!theme.preambule_pour?.length || theme.preambule_pour.includes(Number(n)))
    ? `<details class="contexte" open><summary>Contexte commun à plusieurs questions du thème</summary><div class="contenu">${theme.preambule}</div></details>` : '';
  const der = derniere(kk);
  const dejaFait = der ? `<span class="puce ${der.r === 'ok' ? 'puce-ok' : der.r === 'ko' ? 'puce-ko' : ''}">Dernière fois : ${{ ok: 'réussi', partiel: 'en partie', ko: 'raté' }[der.r]}${k === 'ex' ? ' (' + Math.round(der.s * 100) + ' %)' : ''}</span>` : '';

  const html = `
    ${opts.sansEnonce ? '' : `
    <div class="bandeau-q ${k === 'ex' ? 'bandeau-ex' : ''}"><span class="num">${k === 'q' ? 'Q.' + n : 'Exercice ' + n}</span><h1>${item.titre}</h1></div>
    <div class="meta">${pillNiv(item.niveau)}<span>${esc(item.type)}</span>
      ${item.points ? `<span>${nbPts(item.points)} points</span>` : ''}${item.duree ? `<span>${item.duree} min</span>` : ''}
      ${item.detail ? `<span>${esc(item.detail)}</span>` : ''}
      ${item.demande ? `<span class="puce puce-bac">${esc(item.demande)}</span>` : ''}${dejaFait}</div>
    ${item.mention ? `<p class="mention"><b>Sujet du BAC correspondant.</b> ${item.mention}</p>` : ''}
    ${contexte}
    <div class="contenu enonce" style="margin-top:14px">${item.enonce}</div>`}
    <div class="travail" id="travail">
      ${opts.chrono ? `<div class="actions">${opts.chrono}</div>` : ''}
      <div class="actions" id="boutons-indices">
        ${indice1 ? `<button class="btn btn-ligne" type="button" data-indice="1">${ic('ampoule')}Indice 1</button>` : ''}
        ${indice2 ? `<button class="btn btn-ligne" type="button" data-indice="2" ${indice1 ? 'disabled' : ''}>${ic('ampoule')}Indice 2</button>` : ''}
        <button class="btn btn-cuivre" type="button" id="voir-corrige">${ic('oeil')}${k === 'ex' ? 'Me corriger au barème' : 'Voir le corrigé'}</button>
      </div>
      <div id="indice-1" hidden><div class="indice"><span class="lib">Indice 1 · Les notions en jeu</span>${indice1}</div></div>
      ${indice2 ? `<div id="indice-2" hidden><div class="indice"><span class="lib">Indice 2 · ${indice2.lib}</span><div class="contenu">${indice2.html}</div></div></div>` : ''}
      <div id="zone-corrige"></div>
      <p class="petit discret" style="margin:4px 0 0"><button class="btn-texte" type="button" id="signaler">${ic('drapeau').replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:4px"')}Signaler une erreur</button></p>
    </div>`;

  function monte(racine) {
    racine.querySelectorAll('[data-indice]').forEach((b) => b.addEventListener('click', () => {
      const i = b.dataset.indice;
      const z = racine.querySelector('#indice-' + i);
      z.hidden = false;
      maths(z);
      b.disabled = true;
      const suivant = racine.querySelector('[data-indice="2"]');
      if (i === '1' && suivant) suivant.disabled = false;
    }));
    racine.querySelector('#signaler').addEventListener('click', () => signaler(`Fiche ${num} · ${nomItem(k, n)} · ${item.titre_txt}`));
    const bouton = racine.querySelector('#voir-corrige');
    bouton.addEventListener('click', () => {
      if (!corrigeOuvert(num, k, n)) { verrou('Ce corrigé'); return; }
      bouton.disabled = true;
      const z = racine.querySelector('#zone-corrige');
      z.innerHTML = k === 'ex' && item.etapes.length ? corrigeBareme(item) : corrigeSimple(item, k);
      maths(z);
      if (k === 'ex' && item.etapes.length) monteBareme(z, item, kk, opts);
      else monteAutoEval(z, kk, k, item, opts);
      z.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  return { html, monte, item, theme, fiche: f };
}

function corrigeSimple(item, k) {
  return `<section class="corrige" aria-label="Corrigé"><div class="tete-c">${ic('ok')}Corrigé</div><div class="corps contenu">${item.corrige}</div></section>
    <div class="auto-eval" id="auto-eval">
      <b>Compare avec ce que tu as écrit sur ta feuille.</b>
      <div class="choix" role="group" aria-label="Ton résultat">
        <button type="button" data-r="ok">Réussi<small>tout est juste</small></button>
        <button type="button" data-r="partiel">En partie<small>une erreur, un oubli</small></button>
        <button type="button" data-r="ko">Raté<small>à reprendre</small></button>
      </div>
      <p class="petit discret" id="retour-eval" style="margin:0">Une question ratée ou réussie en partie revient dans ton carnet d'erreurs dans 2 jours, puis dans une semaine, puis dans trois semaines.</p>
    </div>`;
}

function monteAutoEval(z, kk, k, item, opts) {
  z.querySelectorAll('.choix button').forEach((b) => b.addEventListener('click', () => {
    if (z.dataset.note) return;
    const r = b.dataset.r;
    z.dataset.note = r;
    b.setAttribute('aria-pressed', 'true');
    z.querySelectorAll('.choix button').forEach((x) => { x.disabled = true; });
    enregistre(kk, r);
    const msg = { ok: 'Réussi : la notion avance.', partiel: 'Noté : cette question revient dans ton carnet dans 2 jours.', ko: 'Noté : cette question revient dans ton carnet dans 2 jours. Relis la méthode du corrigé avant de passer à la suite.' }[r];
    z.querySelector('#retour-eval').textContent = msg;
    toast(msg.split(' : ')[0] === 'Réussi' ? 'Bravo, c\'est noté.' : 'C\'est noté dans ton carnet d\'erreurs.');
    opts.surResultat?.(r, r === 'ok' ? 1 : r === 'partiel' ? 0.5 : 0);
  }));
}

// barème provisoire : les points de l'exercice répartis à parts égales entre ses questions
function corrigeBareme(item) {
  const pts = item.points || item.etapes.length;
  const parEtape = pts / item.etapes.length;
  return `<section class="corrige" aria-label="Corrigé au barème">
    <div class="tete-c">${ic('ok')}Corrigé pas à pas, au barème</div>
    <div class="corps">
      ${item.intro ? `<div class="contenu">${item.intro}</div>` : ''}
      <p class="petit discret">Pour chaque question, compare avec ta copie et coche ce que tu as obtenu. Barème du prototype : ${nbPts(pts)} points répartis à parts égales, soit ${nombre(parEtape, 2)} point${parEtape >= 2 ? 's' : ''} par question ; le barème détaillé de chaque exercice est à écrire.</p>
      <div class="etape-bareme" id="etapes">
        ${item.etapes.map((e, i) => `<div class="etape" data-i="${i}" ${i ? 'hidden' : ''}>
          <div class="contenu"><div class="cs-qrappel">${e.titre}</div>${e.html}</div>
          <div class="ligne-b"><span class="petit discret">${nombre(parEtape, 2)} pt</span>
            <span class="seg" role="group" aria-label="Résultat à la question ${i + 1}">
              <button type="button" data-v="1">Trouvé</button><button type="button" data-v="0.5">En partie</button><button type="button" data-v="0">Pas trouvé</button></span></div>
        </div>`).join('')}
      </div>
      <div id="bilan-bareme" hidden></div>
    </div></section>`;
}

function monteBareme(z, item, kk, opts) {
  const pts = item.points || item.etapes.length;
  const n = item.etapes.length;
  const notes = new Array(n).fill(null);
  const etapes = [...z.querySelectorAll('.etape')];
  etapes.forEach((el, i) => el.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    el.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const premiere = notes[i] == null;
    notes[i] = Number(b.dataset.v);
    if (premiere && i + 1 < n) {
      const s = etapes[i + 1];
      s.hidden = false;
      maths(s);
      s.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (notes.every((x) => x != null)) bilan();
  })));
  function bilan() {
    const s = notes.reduce((a, b) => a + b, 0) / n;
    const total = s * pts;
    const r = s >= 0.7 ? 'ok' : s >= 0.4 ? 'partiel' : 'ko';
    const b = z.querySelector('#bilan-bareme');
    b.hidden = false;
    b.innerHTML = `<div class="auto-eval"><div class="score-final"><b class="chiffres">${nombre(total, 1)}</b><span>sur ${nbPts(pts)} points</span></div>
      <p style="margin:0">${r === 'ok' ? 'Exercice réussi.' : 'Les questions manquées reviennent dans ton carnet d\'erreurs.'} Tu peux changer une réponse avant de valider.</p>
      <div class="actions"><button class="btn btn-cuivre" type="button" id="valider-bareme">Valider ma note</button></div></div>`;
    b.querySelector('#valider-bareme').addEventListener('click', (e) => {
      enregistre(kk, r, s);
      e.target.disabled = true;
      e.target.textContent = 'Note enregistrée';
      toast(`Note enregistrée : ${nombre(total, 1)} sur ${nbPts(pts)}.`);
      opts.surResultat?.(r, s);
    });
  }
}
export { statut };
