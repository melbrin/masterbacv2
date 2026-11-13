// Aujourd'hui : le cockpit de l'élève. Ce qu'il fait ce soir, ses deux échéances, sa note estimée.
import { esc, ic, jour, ecart, dateLongue, dateSimple, nombre, ajouteJours, initialeJour, toast, duree } from '../util.js';
import { store, sauve, prenom, chapitresVus, aLePass } from '../etat.js';
import { info, decoupe, leger, quizParId, nomItem } from '../donnees.js';
import { BAC, prochainDS, dsANoter, noteEstimee, seanceDuJour, carnetDu, seancesSemaine, SEANCES_CIBLE, lundi, niveauFiche, etatsFiche } from '../moteur.js';
import { repere, pillNiv, barreEtats } from '../composants.js';
import { rafraichit } from '../nav.js';

const titreFiches = (fiches) => fiches.map((n) => info(n)?.titre_court).join(', ');

export function decritItem(k) {
  if (k.startsWith('quiz:')) {
    const q = quizParId(k.slice(5));
    return q ? { lib: 'Question de quiz', titre: esc(q.q), lien: null } : null;
  }
  const d = decoupe(k);
  const i = d && leger(d.fiche, d.k, d.n);
  return i ? { lib: `Fiche ${d.fiche} · ${nomItem(d.k, d.n)}`, titre: i.titre, lien: `#fiche-${String(d.fiche).padStart(2, '0')}-${d.k}${d.n}` } : null;
}

function revoirTexte(revoir) {
  const quiz = revoir.filter((k) => k.startsWith('quiz:')).length;
  const carnet = revoir.length - quiz;
  const parts = [];
  if (carnet) parts.push(`${carnet} question${carnet > 1 ? 's' : ''} de ton carnet d'erreurs`);
  if (quiz) parts.push(`${quiz} question${quiz > 1 ? 's' : ''} de quiz${carnet ? '' : ' sur ton chapitre'}`);
  return parts.join(' et ') || 'Rien à revoir : on passe à l\'exercice';
}

