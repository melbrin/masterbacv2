// État de l'élève, gardé dans le navigateur (prototype : pas de serveur ni de compte réel).
// Le profil de démonstration est recalculé autour de la date du jour pour que l'application paraisse vivante.
import { jour, ajouteJours, versDate } from './util.js';
import { D, info, cle, quizFiche } from './donnees.js';

const CLE = 'masterbac-prototype-v1';
export const store = { state: null };

function lit() {
  try { const s = localStorage.getItem(CLE); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
export function sauve() {
  try { localStorage.setItem(CLE, JSON.stringify(store.state)); } catch (e) { /* stockage indisponible : l'état reste en mémoire */ }
}
export function init() {
  const s = lit();
  store.state = s && s.version === 1 ? s : etatDemo();
  sauve();
  appliqueTheme();
}
export function remet(nouvelEtat) {
  store.state = nouvelEtat;
  sauve();
  appliqueTheme();
}
export function appliqueTheme() {
  const t = store.state?.reglages?.theme || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

const base = () => ({
  version: 1, mode: 'demo', profil: {}, reglages: { theme: 'auto', reperes: true },
  vuEnClasse: {}, tentatives: {}, carnet: {}, passages: {}, ds: [], seances: [], seance: null, signalements: [], test: null,
});

// horodatage d'une tentative faite il y a n jours, en soirée
function ilYa(n, heure = 18) {
  const d = versDate(ajouteJours(jour(), -n));
  d.setHours(heure, 30, 0, 0);
  return d.getTime();
}
const S = { ok: 1, partiel: 0.5, ko: 0 };
export const INTERVALLES = [2, 7, 21];

// rejoue les tentatives dans l'ordre pour reconstruire le carnet d'erreurs (révisions à 2 jours, 1 semaine, 3 semaines)
export function recalculeCarnet(st) {
  const ev = [];
  for (const [k, liste] of Object.entries(st.tentatives)) for (const a of liste) ev.push({ k, ...a });
  ev.sort((a, b) => a.t - b.t);
  const carnet = {};
  for (const e of ev) {
    const j = jour(new Date(e.t));
    const c = carnet[e.k];
    if (e.r === 'ok') {
      if (c) {
        c.step += 1;
        if (c.step >= INTERVALLES.length) delete carnet[e.k];
        else c.due = ajouteJours(j, INTERVALLES[c.step]);
      }
    } else carnet[e.k] = { due: ajouteJours(j, INTERVALLES[0]), step: 0 };
  }
  st.carnet = carnet;
}

export function etatDemo() {
  const st = base();
  const auj = jour();
  st.profil = {
    prenom: 'Inès', classe: 'Terminale', specialites: ['Physique-chimie', 'Mathématiques'], objectif: 14,
    email: 'ines.demo@exemple.fr', emailParent: 'parent.ines@exemple.fr', offre: 'pass', moins15: false,
  };
  st.vuEnClasse = { 1: true, 3: true, 9: true, 11: true };
  const t = (fiche, k, n, jours, r) => {
    (st.tentatives[cle(fiche, k, n)] ||= []).push({ t: ilYa(jours), r, s: S[r] });
  };
  // mécanique : chute libre (fiche 1) ; les erreurs anciennes ont déjà été revues
  [[1, 21, 'ok'], [2, 21, 'ok'], [3, 20, 'ok'], [4, 20, 'partiel'], [5, 18, 'ok'], [4, 18, 'ok'], [6, 18, 'ok'], [7, 17, 'ko'], [7, 15, 'partiel'],
   [8, 16, 'ok'], [9, 14, 'ok'], [10, 14, 'ok'], [11, 13, 'ok'], [1, 11, 'ok'], [4, 11, 'ok'], [12, 8, 'ok'], [7, 4, 'partiel']]
    .forEach(([n, j, r]) => t(1, 'q', n, j, r));
  (st.tentatives[cle(1, 'ex', 1)] ||= []).push({ t: ilYa(12), r: 'ok', s: 0.78 });
  // gravitation (fiche 3)
  [[1, 10, 'ok'], [2, 10, 'ok'], [3, 9, 'partiel'], [4, 9, 'ok'], [5, 7, 'ko'], [6, 7, 'ok'], [3, 7, 'ok'], [5, 5, 'ok']].forEach(([n, j, r]) => t(3, 'q', n, j, r));
  // cinétique (fiche 11), validée à l'objectif 14 par un test de passage
  [[1, 12, 'ok'], [2, 12, 'ok'], [3, 11, 'ok'], [4, 11, 'partiel'], [5, 10, 'ok'], [4, 9, 'ok'], [4, 2, 'ok']].forEach(([n, j, r]) => t(11, 'q', n, j, r));
  st.passages[11] = { 14: ilYa(8, 20) };
  // acides et bases (fiche 9), le chapitre du prochain DS
  [[1, 6, 'ok'], [2, 6, 'ok'], [3, 5, 'partiel'], [4, 5, 'ok'], [6, 3, 'ko'], [8, 2, 'ok'], [9, 2, 'ok'], [10, 1, 'ok'], [12, 1, 'ko']]
    .forEach(([n, j, r]) => t(9, 'q', n, j, r));
  // quiz déjà faits
  quizFiche(9).slice(0, 7).forEach((q, i) => (st.tentatives['quiz:' + q.id] ||= []).push({ t: ilYa(2, 19), r: [0, 3].includes(i) ? 'ko' : 'ok', s: [0, 3].includes(i) ? 0 : 1 }));
  quizFiche(1).slice(0, 4).forEach((q) => (st.tentatives['quiz:' + q.id] ||= []).push({ t: ilYa(15, 19), r: 'ok', s: 1 }));
  quizFiche(11).slice(0, 6).forEach((q) => (st.tentatives['quiz:' + q.id] ||= []).push({ t: ilYa(10, 19), r: 'ok', s: 1 }));
  recalculeCarnet(st);
  // séances du jour faites (régularité)
  st.seances = [1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 15, 16, 19, 20, 22, 23].map((n) => ({ date: ajouteJours(auj, -n), minutes: 25 }));
  // les DS : deux passés, notés, et le prochain, jeudi en général, avec sa préparation en cours
  st.ds = [
    { id: 'ds-a', date: ajouteJours(auj, -23), duree: 2, fiches: [1], objectif: 14, format: 'trois-jours', note: 11.5, cree: ajouteJours(auj, -27), seances: [] },
    { id: 'ds-b', date: ajouteJours(auj, -9), duree: 1, fiches: [11], objectif: 14, format: 'express', note: 13.5, cree: ajouteJours(auj, -10), seances: [] },
  ];
  st.dsAPreparer = { id: 'ds-c', date: ajouteJours(auj, 6), duree: 2, fiches: [9], objectif: 14, cree: ajouteJours(auj, -1) };
  return st;
}

export function etatNouveau(profil, test) {
  const st = base();
  st.mode = 'nouveau';
  st.profil = { offre: 'gratuit', dsOffertes: 1, ...profil };
  st.reglages = { ...store.state.reglages };
  st.test = test || null;
  if (test) {
    for (const r of test.reponses) (st.tentatives['quiz:' + r.id] ||= []).push({ t: r.t, r: r.ok ? 'ok' : 'ko', s: r.ok ? 1 : 0 });
    recalculeCarnet(st);
  }
  return st;
}

export function prenom() {
  return store.state.profil.prenom || 'toi';
}
export function chapitresVus() {
  return Object.keys(store.state.vuEnClasse).filter((k) => store.state.vuEnClasse[k]).map(Number).filter((n) => info(n));
}
export function aLePass() {
  return ['pass', 'pack', 'mensuel'].includes(store.state.profil.offre);
}
export { D };
