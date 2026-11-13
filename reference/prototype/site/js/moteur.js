// Moteur de préparation : des règles écrites, sans IA, prévisibles et testables.
// Il choisit la séance du jour, construit le plan d'un DS, calcule les niveaux, l'état des notions et la note estimée.
import { store, sauve, INTERVALLES, chapitresVus } from './etat.js';
import { D, info, cle, quizFiche, decoupe } from './donnees.js';
import { jour, ajouteJours, ecart, melange, graineDuJour, versDate } from './util.js';

export const BAC = '2027-06-16';            // épreuves de spécialité : 16 et 17 juin 2027
export const NIVEAUX = [10, 14, 18];
export const POIDS = { 10: 1, 14: 1.5, 18: 2 };

export const tentatives = (k) => store.state.tentatives[k] || [];
export const derniere = (k) => { const t = tentatives(k); return t[t.length - 1] || null; };
export const statut = (k) => derniere(k)?.r || null;

// une tentative : réussi, en partie ou raté ; un échec part dans le carnet d'erreurs
export function enregistre(k, r, s) {
  const st = store.state;
  (st.tentatives[k] ||= []).push({ t: Date.now(), r, s: s ?? (r === 'ok' ? 1 : r === 'partiel' ? 0.5 : 0) });
  const c = st.carnet[k];
  if (r === 'ok') {
    if (c) {
      c.step += 1;
      if (c.step >= INTERVALLES.length) delete st.carnet[k];
      else c.due = ajouteJours(jour(), INTERVALLES[c.step]);
    }
  } else st.carnet[k] = { due: ajouteJours(jour(), INTERVALLES[0]), step: 0 };
  sauve();
}

export function carnet(date = null) {
  return Object.entries(store.state.carnet)
    .filter(([, c]) => !date || c.due <= date)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([k, c]) => ({ k, ...c }));
}
export const carnetDu = () => carnet(jour());

// ---- notions : à voir, en cours, acquis, solide (réussi deux fois à une semaine d'écart) ----
export function etatNotion(num, notion) {
  const ts = [];
  for (const [k, n] of notion.refs) for (const a of tentatives(cle(num, k, n))) ts.push(a);
  if (!ts.length) return 'a-voir';
  ts.sort((a, b) => a.t - b.t);
  const taux = ts.reduce((s, a) => s + a.s, 0) / ts.length;
  const der = ts[ts.length - 1];
  if (taux >= 0.7 && der.r === 'ok') {
    const ok = ts.filter((a) => a.r === 'ok');
    if (ok.length >= 2 && ok[ok.length - 1].t - ok[0].t >= 7 * 86400000) return 'solide';
    return 'acquis';
  }
  return 'en-cours';
}
export const NOM_ETAT = { 'a-voir': 'à voir', 'en-cours': 'en cours', acquis: 'acquis', solide: 'solide' };
export function etatsFiche(num) {
  const f = info(num);
  const c = { 'a-voir': 0, 'en-cours': 0, acquis: 0, solide: 0 };
  for (const n of f.liste_notions) c[etatNotion(num, n)] += 1;
  return { ...c, total: f.liste_notions.length };
}

// ---- niveau d'un chapitre : 70 % de réussite à un niveau, puis le test de passage pour 14 et 18 ----
export function niveauFiche(num) {
  const f = info(num);
  const res = {};
  for (const L of NIVEAUX) {
    const cles = f.items.filter((i) => i.k === 'q' && i.niveau === L).map((i) => cle(num, 'q', i.n))
      .concat(quizFiche(num).filter((q) => q.niveau === L).map((q) => 'quiz:' + q.id));
    const faits = cles.filter((k) => tentatives(k).length);
    const taux = faits.length ? faits.reduce((s, k) => s + derniere(k).s, 0) / faits.length : 0;
    res[L] = { total: cles.length, faits: faits.length, taux };
  }
  const passages = store.state.passages[num] || {};
  const atteintCritere = (L) => res[L].total > 0 && res[L].faits >= Math.min(3, res[L].total) && res[L].taux >= 0.7;
  let atteint = 0;
  for (const L of NIVEAUX) {
    if (atteintCritere(L) && (L === 10 || passages[L])) atteint = L;
    else break;
  }
  const prochain = atteint === 18 ? null : atteint === 0 ? 10 : atteint + 4;
  const testDispo = !!prochain && prochain > 10 && atteintCritere(prochain) && !passages[prochain] && quizFiche(num).length >= 3;
  return { atteint, prochain, testDispo, res };
}

