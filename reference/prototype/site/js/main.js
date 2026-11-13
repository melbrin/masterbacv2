// Coquille de l'application et aiguillage des écrans (adresse après le #, en lettres, chiffres et tirets).
import { esc, ic, maths, jour } from './util.js';
import { charge } from './donnees.js';
import { store, init, sauve, remet, etatDemo } from './etat.js';
import { construitPlan } from './moteur.js';
import { nettoie } from './composants.js';
import * as A from './vues/aujourdhui.js';
import * as S from './vues/seance.js';
import * as C from './vues/cours.js';
import * as Q from './vues/question.js';
import * as Z from './vues/quizvue.js';
import * as DS from './vues/ds.js';
import * as P from './vues/plan.js';
import * as G from './vues/progres.js';
import * as PA from './vues/parents.js';
import * as O from './vues/offres.js';
import * as PR from './vues/profil.js';
import * as AC from './vues/accueil.js';

const NAV = [
  { id: 'aujourdhui', nom: "Aujourd'hui", icone: 'aujourdhui', bas: true },
  { id: 'cours', nom: 'Cours', icone: 'cours', bas: true },
  { id: 'ds', nom: 'Mode DS', court: 'DS', icone: 'ds', bas: true },
  { id: 'plan', nom: "Plan de l'année", icone: 'plan' },
  { id: 'progres', nom: 'Progrès', icone: 'progres', bas: true },
  { id: 'carnet', nom: "Carnet d'erreurs", icone: 'carnet' },
  { id: 'parents', nom: 'Page parents', icone: 'parents' },
  { id: 'offres', nom: 'Offres', icone: 'offres' },
  { id: 'profil', nom: 'Profil', icone: 'profil', bas: true },
];

// table des écrans : motif de l'adresse -> écran
const ROUTES = [
  [/^$|^aujourdhui$/, (m) => A.rendu(), 'aujourdhui'],
  [/^seance$/, () => S.rendu(), 'aujourdhui'],
  [/^cours$/, () => C.liste(), 'cours'],
  [/^fiche-(\d{2})(?:-(essentiel|questions|exercices|quiz|tombe|notions))?$/, (m) => C.fiche(Number(m[1]), m[2] || 'essentiel'), 'cours'],
  [/^fiche-(\d{2})-(q|ex)(\d+)$/, (m) => Q.rendu(Number(m[1]), m[2], Number(m[3])), 'cours'],
  [/^quiz-(\d{2})$/, (m) => Z.chapitre(Number(m[1])), 'cours'],
  [/^quiz-(ds-[a-z0-9]+)-(\d+)$/, (m) => Z.seanceDS(m[1], Number(m[2])), 'ds'],
  [/^passage-(\d{2})-(14|18)$/, (m) => Z.passage(Number(m[1]), Number(m[2])), 'progres'],
  [/^revision$/, () => Z.revision(), 'carnet'],
  [/^ds$/, () => DS.liste(), 'ds'],
  [/^ds-nouveau$/, () => DS.nouveau(), 'ds'],
  [/^(ds-[a-z0-9]+)$/, (m) => DS.plan(m[1]), 'ds'],
  [/^dsblanc-(ds-[a-z0-9]+)$/, (m) => DS.blanc(m[1]), 'ds'],
  [/^plan$/, () => P.rendu(), 'plan'],
  [/^progres$/, () => G.rendu(), 'progres'],
  [/^carnet$/, () => G.carnet(), 'carnet'],
  [/^parents$/, () => PA.rendu(), 'parents'],
  [/^offres$/, () => O.offres(), 'offres'],
  [/^paiement-(mensuel|pass|pack|stage)$/, (m) => O.paiement(m[1]), 'offres'],
  [/^profil$/, () => PR.rendu(), 'profil'],
  [/^bienvenue$/, () => AC.bienvenue(), null],
  [/^test$/, () => AC.test(), null],
  [/^compte$/, () => AC.compte(), null],
];

