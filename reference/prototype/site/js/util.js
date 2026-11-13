// Outils communs : dates, nombres, échappement, icônes, formules, messages.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = (n) => String(n).padStart(2, '0');

// ---- dates (jours au format AAAA-MM-JJ, heure locale) ----
export function jour(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function versDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function ajouteJours(s, n) {
  const d = versDate(s);
  d.setDate(d.getDate() + n);
  return jour(d);
}
// nombre de jours de a à b (b - a)
export function ecart(a, b) {
  return Math.round((versDate(b) - versDate(a)) / 86400000);
}
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_C = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
export function dateLongue(s) {
  const d = versDate(s);
  return `${JOURS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`;
}
export function dateCourte(s) {
  const d = versDate(s);
  return `${JOURS_C[d.getDay()]} ${d.getDate()} ${MOIS_C[d.getMonth()]}`;
}
export function dateSimple(s) {
  const d = versDate(s);
  return `${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}`;
}
export function initialeJour(s) {
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][versDate(s).getDay()];
}
export function quand(s) {
  const n = ecart(jour(), s);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n === -1) return 'hier';
  if (n > 1 && n < 7) return dateLongue(s);
  return dateSimple(s);
}

// ---- nombres à la française ----
export function nombre(x, dec = 1) {
  return Number(x).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
// une durée : « 30 min », « 2 h », « 1 h 30 »
export const duree = (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') : ''}`);
// un total de points : « 5 », « 5,5 »
export const nbPts = (x) => nombre(x, Number.isInteger(Number(x)) ? 0 : 1);
export function pluriel(n, un, plusieurs) {
  return `${n} ${n > 1 ? plusieurs : un}`;
}

// ---- icônes (traits, 24 × 24) ----
const P = {
  aujourdhui: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cours: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H20"/><path d="M8 7h8M8 11h6"/>',
  ds: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  progres: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  profil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  plan: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  carnet: '<path d="M5 3h11l3 3v15H5z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  parents: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M15.5 14.6c2.8-.3 5 1.3 5.8 4.4"/>',
  offres: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  retour: '<path d="m15 6-6 6 6 6"/>',
  ok: '<path d="m5 12 5 5 9-10"/>',
  croix: '<path d="M6 6l12 12M18 6 6 18"/>',
  horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ampoule: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  drapeau: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  cadenas: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  repere: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  lecture: '<path d="M7 4v16l13-8z"/>',
  cible: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  eclair: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  envoi: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  oeil: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  papier: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h5"/>',
  medaille: '<circle cx="12" cy="14" r="6"/><path d="M8.5 3h7L14 9h-4z"/><path d="m12 11 1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 13.3l2-.3z"/>',
  maison: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
};
export function ic(nom) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[nom] || ''}</svg>`;
}

// ---- formules : rendu KaTeX des spans produits par l'export ----
const MACROS = {
  '\\cR': '\\htmlClass{c-r}{#1}',
  '\\cV': '\\htmlClass{c-v}{#1}',
  '\\cO': '\\htmlClass{c-o}{#1}',
  '\\cB': '\\htmlClass{c-b}{#1}',
  '\\lbl': '\\qquad(\\text{#1})',
};
export function maths(racine) {
  if (!racine) return;
  if (window.katex) {
    racine.querySelectorAll('span.math').forEach((el) => {
      if (el.dataset.rendu) return;
      const display = el.classList.contains('display');
      let tex = el.textContent.trim();
      const m = tex.match(/^\\\(([\s\S]*)\\\)$/) || tex.match(/^\\\[([\s\S]*)\\\]$/);
      if (m) tex = m[1];
      try {
        window.katex.render(tex, el, {
          displayMode: display, throwOnError: false, strict: 'ignore', macros: { ...MACROS },
          trust: (ctx) => ctx.command === '\\htmlClass',
        });
        el.dataset.rendu = '1';
      } catch (e) { /* la formule reste en texte */ }
    });
  }
  // un tableau large défile dans son cadre, jamais la page
  racine.querySelectorAll('.contenu table').forEach((t) => {
    if (t.parentElement.classList.contains('table-defile')) return;
    const w = document.createElement('div');
    w.className = 'table-defile';
    t.replaceWith(w);
    w.appendChild(t);
  });
}

// ---- messages ----
let minuteurToast = null;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => el.remove(), 3200);
}

// boîte de dialogue intégrée à la page (alert et confirm sont bloqués dans l'aperçu)
export function dialogue(html, monte) {
  const d = document.createElement('dialog');
  d.className = 'dlg';
  d.innerHTML = `<div class="dlg-corps">${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.querySelectorAll('[data-fermer]').forEach((b) => b.addEventListener('click', () => d.close()));
  if (monte) monte(d);
  try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
  maths(d);
  return d;
}

// tirage pseudo-aléatoire reproductible (sert à composer les quiz sans changer à chaque affichage)
export function melange(liste, graine = 1) {
  const a = liste.slice();
  let s = graine >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function graineDuJour(extra = '') {
  let h = 2166136261;
  for (const c of jour() + extra) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