// ---- note estimée en physique-chimie, avec sa fourchette ----
export function noteEstimee() {
  const st = store.state;
  const vus = chapitresVus();
  let somme = 0, nb = 0, essais = 0;
  for (const num of vus) {
    const { res } = niveauFiche(num);
    if (!res[10].faits && !res[14].faits && !res[18].faits) continue;
    // ce qu'on ne sait pas encore d'un niveau se déduit prudemment du niveau d'en dessous
    const t10 = res[10].faits ? res[10].taux : 0.6;
    const t14 = res[14].faits ? res[14].taux : 0.45 * t10;
    const t18 = res[18].faits ? res[18].taux : 0.35 * t14;
    somme += 6 + 4 * t10 + 4 * t14 + 6 * t18;
    nb += 1;
    essais += res[10].faits + res[14].faits + res[18].faits;
  }
  const notes = st.ds.filter((d) => d.note != null).sort((a, b) => a.date.localeCompare(b.date)).slice(-3).map((d) => d.note);
  if (!nb && !notes.length) return null;
  let valeur = nb ? somme / nb : null;
  if (notes.length) {
    const moy = notes.reduce((s, x) => s + x, 0) / notes.length;
    valeur = valeur == null ? moy : 0.6 * valeur + 0.4 * moy;
  }
  const demi = Math.max(1, 3 - 2 * Math.min(1, essais / 60) - (notes.length ? 0.5 : 0));
  const bas = Math.max(0, Math.floor(valeur - demi));
  const haut = Math.min(20, Math.ceil(valeur + demi));
  return { valeur: Math.round(valeur * 10) / 10, bas, haut, chapitres: nb, essais, notes: notes.length };
}

// ---- DS ----
export function prochainDS() {
  const auj = jour();
  return store.state.ds.filter((d) => d.date >= auj).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}
export function dsANoter() {
  const auj = jour();
  return store.state.ds.filter((d) => d.date < auj && d.note == null);
}

export const FORMATS = {
  express: { nom: 'Express', quand: 'la veille', resume: '20 minutes : la fiche éclair du chapitre, un quiz de 10 questions au plus, les pièges classiques.' },
  'trois-jours': { nom: 'Trois jours', quand: 'à J-3', resume: '3 séances de 30 minutes : un quiz de 10 questions au plus, des exercices ciblés sur tes points faibles, un exercice type.' },
  semaine: { nom: 'Une semaine', quand: 'à J-7', resume: '5 séances, puis un DS blanc chronométré au format du devoir, et la fiche éclair la veille.' },
};
export const formatPour = (jours) => (jours <= 1 ? 'express' : jours <= 6 ? 'trois-jours' : 'semaine');

function questionsDe(fiches, objectif) {
  const out = [];
  for (const num of fiches) for (const i of info(num).items) if (i.k === 'q' && i.niveau <= objectif) out.push({ ...i, fiche: num, cle: cle(num, 'q', i.n) });
  return out;
}
// priorité : ratées, puis en partie, puis jamais faites et tombées au BAC, puis les autres jamais faites
function rangPriorite(q) {
  const s = statut(q.cle);
  if (s === 'ko') return 0;
  if (s === 'partiel') return 1;
  if (!s && q.demande) return 2;
  if (!s) return 3;
  return 4;
}
export function pointsFaibles(fiches, objectif, n, exclure = new Set()) {
  return questionsDe(fiches, objectif)
    .filter((q) => !exclure.has(q.cle) && rangPriorite(q) < 4)
    .sort((a, b) => rangPriorite(a) - rangPriorite(b) || a.niveau - b.niveau || a.n - b.n)
    .slice(0, n).map((q) => q.cle);
}
function questionsNiveau(fiches, L, n, exclure) {
  return questionsDe(fiches, L).filter((q) => q.niveau === L && !exclure.has(q.cle))
    .sort((a, b) => rangPriorite(a) - rangPriorite(b) || (b.demande ? 1 : 0) - (a.demande ? 1 : 0) || a.n - b.n)
    .slice(0, n).map((q) => q.cle);
}
function exercicePour(fiches, objectif, exclure) {
  const ex = [];
  for (const num of fiches) for (const i of info(num).items) if (i.k === 'ex') ex.push({ ...i, fiche: num, cle: cle(num, 'ex', i.n) });
  const tri = ex.filter((e) => !exclure.has(e.cle))
    .sort((a, b) => (a.niveau <= objectif ? 0 : 1) - (b.niveau <= objectif ? 0 : 1) || (tentatives(a.cle).length ? 1 : 0) - (tentatives(b.cle).length ? 1 : 0) || (a.duree || 99) - (b.duree || 99));
  return tri[0] || null;
}
export function quizPour(fiches, n, objectif, graine) {
  const tous = fiches.flatMap((num) => quizFiche(num));
  const range = (liste, g) => {
    const pas = liste.filter((q) => !tentatives('quiz:' + q.id).length);
    const rates = liste.filter((q) => statut('quiz:' + q.id) === 'ko');
    const reste = liste.filter((q) => statut('quiz:' + q.id) === 'ok');
    return [...melange(rates, g), ...melange(pas, g + 1), ...melange(reste, g + 2)];
  };
  // d'abord les questions de l'objectif ; si le chapitre en a trop peu, on complète avec le niveau au-dessus
  const dessus = NIVEAUX.filter((L) => L > objectif).flatMap((L, i) => range(tous.filter((q) => q.niveau === L), graine + 3 + i));
  return [...range(tous.filter((q) => q.niveau <= objectif), graine), ...dessus].slice(0, n).map((q) => q.id);
}
const nQuestions = (n) => `${n} question${n > 1 ? 's' : ''}`;