export async function rendu() {
  const st = store.state;
  const auj = jour();
  const ds = prochainDS();
  const jBac = ecart(auj, BAC);
  const note = noteEstimee();
  const h = new Date().getHours();
  const salut = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
  const seance = seanceDuJour();
  const faite = st.seances.some((s) => s.date === auj);
  const ex = seance.exercice ? decritItem(seance.exercice) : null;
  const dExo = seance.exercice ? decoupe(seance.exercice) : null;
  const aRevoir = carnetDu();
  const nbSem = seancesSemaine();
  const cible = SEANCES_CIBLE[st.profil.objectif] || 4;
  const l = lundi();
  const semaine = Array.from({ length: 7 }, (_, i) => ajouteJours(l, i));
  const aNoter = dsANoter();
  const vus = chapitresVus();

  const compteurDS = ds
    ? `<div class="compteur"><div class="lib">Prochain DS</div><div class="val">J−${ecart(auj, ds.date)}</div>
        <div class="det">${esc(titreFiches(ds.fiches))}, ${dateLongue(ds.date)}</div></div>`
    : `<div class="compteur"><div class="lib">Prochain DS</div><div class="val" style="font-size:1.6rem;font-stretch:90%">Aucun</div>
        <div class="det"><a href="#ds-nouveau" style="color:#D7A983">Donne-moi la date et le chapitre</a></div></div>`;

  let dsCarte = '';
  if (ds) {
    const faites = ds.seances.filter((s) => s.faite).length;
    const prochaine = ds.seances.find((s) => !s.faite);
    dsCarte = `<a class="carte carte-lien" href="#${ds.id}">
      <div class="tete"><h2>${ic('ds').replace('<svg', '<svg style="width:20px;height:20px;vertical-align:-3px;margin-right:6px;color:var(--cuivre-texte)"')}Préparation du DS</h2><span class="puce">${faites} séance${faites > 1 ? 's' : ''} sur ${ds.seances.length}</span></div>
      <div class="barre" style="margin-bottom:10px"><i class="b-solide" style="width:${(100 * faites) / Math.max(1, ds.seances.length)}%"></i></div>
      <p style="margin:0">${prochaine ? `Prochaine séance ${prochaine.date === auj ? "aujourd'hui" : dateLongue(prochaine.date)} : <b>${esc(prochaine.titre)}</b>, ${duree(prochaine.minutes)}.` : 'Toutes les séances sont faites. Bonne chance pour le devoir.'}</p></a>`;
  }
  const noterCarte = aNoter.map((d) => `<div class="carte">
      <h2>Ton DS du ${dateSimple(d.date)} est passé</h2>
      <p class="discret">${esc(titreFiches(d.fiches))}. Ta note sert à mesurer tes progrès et à recaler ta note estimée.</p>
      <form class="actions" data-noter="${d.id}"><div class="champ" style="max-width:150px"><label for="note-${d.id}">Note sur 20</label><input id="note-${d.id}" inputmode="decimal" placeholder="13,5"></div>
      <button class="btn" type="submit" style="align-self:end">Enregistrer</button></form></div>`).join('');

  const etapes = [
    { min: 5, titre: 'À revoir', det: revoirTexte(seance.revoir) },
    { min: 15, titre: 'Un exercice sur papier', det: ex ? `${ex.lib} : ${ex.titre}` : 'Une question à ton niveau' },
    { min: 5, titre: 'La correction au barème', det: 'Tu compares ta copie au corrigé et tu notes ce que tu as obtenu.' },
  ];

  const html = `
  <section class="cockpit apparait" aria-label="Tes échéances" style="margin-top:14px">
    <div class="salut">${salut} <b>${esc(prenom())}</b>. ${faite ? 'Ta séance du jour est faite.' : ds && ecart(auj, ds.date) <= 7 ? 'Ce soir, on prépare ton DS.' : 'Voici ce qui t\'attend ce soir.'}</div>
    <div class="compteurs">${compteurDS}
      <div class="compteur"><div class="lib">Le bac</div><div class="val">J−${jBac}</div><div class="det">Épreuves de spécialité, 16 et 17 juin</div></div></div>
    ${note ? `<div class="note"><span>Note estimée en physique-chimie</span><b class="chiffres">${nombre(note.valeur, 1)}</b><span>entre ${note.bas} et ${note.haut}</span><a href="#progres" style="color:#D7A983">Comment est-elle calculée ?</a></div>`
    : '<div class="note"><span>Ta note estimée apparaît après tes premières séances.</span></div>'}
  </section>
  ${repere('coach')}
  ${!aLePass() ? `<div class="carte" style="margin-top:14px;border-color:var(--cuivre)"><b>Offre gratuite.</b> Tu as l'exercice du jour, le test de niveau et une préparation de DS offerte. <a href="#offres">Voir le Pass Bac 2027</a></div>` : ''}
  <div class="section-titre"><h2>Ta séance du jour · 25 min</h2>${seance.raison === 'ds' ? '<span class="puce puce-bleu">Elle prépare ton DS</span>' : seance.raison === 'defaut' ? '<span class="puce">Premier chapitre de l\'année</span>' : '<span class="puce">Chapitres vus en classe</span>'}</div>
  <div class="carte seance">
    <ol>${etapes.map((e, i) => `<li><span class="min">${e.min}<small>MIN</small></span><span class="quoi"><b>${i + 1}. ${e.titre}</b><span>${e.det}</span></span>
      <span>${faite ? `<span class="fait" aria-label="Fait">${ic('ok').replace('<svg', '<svg style="width:22px;height:22px"')}</span>` : ''}</span></li>`).join('')}</ol>
    <div class="actions" style="margin-top:12px">
      <a class="btn btn-cuivre" href="#seance">${ic('lecture')}${faite ? 'Revoir la séance' : seance.etape > 0 ? 'Reprendre la séance' : 'Commencer la séance'}</a>
      ${dExo ? `<a class="btn-texte" href="#fiche-${String(dExo.fiche).padStart(2, '0')}">Ouvrir la fiche ${dExo.fiche}</a>` : ''}
    </div>
  </div>
  ${noterCarte ? `<div class="pile" style="margin-top:14px">${noterCarte}</div>` : ''}
  <div class="grille-2" style="margin-top:14px">
    ${dsCarte || `<a class="carte carte-lien" href="#ds-nouveau"><h2>Tu as un DS bientôt ?</h2><p class="discret" style="margin:0">Donne la date, les chapitres et la note visée : le plan sort tout seul.</p></a>`}
    <a class="carte carte-lien" href="#carnet"><div class="tete"><h2>Carnet d'erreurs</h2><span class="puce ${aRevoir.length ? 'puce-ko' : 'puce-ok'}">${aRevoir.length} à revoir</span></div>
      <p class="discret" style="margin:0">Chaque question ratée revient deux jours, une semaine, puis trois semaines plus tard.</p></a>
  </div>
  <div class="section-titre"><h2>Ta semaine</h2><a href="#plan">Plan de l'année</a></div>
  <div class="carte">
    <p style="margin:0 0 10px"><b>${nbSem} séance${nbSem > 1 ? 's' : ''}</b> sur ${cible} prévues cette semaine pour viser ${st.profil.objectif}. Une séance sautée ne casse rien : le plan se recalcule.</p>
    <div class="regularite" role="img" aria-label="Séances faites cette semaine">${semaine.map((d) => `<span class="j ${st.seances.some((s) => s.date === d) ? 'fait' : ''} ${d === auj ? 'auj' : ''}">${initialeJour(d)}</span>`).join('')}</div>
  </div>
  <div class="section-titre"><h2>Tes chapitres vus en classe</h2><a href="#cours">Tous les cours</a></div>
  ${vus.length ? `<ul class="liste">${vus.map((n) => {
    const f = info(n); const nv = niveauFiche(n); const e = etatsFiche(n);
    return `<li><a class="ligne" href="#fiche-${String(n).padStart(2, '0')}"><span class="num">F.${n}</span>
      <span><span class="tit">${esc(f.titre_court)}</span><span class="sous">${nv.atteint ? pillNiv(nv.atteint) + ' atteint' : '<span>Niveau 10 en cours</span>'}<span>${e.acquis + e.solide} notions acquises sur ${e.total}</span></span>
      <span style="display:block;margin-top:6px;max-width:260px">${barreEtats(e)}</span></span><span class="fin">${ic('chevron')}</span></a></li>`;
  }).join('')}</ul>` : '<p class="vide">Coche dans les cours les chapitres déjà vus en classe : ta séance du jour les suivra.</p>'}
  `;
  return {
    titre: "Aujourd'hui",
    html,
    monte(v) {
      v.querySelectorAll('[data-noter]').forEach((f) => f.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = Number(f.querySelector('input').value.replace(',', '.'));
        if (!(val >= 0 && val <= 20)) { toast('Entre une note entre 0 et 20.'); return; }
        const d = store.state.ds.find((x) => x.id === f.dataset.noter);
        d.note = Math.round(val * 10) / 10;
        sauve();
        toast('Note enregistrée : ta note estimée se recale.');
        rafraichit();
      }));
    },
  };
}
