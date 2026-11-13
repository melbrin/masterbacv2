// Éléments d'interface partagés entre les écrans.
import { esc, ic, dialogue, toast, nombre, nbPts } from './util.js';
import { store, sauve } from './etat.js';
import { info, cle, nomItem } from './donnees.js';
import { statut } from './moteur.js';

// ---- nettoyage des minuteurs au changement d'écran ----
const nettoyages = [];
export const auNettoyage = (fn) => nettoyages.push(fn);
export function nettoie() { while (nettoyages.length) { try { nettoyages.pop()(); } catch (e) { /* rien */ } } }

// ---- repères du plan : à quelle ouverture chaque écran est prévu ----
export const REPERES = {
  existant: 'Existe déjà : le test en ligne, à faire grandir',
  beta: 'Prévu pour la bêta fermée, du 7 au 13 décembre',
  ouverture: "Prévu pour l'ouverture du 19 décembre",
  coach: 'Prévu pour le coach complet, le 15 janvier',
  fevrier: 'Prévu de février à avril',
};
export function repere(code) {
  if (!code || !store.state.reglages.reperes) return '';
  return `<span class="repere" title="Repère du plan d'implémentation">${ic('repere')}${esc(REPERES[code])}</span>`;
}

export function entete({ surtitre = '', titre = '', sous = '', fil = '', repere: rep = '' }) {
  return `<header class="entete apparait">
    ${fil ? `<nav class="fil" aria-label="Fil d'Ariane">${fil}</nav>` : ''}
    ${surtitre ? `<div class="surtitre">${surtitre}</div>` : ''}
    <h1>${titre}</h1>
    ${sous ? `<p class="sous-titre">${sous}</p>` : ''}
    ${repere(rep)}
  </header>`;
}

export const pillNiv = (n) => `<span class="niv niv-${n}">Objectif ${n}</span>`;
export const puceBac = (demande) => (demande ? `<span class="puce puce-bac" title="${esc(demande)}">Tombé au BAC</span>` : '');

export function point(st) {
  const lib = { ok: 'Réussi', partiel: 'En partie', ko: 'Raté' }[st] || 'Pas encore fait';
  return `<span class="etat ${st ? 'etat-' + st : ''}" role="img" aria-label="${lib}" title="${lib}"></span>`;
}

// une ligne de liste pour une question ou un exercice d'une fiche
export function ligneItem(num, i, { avecFiche = false } = {}) {
  const k = cle(num, i.k, i.n);
  const st = statut(k);
  const f = info(num);
  const enCarnet = store.state.carnet[k];
  const sous = [
    pillNiv(i.niveau),
    i.k === 'ex' ? `<span>${i.points ? nbPts(i.points) + ' points' : ''}${i.duree ? ' · ' + i.duree + ' min' : ''}</span>` : `<span>${esc(i.type || '')}</span>`,
    i.k === 'ex' && i.voir_bac ? `<span class="puce puce-bac">D'après le BAC</span>` : puceBac(i.demande),
    enCarnet ? '<span class="puce puce-ko">À revoir</span>' : '',
    avecFiche ? `<span>Fiche ${num} · ${esc(f.titre_court)}</span>` : '',
  ].join('');
  return `<li><a class="ligne" href="#fiche-${String(num).padStart(2, '0')}-${i.k}${i.n}">
    <span class="num">${i.k === 'q' ? 'Q.' + i.n : 'Ex. ' + i.n}</span>
    <span><span class="tit">${i.titre}</span><span class="sous">${sous}</span></span>
    <span class="fin">${point(st)}${ic('chevron')}</span></a></li>`;
}