// le plan d'un DS, construit une fois à la création et gardé tel quel
export function construitPlan(ds, depuis = jour()) {
  const j = ecart(depuis, ds.date);
  const format = ds.format || formatPour(j);
  const F = ds.fiches;
  const obj = ds.objectif;
  const pris = new Set();
  const garde = (liste) => { liste.forEach((k) => pris.add(k)); return liste; };
  const seances = [];
  const date = (n) => { const d = ajouteJours(ds.date, -n); return d < depuis ? depuis : d; };
  const add = (n, titre, minutes, taches) => seances.push({ id: 's' + (seances.length + 1), date: date(n), titre, minutes, taches, faite: false });
  const g = graineDuJour(ds.id);
  // le quiz est tiré d'abord, pour que le titre de la séance annonce le vrai nombre de questions
  const qz = quizPour(F, 10, obj, g);
  const quiz = qz.length ? [{ type: 'quiz', ids: qz }] : [];
  const essentiel = F.map((f) => ({ type: 'essentiel', fiche: f }));
  if (format === 'express') {
    add(1, 'Fiche éclair', 20, [...essentiel, ...quiz, { type: 'pieges', fiches: F }]);
  } else if (format === 'trois-jours') {
    add(3, qz.length ? `Test de ${nQuestions(qz.length)}` : 'Le cours en une page', 30, [...essentiel, ...quiz]);
    add(2, 'Exercices ciblés sur tes points faibles', 30, [{ type: 'questions', refs: garde(pointsFaibles(F, obj, 4, pris)) }]);
    const ex = exercicePour(F, obj, pris);
    add(1, 'Un exercice type', 30, [ex ? { type: 'exercice', ref: ex.cle, minutes: ex.duree } : { type: 'questions', refs: garde(pointsFaibles(F, obj, 2, pris)) }, { type: 'pieges', fiches: F }]);
  } else {
    add(7, qz.length ? `Le cours en une page et ${nQuestions(qz.length)}` : 'Le cours en une page', 30, [...essentiel, ...quiz]);
    add(6, 'Questions de cours, objectif 10', 30, [{ type: 'questions', refs: garde(questionsNiveau(F, 10, 4, pris)) }]);
    if (obj >= 14) add(5, `Questions de cours, objectif ${obj}`, 30, [{ type: 'questions', refs: garde(questionsNiveau(F, Math.min(obj, 14), 3, pris).concat(obj === 18 ? questionsNiveau(F, 18, 1, pris) : [])) }]);
    else add(5, 'Questions de cours, deuxième passage', 30, [{ type: 'questions', refs: garde(questionsNiveau(F, 10, 4, pris)) }]);
    const ex1 = exercicePour(F, obj, pris);
    if (ex1) pris.add(ex1.cle);
    add(4, 'Exercice type BAC', ex1?.duree || 40, [ex1 ? { type: 'exercice', ref: ex1.cle, minutes: ex1.duree } : { type: 'questions', refs: garde(pointsFaibles(F, obj, 3, pris)) }]);
    add(3, 'Points faibles et carnet d\'erreurs', 30, [{ type: 'questions', refs: garde(pointsFaibles(F, obj, 3, pris)) }, { type: 'carnet' }]);
    const blanc = [];
    const ex2 = exercicePour(F, obj, pris);
    if (ex2) { blanc.push(ex2.cle); pris.add(ex2.cle); }
    if (ds.duree >= 2) { const ex3 = exercicePour(F, obj, pris); if (ex3) { blanc.push(ex3.cle); pris.add(ex3.cle); } }
    blanc.push(...garde(pointsFaibles(F, obj, ds.duree >= 2 ? 2 : 3, pris)));
    add(2, 'DS blanc chronométré', ds.duree * 60, [{ type: 'ds-blanc', minutes: ds.duree * 60, refs: blanc }]);
    add(1, 'Fiche éclair', 20, [...essentiel, { type: 'pieges', fiches: F }]);
  }
  return { format, seances };
}