function coquille() {
  const app = document.getElementById('app');
  const lien = (n) => `<a href="#${n.id}" data-nav="${n.id}">${ic(n.icone)}<span>${n.court && !n.lateral ? n.nom : n.nom}</span></a>`;
  app.innerHTML = `
    <aside class="lateral" aria-label="Navigation">
      <a class="marque" href="#aujourdhui"><b>MASTERBAC</b><span>Académie de l'Élite · physique-chimie</span></a>
      <nav>${NAV.slice(0, 6).map(lien).join('')}<div class="sep"></div>${NAV.slice(6).map(lien).join('')}</nav>
      <div class="pied" id="pied-lateral"></div>
    </aside>
    <header class="barre-haut"><a class="marque" href="#aujourdhui"><b>MASTERBAC</b><span>Académie de l'Élite</span></a><span class="espace"></span>
      <a class="btn-texte" href="#plan" aria-label="Plan de l'année">${ic('plan').replace('<svg', '<svg style="width:22px;height:22px"')}</a>
      <a class="btn-texte" href="#carnet" aria-label="Carnet d'erreurs">${ic('carnet').replace('<svg', '<svg style="width:22px;height:22px"')}</a></header>
    <main class="principal" id="principal" tabindex="-1"><div class="colonne"><div class="bandeau-demo" id="bandeau-demo"></div><div id="vue"></div></div></main>
    <nav class="onglets-bas" aria-label="Navigation principale">${NAV.filter((n) => n.bas).map((n) => `<a href="#${n.id}" data-nav="${n.id}">${ic(n.icone)}<span>${n.court || n.nom}</span></a>`).join('')}</nav>`;
}

function bandeau() {
  const st = store.state;
  const b = document.getElementById('bandeau-demo');
  b.innerHTML = st.mode === 'demo'
    ? `<span>Prototype · <b>profil de démonstration</b> : ${esc(st.profil.prenom)}, terminale, objectif ${st.profil.objectif}, Pass Bac 2027</span><button type="button" data-action="nouveau">Essayer comme un nouvel élève</button>`
    : `<span>Prototype · <b>ton profil d'essai</b> : ${esc(st.profil.prenom)}, offre ${st.profil.offre === 'gratuit' ? 'gratuite' : st.profil.offre}</span><button type="button" data-action="demo">Revenir au profil de démonstration</button>`;
  b.querySelector('[data-action="nouveau"]')?.addEventListener('click', () => { location.hash = 'bienvenue'; });
  b.querySelector('[data-action="demo"]')?.addEventListener('click', () => window.dispatchEvent(new Event('mb:demo')));
  document.getElementById('pied-lateral').innerHTML = `<span>Prototype du 13 novembre 2026, contenu des 14 fiches à jour des BAC 2025 et 2026.</span>`;
}

// la préparation du DS de démonstration : construite comme si l'élève l'avait lancée hier, à J-7
export function prepareDemo(st) {
  if (st.dsAPreparer) {
    const ds = st.dsAPreparer;
    store.state = st;
    const plan = construitPlan({ ...ds, format: 'semaine' }, ds.cree);
    ds.format = plan.format;
    ds.seances = plan.seances;
    ds.note = null;
    if (ds.seances[0]) ds.seances[0].faite = true;
    st.ds.push(ds);
    delete st.dsAPreparer;
  }
  return st;
}

let rendEnCours = 0;
export async function aiguille(garde = false) {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const st = store.state;
  const vue = document.getElementById('vue');
  nettoie();
  let route = ROUTES.find(([re]) => re.test(h));
  if (!route) { location.replace('#aujourdhui'); return; }
  const m = h.match(route[0]);
  const num = ++rendEnCours;
  vue.innerHTML = '<p class="chargement">Chargement…</p>';
  let r;
  try {
    r = await route[1](m);
  } catch (e) {
    console.error(e);
    r = { titre: 'Erreur', html: `<p class="vide">Cet écran n'a pas pu s'afficher : ${esc(e.message)}</p>` };
  }
  if (num !== rendEnCours) return;
  vue.innerHTML = r.html;
  document.title = `${r.titre ? r.titre + ' · ' : ''}MasterBac`;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === route[2]) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  bandeau();
  try { r.monte?.(vue); } catch (e) { console.error(e); }
  maths(vue);
  if (!garde && !r.garderDefilement) window.scrollTo(0, 0);
}

async function demarre() {
  coquille();
  try {
    await charge();
  } catch (e) {
    document.getElementById('vue').innerHTML = `<p class="vide">Le contenu des fiches n'a pas pu être chargé : ${esc(e.message)}</p>`;
    return;
  }
  init();
  prepareDemo(store.state);
  sauve();
  window.addEventListener('hashchange', () => aiguille());
  // un écran qui change l'état demande à être redessiné sans perdre la position
  window.addEventListener('mb:rafraichir', () => aiguille(true));
  // retour au profil de démonstration, depuis le bandeau ou le profil
  window.addEventListener('mb:demo', () => {
    remet(prepareDemo(etatDemo()));
    if (location.hash === '#aujourdhui') aiguille();
    else location.hash = 'aujourdhui';
  });
  aiguille();
}
demarre();
export { jour };
