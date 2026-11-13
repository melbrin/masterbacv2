// Contenu exporté des fiches (outils/export_app.py) et quiz rangés par fiche.
import { pad } from './util.js';

export const D = { domaines: [], fiches: [], quiz: [], parNum: new Map(), completes: new Map() };

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Fichier introuvable : ' + url);
  return r.json();
}

export async function charge() {
  const [s, q] = await Promise.all([json('data/fiches.json'), json('data/quiz.json')]);
  D.domaines = s.domaines;
  D.fiches = s.fiches;
  D.quiz = q;
  for (const f of s.fiches) {
    f.parCle = new Map(f.items.map((i) => [i.k + i.n, i]));
    f.notionsParId = new Map(f.liste_notions.map((n) => [n.id, n]));
    D.parNum.set(f.num, f);
  }
}

export const info = (num) => D.parNum.get(Number(num));
export const cle = (num, k, n) => `${Number(num)}-${k}${n}`;
export const decoupe = (c) => {
  const m = c.match(/^(\d+)-(q|ex)(\d+)$/);
  return m ? { fiche: Number(m[1]), k: m[2], n: Number(m[3]) } : null;
};
export const leger = (num, k, n) => info(num)?.parCle.get(k + n);
export const quizFiche = (num) => D.quiz.filter((q) => q.fiche === Number(num));
export const quizParId = (id) => D.quiz.find((q) => q.id === id);

// fiche complète (énoncés, corrigés, figures), chargée à la demande
export function fiche(num) {
  num = Number(num);
  if (!D.completes.has(num)) D.completes.set(num, json(`data/fiche-${pad(num)}.json`));
  return D.completes.get(num);
}
export function trouve(f, k, n) {
  for (const t of f.themes) {
    const liste = k === 'q' ? t.questions : t.exercices;
    const item = liste.find((x) => x.num === Number(n));
    if (item) return { item, theme: t };
  }
  return null;
}
// ordre de lecture de la fiche : questions et exercices thème par thème
export function ordre(num) {
  const f = info(num);
  const out = [];
  for (const t of f.themes) {
    for (const n of t.questions) out.push(['q', n]);
    for (const n of t.exercices) out.push(['ex', n]);
  }
  return out;
}
export const nomItem = (k, n) => (k === 'q' ? `Q.${n}` : `Exercice ${n}`);
export const courtItem = (k, n) => (k === 'q' ? `Q.${n}` : `Ex. ${n}`);
