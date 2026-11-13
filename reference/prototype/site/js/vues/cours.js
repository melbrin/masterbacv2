// Les cours de l'année : les 14 fiches, puis chaque fiche en onglets.
import { esc, ic, toast } from '../util.js';
import { store, sauve, chapitresVus, aLePass } from '../etat.js';
import { D, info, fiche as ficheComplete, cle, quizFiche } from '../donnees.js';
import { niveauFiche, etatsFiche, etatNotion, NOM_ETAT, statut, carnet } from '../moteur.js';
import { entete, pillNiv, barreEtats, legendeEtats, ligneItem, repere } from '../composants.js';
import { rafraichit } from '../nav.js';

const p2 = (n) => String(n).padStart(2, '0');

export async function liste() {
  const st = store.state;
  const vus = new Set(chapitresVus());
  const filtre = st.filtreCours || 'toutes';
  const total = D.fiches.reduce((a, f) => ({ q: a.q + f.questions, e: a.e + f.exercices, fig: a.fig + f.figures }), { q: 0, e: 0, fig: 0 });
  const enCarnet = (num) => carnet().filter((c) => c.k.startsWith(num + '-')).length;
  const groupes = D.domaines.map((d) => {
    const fiches = d.fiches.map(info).filter((f) => f && (filtre === 'toutes' || vus.has(f.num)));
    if (!fiches.length) return '';
    return `<h2 class="groupe-titre">${esc(d.nom)}</h2><ul class="liste">${fiches.map((f) => {
      const nv = niveauFiche(f.num);
      const e = etatsFiche(f.num);
      const c = enCarnet(f.num);
      return `<li><a class="ligne" href="#fiche-${p2(f.num)}"><span class="num">F.${f.num}</span>
        <span><span class="tit">${esc(f.titre_court)}</span>
          <span class="sous"><span>${f.questions} questions · ${f.exercices} exercices</span>${vus.has(f.num) ? '<span class="puce puce-bleu">Vu en classe</span>' : ''}${nv.atteint ? pillNiv(nv.atteint) : ''}${c ? `<span class="puce puce-ko">${c} à revoir</span>` : ''}</span>
          ${e['a-voir'] < e.total ? `<span style="display:block;margin-top:8px;max-width:300px">${barreEtats(e)}</span>` : ''}</span>
        <span class="fin">${ic('chevron')}</span></a></li>`;
    }).join('')}</ul>`;
  }).join('');
  return {
    titre: 'Cours',
    html: `${entete({ surtitre: 'Physique-chimie · terminale', titre: 'Les cours de l\'année', sous: `Les 14 fiches, à jour des BAC 2025 et 2026 : ${total.q} questions de cours, ${total.e} exercices corrigés et ${total.fig} figures, lisibles sur téléphone. Les maths arrivent dès que leurs fiches sont à jour.`, repere: 'beta' })}
      <div class="filtres" role="group" aria-label="Filtrer les fiches">
        <button type="button" data-f="toutes" aria-pressed="${filtre === 'toutes'}">Toutes les fiches</button>
        <button type="button" data-f="vues" aria-pressed="${filtre === 'vues'}">Vues en classe (${vus.size})</button></div>
      ${groupes || '<p class="vide">Aucune fiche cochée « vue en classe » pour l\'instant.</p>'}
      ${legendeEtats}`,
    monte(v) {
      v.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { store.state.filtreCours = b.dataset.f; sauve(); rafraichit(); }));
    },
  };
}

const ONGLETS = [['essentiel', "L'essentiel"], ['questions', 'Questions de cours'], ['exercices', 'Exercices type BAC'], ['quiz', 'Quiz'], ['tombe', 'Tombé au BAC'], ['notions', 'Notions']];