// ---- séance du jour : 5 minutes à revoir, 15 minutes d'exercice sur papier, 5 minutes de correction ----
export function seanceDuJour() {
  const st = store.state;
  const auj = jour();
  if (st.seance && st.seance.date === auj) return st.seance;
  const ds = prochainDS();
  const proche = ds && ecart(auj, ds.date) <= 7;
  // sans chapitre coché, on part du premier chapitre de la progression habituelle
  const vus = chapitresVus();
  const cibles = proche ? ds.fiches : vus.length ? vus : [1];
  const obj = st.profil.objectif || 14;
  const revoir = carnetDu().slice(0, 3).map((e) => e.k);
  if (revoir.length < 3) revoir.push(...quizPour(cibles, 3 - revoir.length, obj, graineDuJour('rev')).map((id) => 'quiz:' + id));
  // l'exercice : le prochain niveau à valider du chapitre, une question pas encore réussie, de préférence tombée au BAC
  let choix = null;
  for (const num of cibles) {
    const nv = niveauFiche(num);
    const vise = Math.min(nv.prochain || obj, obj);
    const cand = questionsDe([num], vise)
      .filter((q) => statut(q.cle) !== 'ok' && !revoir.includes(q.cle))
      .sort((a, b) => (b.niveau === vise ? 1 : 0) - (a.niveau === vise ? 1 : 0) || (b.demande ? 1 : 0) - (a.demande ? 1 : 0)
        || (a.type === 'Cours' ? 1 : 0) - (b.type === 'Cours' ? 1 : 0) || a.n - b.n);
    if (cand.length) { choix = cand[0]; break; }
  }
  if (!choix) choix = questionsDe(cibles, obj)[0];
  st.seance = { date: auj, revoir, exercice: choix ? choix.cle : null, etape: 0, faite: false, raison: proche ? 'ds' : vus.length ? 'classe' : 'defaut', dsId: proche ? ds.id : null };
  sauve();
  return st.seance;
}
export function marqueSeanceFaite() {
  const st = store.state;
  const auj = jour();
  if (!st.seances.some((s) => s.date === auj)) st.seances.push({ date: auj, minutes: 25 });
  if (st.seance) st.seance.faite = true;
  sauve();
}

// ---- plan de l'année ----
export const PERIODES = [
  { id: 't1', nom: 'Premier trimestre', debut: '2026-09-01', fin: '2026-12-18', but: 'Suivre la classe et reprendre les notions de première.',
    detail: 'Chaque chapitre vu en classe passe au niveau 10, puis à ton objectif. Le mode DS prépare chaque devoir.' },
  { id: 'noel', nom: 'Vacances de Noël', debut: '2026-12-19', fin: '2027-01-03', but: 'Consolider et préparer le bac blanc.',
    detail: 'Stage de Noël en direct, révision des chapitres du trimestre, premier sujet chronométré.' },
  { id: 'hiver', nom: 'Janvier à mars', debut: '2027-01-04', fin: '2027-03-31', but: 'Le bac blanc et le dossier.',
    detail: 'Bac blanc en janvier. Vœux Parcoursup du 18 janvier au 11 mars, confirmation le 1er avril : les bulletins des deux premiers trimestres comptent.' },
  { id: 'printemps', nom: 'Vacances de printemps', debut: '2027-04-01', fin: '2027-04-30', but: 'Un premier tour complet du programme.',
    detail: 'Chaque chapitre repasse à ton niveau visé. Deuxième bac blanc en avril.' },
  { id: 'final', nom: 'Mai et juin', debut: '2027-05-01', fin: '2027-06-17', but: 'Les sujets 2025 et 2026, puis les 14 derniers jours.',
    detail: 'Bac blanc fin mai, sujets chronométrés, puis deux semaines de révision finale. Épreuves de spécialité les 16 et 17 juin.' },
];
export function periodeActuelle() {
  const auj = jour();
  return PERIODES.find((p) => auj >= p.debut && auj <= p.fin) || PERIODES[0];
}
export const SEANCES_CIBLE = { 10: 3, 14: 4, 18: 5 };
export function lundi(d = jour()) {
  const dt = versDate(d);
  const decal = (dt.getDay() + 6) % 7;
  return ajouteJours(d, -decal);
}
export function seancesSemaine() {
  const l = lundi();
  return store.state.seances.filter((s) => s.date >= l && s.date <= ajouteJours(l, 6)).length;
}

// ---- test de passage : 5 questions du niveau visé, 15 minutes ----
export function questionsPassage(num, L) {
  const pool = quizFiche(num);
  const meme = pool.filter((q) => q.niveau === L);
  const autres = pool.filter((q) => q.niveau !== L).sort((a, b) => Math.abs(a.niveau - L) - Math.abs(b.niveau - L));
  return [...melange(meme, graineDuJour('p' + num + L)), ...autres].slice(0, 5).map((q) => q.id);
}

export const toutesLesCles = () => D.fiches.flatMap((f) => f.items.map((i) => cle(f.num, i.k, i.n)));
export { decoupe };