export function barreEtats(c) {
  const t = c.total || 1;
  const w = (x) => `${(100 * x) / t}%`;
  return `<div class="barre" role="img" aria-label="${c.solide} solide${c.solide > 1 ? 's' : ''}, ${c.acquis} acquise${c.acquis > 1 ? 's' : ''}, ${c['en-cours']} en cours, ${c['a-voir']} à voir sur ${c.total} notions">
    <i class="b-solide" style="width:${w(c.solide)}"></i><i class="b-acquis" style="width:${w(c.acquis)}"></i><i class="b-cours" style="width:${w(c['en-cours'])}"></i></div>`;
}
export const legendeEtats = `<div class="legende-etats">
  <span><i style="background:var(--vert)"></i>solide</span><span><i style="background:color-mix(in srgb, var(--vert) 55%, var(--carte))"></i>acquis</span>
  <span><i style="background:var(--cuivre)"></i>en cours</span><span><i style="background:var(--carte-2);border:1px solid var(--filet)"></i>à voir</span></div>`;

// ---- chronomètre (compte à rebours) ----
export function chronoHtml(minutes, id = 'chrono') {
  return `<div class="chrono" id="${id}" data-minutes="${minutes}" role="timer" aria-live="off">
    <span class="t">${String(minutes).padStart(2, '0')}:00</span>
    <button type="button" data-chrono="go">Démarrer</button></div>`;
}
export function monteChrono(racine, id = 'chrono', surFin) {
  const el = racine.querySelector('#' + id);
  if (!el) return;
  let reste = Number(el.dataset.minutes) * 60, marche = false, minuteur = null;
  const t = el.querySelector('.t');
  const b = el.querySelector('button');
  const affiche = () => { t.textContent = `${String(Math.floor(reste / 60)).padStart(2, '0')}:${String(reste % 60).padStart(2, '0')}`; };
  b.addEventListener('click', () => {
    marche = !marche;
    b.textContent = marche ? 'Pause' : 'Reprendre';
    clearInterval(minuteur);
    if (marche) minuteur = setInterval(() => {
      reste -= 1;
      affiche();
      if (reste <= 0) { clearInterval(minuteur); b.textContent = 'Terminé'; b.disabled = true; toast('Temps écoulé : pose ton stylo.'); surFin?.(); }
    }, 1000);
  });
  auNettoyage(() => clearInterval(minuteur));
}

// ---- signaler une erreur (ne se coupe jamais, dit le plan) ----
export function signaler(contexte) {
  dialogue(`<h2>Signaler une erreur</h2>
    <p class="discret petit">${esc(contexte)}</p>
    <div class="champ"><label for="sig-ou">Où est l'erreur ?</label>
      <select id="sig-ou"><option>Dans l'énoncé</option><option>Dans le corrigé</option><option>Dans une figure</option><option>Autre</option></select></div>
    <div class="champ"><label for="sig-txt">Ce qui ne va pas</label><textarea id="sig-txt" rows="4" placeholder="Par exemple : le résultat de la ligne 3 devrait être 0,382 mol"></textarea></div>
    <div class="actions"><button class="btn btn-cuivre" type="button" id="sig-envoi">Envoyer le signalement</button><button class="btn btn-ligne" type="button" data-fermer>Annuler</button></div>`,
  (d) => d.querySelector('#sig-envoi').addEventListener('click', () => {
    store.state.signalements.push({ contexte, ou: d.querySelector('#sig-ou').value, texte: d.querySelector('#sig-txt').value, t: Date.now() });
    sauve();
    d.close();
    toast('Merci. Signalement noté : la fiche source sera corrigée puis réexportée.');
  }));
}

// ---- fenêtre « réservé au Pass » ----
export function verrou(quoi) {
  dialogue(`<h2>${esc(quoi)} fait partie du Pass</h2>
    <p>Avec l'offre gratuite, tu as le test de niveau, une préparation de DS offerte et l'exercice du jour. Le Pass Bac 2027 ouvre tous les corrigés, le mode DS sans limite, le plan de l'année et les stages en direct.</p>
    <div class="actions"><a class="btn btn-cuivre" href="#offres" data-fermer>Voir les offres</a><button class="btn btn-ligne" type="button" data-fermer>Plus tard</button></div>`);
}
export { nomItem };