export async function fiche(num, onglet) {
  const st = store.state;
  const f = info(num);
  if (!f) return { titre: 'Fiche', html: '<p class="vide">Cette fiche n\'existe pas.</p>' };
  const full = await ficheComplete(num);
  const nv = niveauFiche(num);
  const e = etatsFiche(num);
  const vu = !!st.vuEnClasse[num];
  const objectif = st.profil.objectif || 14;
  const filtreNiv = st.filtreNiveau || 0;

  let corps = '';
  if (onglet === 'essentiel') {
    corps = `<div class="carte contenu">${full.essentiel}</div>`;
  } else if (onglet === 'questions') {
    corps = `<div class="filtres" role="group" aria-label="Filtrer par niveau">${[0, 10, 14, 18].map((L) => `<button type="button" data-niv="${L}" aria-pressed="${filtreNiv === L}">${L ? 'Objectif ' + L : 'Tous les niveaux'}</button>`).join('')}</div>
      ${f.themes.map((t) => {
        const items = t.questions.map((n) => f.parCle.get('q' + n)).filter((i) => !filtreNiv || i.niveau === filtreNiv);
        if (!items.length) return '';
        return `<h2 class="groupe-titre">Thème ${t.num} · ${esc(t.titre)}</h2><ul class="liste">${items.map((i) => ligneItem(num, i)).join('')}</ul>`;
      }).join('')}`;
  } else if (onglet === 'exercices') {
    const ex = f.items.filter((i) => i.k === 'ex');
    corps = `<p class="discret">Des exercices de type BAC, chronométrés, avec leur barème. Ceux construits d'après un sujet récent indiquent le sujet correspondant.</p>
      <ul class="liste">${ex.map((i) => ligneItem(num, i)).join('')}</ul>`;
  } else if (onglet === 'quiz') {
    const qz = quizFiche(num);
    const parNiv = [10, 14, 18].map((L) => qz.filter((q) => q.niveau === L).length);
    const faits = qz.filter((q) => statut('quiz:' + q.id)).length;
    corps = qz.length ? `<div class="carte"><h2>Quiz du chapitre</h2>
        <p>${qz.length} questions rangées dans cette fiche : ${parNiv[0]} d'objectif 10, ${parNiv[1]} d'objectif 14, ${parNiv[2]} d'objectif 18. Tu en as déjà fait ${faits}.</p>
        <p class="discret petit">${qz.length > 10 ? 'Le quiz en tire 10' : 'Le quiz les reprend toutes'}, en commençant par celles que tu as ratées puis celles que tu n'as jamais faites. Le plan vise 40 questions par chapitre : celles-ci viennent du test en ligne actuel.</p>
        <div class="actions"><a class="btn btn-cuivre" href="#quiz-${p2(num)}">${ic('lecture')}Lancer le quiz</a></div></div>`
      : `<p class="vide">Les questions de quiz de cette fiche restent à écrire : le test en ligne actuel n'en avait pas pour les méthodes du BAC.</p>`;
  } else if (onglet === 'tombe') {
    const i = full.tombe.indexOf('<h3');
    const retenir = i >= 0 ? full.tombe.slice(i) : '';
    const it = full.tombe.indexOf('<table');
    const intro = it > 0 ? full.tombe.slice(0, it) : '';
    corps = `<div class="contenu">${intro}</div>
      <ul class="liste">${full.tombe_lignes.map((l) => `<li><div class="ligne" style="grid-template-columns:1fr"><span>
        <span class="tit">${esc(l.exercice)}</span><span class="sous"><span class="puce puce-bac">${esc(l.session)}</span></span>
        <span class="contenu petit" style="display:block;margin-top:6px">${l.notions}</span>
        <span class="sous"><span>Pour s'y préparer : ${l.refs.map(([k, n]) => `<a href="#fiche-${p2(num)}-${k}${n}">${k === 'q' ? 'Q.' + n : 'Ex.\u00a0' + n}</a>`).join(', ')}</span></span></span></div></li>`).join('')}</ul>
      <div class="carte contenu" style="margin-top:14px">${retenir}</div>`;
  } else if (onglet === 'notions') {
    corps = `<p class="discret">Chaque notion passe par quatre états : à voir, en cours, acquise, puis solide quand tu l'as réussie deux fois à une semaine d'écart.</p>
      <ul class="liste">${full.notions.map((n) => {
        const etat = etatNotion(num, f.notionsParId.get(n.id));
        const cls = { 'a-voir': '', 'en-cours': 'puce', acquis: 'puce puce-ok', solide: 'puce puce-ok' }[etat];
        return `<li><div class="ligne" style="grid-template-columns:1fr auto"><span><span class="tit">${n.nom}</span>
          <span class="sous">${n.refs.map(([k, x]) => `<a href="#fiche-${p2(num)}-${k}${x}">${k === 'q' ? 'Q.' + x : 'Ex. ' + x}</a>`).join(' · ')}</span></span>
          <span class="${cls || 'puce'}" ${etat === 'solide' ? 'style="background:var(--vert);color:var(--fond)"' : ''}>${NOM_ETAT[etat]}</span></div></li>`;
      }).join('')}</ul>`;
  }

  const niveauTxt = nv.atteint ? `${pillNiv(nv.atteint)} atteint` : '<span class="puce">Niveau 10 en cours</span>';
  const prochainTxt = nv.testDispo
    ? `<a class="btn btn-cuivre" href="#passage-${p2(num)}-${nv.prochain}">${ic('medaille')}Test de passage à l'objectif ${nv.prochain}</a>`
    : nv.prochain ? `<span class="petit discret">Prochain niveau : ${nv.prochain}. Il faut 70 % de réussite à ses questions${nv.prochain > 10 ? ', puis un test de passage de 15 minutes' : ''}.</span>` : '<span class="petit discret">Niveau le plus haut atteint.</span>';

  return {
    titre: `Fiche ${num}`,
    html: `${entete({
      fil: `<a href="#cours">Cours</a> › <span>${esc(f.domaine)}</span>`,
      surtitre: `Fiche ${num} · physique-chimie`,
      titre: esc(f.titre),
      repere: 'beta',
    })}
      <div class="carte" style="display:grid;gap:10px">
        <div class="actions" style="justify-content:space-between">
          <label class="case" style="padding:0;align-items:center"><span class="inter"><input type="checkbox" id="vu" ${vu ? 'checked' : ''}><span></span></span><span><b>Vu en classe</b><br><span class="petit discret">Ta séance du jour et ton plan suivent la progression de ton professeur.</span></span></label>
        </div>
        <div class="actions">${niveauTxt}<span class="petit discret">${e.acquis + e.solide} notions acquises sur ${e.total}</span></div>
        <div>${barreEtats(e)}</div>
        <div class="actions">${prochainTxt}</div>
      </div>
      <nav class="onglets" aria-label="Parties de la fiche">${ONGLETS.map(([id, nom]) => `<a href="#fiche-${p2(num)}${id === 'essentiel' ? '' : '-' + id}" ${id === onglet ? 'aria-current="page"' : ''}>${nom}</a>`).join('')}</nav>
      ${corps}`,
    monte(v) {
      v.querySelector('#vu').addEventListener('change', (ev) => {
        store.state.vuEnClasse[num] = ev.target.checked;
        // la séance du jour se recalcule, sauf si elle est déjà commencée
        if (!store.state.seance?.faite && !store.state.seance?.etape) store.state.seance = null;
        sauve();
        toast(ev.target.checked ? 'Chapitre ajouté à ta progression.' : 'Chapitre retiré de ta progression.');
      });
      v.querySelectorAll('[data-niv]').forEach((b) => b.addEventListener('click', () => { store.state.filtreNiveau = Number(b.dataset.niv); sauve(); rafraichit(); }));
    },
  };
}
