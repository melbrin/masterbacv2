// Le mode DS : « Tu as DS jeudi ? Donne-moi le chapitre. » Le plan sort tout seul, en trois formats.
import { esc, ic, jour, ajouteJours, ecart, dateLongue, dateSimple, quand, toast, versDate, maths, dialogue, nbPts, duree } from '../util.js';
import { store, sauve, chapitresVus, aLePass } from '../etat.js';
import { D, info, decoupe, leger, fiche as ficheComplete, trouve, nomItem, cle } from '../donnees.js';
import { construitPlan, formatPour, FORMATS, carnetDu, statut } from '../moteur.js';
import { entete, pillNiv, point, verrou, chronoHtml, monteChrono } from '../composants.js';
import { rafraichit } from '../nav.js';

const p2 = (n) => String(n).padStart(2, '0');
const titres = (fiches) => fiches.map((n) => info(n)?.titre_court).join(', ');

function formatsHtml() {
  return `<div class="grille-2">${Object.entries(FORMATS).map(([id, f]) => `<div class="carte"><div class="tete"><h3>${f.nom}</h3><span class="puce">${f.quand}</span></div><p class="petit" style="margin:0">${f.resume}</p></div>`).join('')}</div>`;
}

export async function liste() {
  const st = store.state;
  const auj = jour();
  const avenir = st.ds.filter((d) => d.date >= auj).sort((a, b) => a.date.localeCompare(b.date));
  const passes = st.ds.filter((d) => d.date < auj).sort((a, b) => b.date.localeCompare(a.date));
  const carte = (d) => {
    const faites = d.seances.filter((s) => s.faite).length;
    return `<li><a class="ligne" href="#${d.id}"><span class="num">J−${ecart(auj, d.date)}</span>
      <span><span class="tit">${esc(titres(d.fiches))}</span><span class="sous"><span>${dateLongue(d.date)}</span><span>DS de ${d.duree} h</span><span class="puce">${FORMATS[d.format].nom}</span>${pillNiv(d.objectif)}<span>${faites}/${d.seances.length} séances faites</span></span></span>
      <span class="fin">${ic('chevron')}</span></a></li>`;
  };
  return {
    titre: 'Mode DS',
    html: `${entete({ surtitre: 'Mode DS', titre: 'Tu as un DS ? Donne la date et le chapitre.', sous: 'Le plan de révision sort tout seul, selon le temps qu\'il te reste : la veille, trois jours avant ou une semaine avant.', repere: 'beta' })}
      <div class="actions"><a class="btn btn-cuivre" href="#ds-nouveau">${ic('plus')}Préparer un DS</a>${!aLePass() ? `<span class="petit discret">Offre gratuite : ${st.profil.dsOffertes ? 'une préparation offerte' : 'préparation offerte utilisée'}</span>` : ''}</div>
      <div class="section-titre"><h2>À venir</h2></div>
      ${avenir.length ? `<ul class="liste">${avenir.map(carte).join('')}</ul>` : '<p class="vide">Aucun DS prévu.</p>'}
      ${passes.length ? `<div class="section-titre"><h2>Passés</h2></div><ul class="liste">${passes.map((d) => `<li><a class="ligne" href="#${d.id}"><span class="num">${d.note != null ? String(d.note).replace('.', ',') : '?'}</span>
        <span><span class="tit">${esc(titres(d.fiches))}</span><span class="sous"><span>${dateSimple(d.date)}</span><span class="puce">${FORMATS[d.format].nom}</span><span>${d.note != null ? 'note sur 20' : 'note à saisir'}</span></span></span><span class="fin">${ic('chevron')}</span></a></li>`).join('')}</ul>` : ''}
      <div class="section-titre"><h2>Les trois formats</h2></div>${formatsHtml()}
      <p class="petit discret" style="margin-top:12px">Après le devoir, tu saisis ta note : c'est la mesure de tes progrès, et la préparation suivante en tient compte.</p>`,
  };
}

function prochainJeudi() {
  const auj = jour();
  let d = ajouteJours(auj, 3);
  while (versDate(d).getDay() !== 4) d = ajouteJours(d, 1);
  return d;
}

export async function nouveau() {
  const st = store.state;
  const vus = new Set(chapitresVus());
  const obj = st.profil.objectif || 14;
  const groupes = D.domaines.map((d) => `<fieldset style="border:0;padding:0;margin:0 0 10px"><legend class="groupe-titre" style="margin:12px 0 6px">${esc(d.nom)}</legend>
    ${d.fiches.map((n) => info(n)).filter(Boolean).map((f) => `<label class="case"><input type="checkbox" name="fiche" value="${f.num}"><span>Fiche ${f.num} · ${esc(f.titre_court)}${vus.has(f.num) ? ' <span class="puce puce-bleu">Vu en classe</span>' : ''}</span></label>`).join('')}</fieldset>`).join('');
  return {
    titre: 'Préparer un DS',
    html: `${entete({ fil: '<a href="#ds">Mode DS</a>', surtitre: 'Préparer un DS', titre: 'Ton prochain devoir', repere: 'beta' })}
      <form class="carte pile" id="f-ds">
        <div class="grille-2">
          <div class="champ"><label for="ds-date">Date du DS</label><input type="date" id="ds-date" value="${prochainJeudi()}" min="${jour()}" required></div>
          <div class="champ"><label for="ds-duree">Durée du devoir</label><select id="ds-duree"><option value="1">1 heure</option><option value="2" selected>2 heures</option><option value="4">4 heures</option></select></div>
        </div>
        <div class="champ"><span style="font-weight:600;color:var(--encre)">Note visée</span>
          <span class="seg" role="group" aria-label="Note visée">${[10, 14, 18].map((L) => `<button type="button" data-obj="${L}" aria-pressed="${L === obj}">Viser ${L}</button>`).join('')}</span></div>
        <div><span style="font-weight:600;color:var(--encre)">Les chapitres du devoir</span>${groupes}</div>
        <div class="carte" id="apercu-format" style="background:var(--carte-2);box-shadow:none"></div>
        <div class="actions"><button class="btn btn-cuivre" type="submit">${ic('ok')}Construire mon plan</button><a class="btn btn-ligne" href="#ds">Annuler</a></div>
      </form>`,
    monte(v) {
      let objectif = obj;
      const f = v.querySelector('#f-ds');
      const apercu = () => {
        const j = ecart(jour(), f.querySelector('#ds-date').value || jour());
        const fmt = FORMATS[formatPour(j)];
        v.querySelector('#apercu-format').innerHTML = `<b>Format ${fmt.nom}</b> · le devoir est dans ${j <= 0 ? 'moins d\'un jour' : j + ' jour' + (j > 1 ? 's' : '')}.<p class="petit" style="margin:4px 0 0">${fmt.resume}</p>`;
      };
      apercu();
      f.querySelector('#ds-date').addEventListener('input', apercu);
      f.querySelectorAll('[data-obj]').forEach((b) => b.addEventListener('click', () => {
        objectif = Number(b.dataset.obj);
        f.querySelectorAll('[data-obj]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const fiches = [...f.querySelectorAll('input[name="fiche"]:checked')].map((x) => Number(x.value));
        const date = f.querySelector('#ds-date').value;
        if (!fiches.length) { toast('Coche au moins un chapitre.'); return; }
        if (!date || date < jour()) { toast('Choisis une date à venir.'); return; }
        if (!aLePass()) {
          if (!st.profil.dsOffertes) { verrou('Une nouvelle préparation de DS'); return; }
          st.profil.dsOffertes -= 1;
        }
        const ds = { id: 'ds-' + Date.now().toString(36), date, duree: Number(f.querySelector('#ds-duree').value), fiches, objectif, cree: jour(), note: null };
        const plan = construitPlan(ds);
        ds.format = plan.format;
        ds.seances = plan.seances;
        st.ds.push(ds);
        if (!st.seance?.faite && !st.seance?.etape) st.seance = null;
        sauve();
        location.hash = ds.id;
      });
    },
  };
}

function lienItem(c) {
  const d = decoupe(c);
  const i = d && leger(d.fiche, d.k, d.n);
  if (!i) return '';
  return `<li><a class="ligne" href="#fiche-${p2(d.fiche)}-${d.k}${d.n}"><span class="num">${d.k === 'q' ? 'Q.' + d.n : 'Ex. ' + d.n}</span>
    <span><span class="tit">${i.titre}</span><span class="sous">${pillNiv(i.niveau)}${i.duree ? `<span>${i.duree} min</span>` : ''}${i.demande ? '<span class="puce puce-bac">Tombé au BAC</span>' : ''}</span></span><span class="fin">${point(statut(c))}${ic('chevron')}</span></a></li>`;
}

function tacheHtml(ds, s, idx, t) {
  switch (t.type) {
    case 'essentiel': return `<li><a class="ligne" href="#fiche-${p2(t.fiche)}"><span class="num">${ic('papier')}</span><span><span class="tit">L'essentiel en une page : ${esc(info(t.fiche).titre_court)}</span><span class="sous">les relations à connaître, les pièges, ton parcours</span></span><span class="fin">${ic('chevron')}</span></a></li>`;
    case 'quiz': return `<li><a class="ligne" href="#quiz-${ds.id}-${idx}"><span class="num">${ic('eclair')}</span><span><span class="tit">Test de ${t.ids.length} questions</span><span class="sous">${t.resultat != null ? `<span class="puce puce-ok">${t.resultat}/${t.ids.length} bonnes réponses</span>` : '<span>corrigé tout de suite</span>'}</span></span><span class="fin">${ic('chevron')}</span></a></li>`;
    case 'questions': return t.refs.map(lienItem).join('');
    case 'exercice': return lienItem(t.ref);
    case 'pieges': return `<li><button class="ligne" type="button" data-pieges="${t.fiches.join(',')}" style="width:100%;border:0;background:none;text-align:left;cursor:pointer"><span class="num">${ic('drapeau')}</span><span><span class="tit">Les pièges qui coûtent des points</span><span class="sous">relevés dans les corrigés de la fiche</span></span><span class="fin">${ic('chevron')}</span></button></li>`;
    case 'carnet': return `<li><a class="ligne" href="#carnet"><span class="num">${ic('carnet')}</span><span><span class="tit">Ton carnet d'erreurs</span><span class="sous">${carnetDu().length} questions à revoir</span></span><span class="fin">${ic('chevron')}</span></a></li>`;
    case 'ds-blanc': return `<li><a class="ligne" href="#dsblanc-${ds.id}"><span class="num">${ic('horloge')}</span><span><span class="tit">DS blanc chronométré : ${t.minutes / 60} h</span><span class="sous">${t.refs.length} exercices et questions, au format du devoir</span></span><span class="fin">${ic('chevron')}</span></a></li>`;
    default: return '';
  }
}

export async function plan(id) {
  const st = store.state;
  const ds = st.ds.find((d) => d.id === id);
  if (!ds) return { titre: 'DS', html: '<p class="vide">Ce DS n\'existe plus.</p>' };
  const auj = jour();
  const j = ecart(auj, ds.date);
  const passe = j < 0;
  const fmt = FORMATS[ds.format];
  const faites = ds.seances.filter((s) => s.faite).length;
  return {
    titre: 'Préparation du DS',
    html: `${entete({ fil: '<a href="#ds">Mode DS</a>', surtitre: `DS du ${dateLongue(ds.date)} · ${ds.duree} h`, titre: esc(titres(ds.fiches)), repere: 'beta' })}
      <section class="cockpit" style="grid-template-columns:1fr">
        <div class="compteurs">
          <div class="compteur"><div class="lib">${passe ? 'Le devoir' : 'Avant le devoir'}</div><div class="val">${passe ? 'Fait' : 'J−' + j}</div><div class="det">${passe ? dateSimple(ds.date) : quand(ds.date)}</div></div>
          <div class="compteur"><div class="lib">Préparation</div><div class="val">${faites}<small>/${ds.seances.length}</small></div><div class="det">format ${fmt.nom}, viser ${ds.objectif}</div></div>
        </div>
      </section>
      ${passe ? `<div class="carte" style="margin-top:14px">${ds.note != null ? `<h2>Ta note : ${String(ds.note).replace('.', ',')} sur 20</h2><p class="discret" style="margin:0">Elle recale ta note estimée.</p>`
        : `<h2>Quelle note as-tu eue ?</h2><form class="actions" id="f-note"><div class="champ" style="max-width:150px"><label for="note-ds">Note sur 20</label><input id="note-ds" inputmode="decimal" placeholder="13,5"></div><button class="btn" type="submit" style="align-self:end">Enregistrer</button></form>`}</div>` : ''}
      <p class="petit discret" style="margin:14px 0 0">${fmt.resume}</p>
      <div class="pile" style="margin-top:14px">${ds.seances.map((s, i) => `<section class="carte">
        <div class="tete"><div><div class="surtitre">${s.date === auj ? "Aujourd'hui" : s.date < auj ? dateSimple(s.date) : quand(s.date)} · ${duree(s.minutes)}</div><h2>${esc(s.titre)}</h2></div>
          <label class="case" style="padding:0;align-items:center;gap:8px"><span class="petit">Faite</span><span class="inter"><input type="checkbox" data-faite="${i}" ${s.faite ? 'checked' : ''}><span></span></span></label></div>
        <ul class="liste">${s.taches.map((t) => tacheHtml(ds, s, i, t)).join('')}</ul></section>`).join('')}</div>
      <div class="actions" style="margin-top:16px"><button class="btn-texte" type="button" id="suppr">Supprimer ce DS</button></div>`,
    monte(v) {
      v.querySelectorAll('[data-faite]').forEach((c) => c.addEventListener('change', () => {
        ds.seances[Number(c.dataset.faite)].faite = c.checked;
        sauve();
        toast(c.checked ? 'Séance cochée.' : 'Séance décochée.');
      }));
      v.querySelectorAll('[data-pieges]').forEach((b) => b.addEventListener('click', async () => {
        const fiches = b.dataset.pieges.split(',').map(Number);
        const tout = await Promise.all(fiches.map((n) => ficheComplete(n)));
        dialogue(`<h2>Les pièges qui coûtent des points</h2>${tout.map((f) => `<h3 class="surtitre" style="margin-top:6px">${esc(f.titre_court)}</h3><ul class="contenu">${f.pieges.map((p) => `<li>${p}</li>`).join('')}</ul>`).join('')}
          <div class="actions"><button class="btn" type="button" data-fermer>Fermer</button></div>`);
      }));
      v.querySelector('#f-note')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = Number(v.querySelector('#note-ds').value.replace(',', '.'));
        if (!(val >= 0 && val <= 20)) { toast('Entre une note entre 0 et 20.'); return; }
        ds.note = Math.round(val * 10) / 10;
        sauve();
        toast('Note enregistrée.');
        rafraichit();
      });
      v.querySelector('#suppr').addEventListener('click', () => {
        dialogue(`<h2>Supprimer ce DS ?</h2><p>Son plan de révision disparaît. Tes résultats aux questions restent.</p>
          <div class="actions"><button class="btn" type="button" id="oui">Supprimer</button><button class="btn btn-ligne" type="button" data-fermer>Garder</button></div>`, (d) => {
          d.querySelector('#oui').addEventListener('click', () => {
            st.ds = st.ds.filter((x) => x.id !== ds.id);
            if (!st.seance?.faite && !st.seance?.etape) st.seance = null;
            sauve();
            d.close();
            location.hash = 'ds';
          });
        });
      });
    },
  };
}

export async function blanc(id) {
  const st = store.state;
  const ds = st.ds.find((d) => d.id === id);
  const t = ds?.seances.flatMap((s) => s.taches).find((x) => x.type === 'ds-blanc');
  if (!t) return { titre: 'DS blanc', html: '<p class="vide">Pas de DS blanc dans ce plan.</p>' };
  const blocs = await Promise.all(t.refs.map(async (c) => {
    const d = decoupe(c);
    const f = await ficheComplete(d.fiche);
    const x = trouve(f, d.k, d.n);
    return { c, d, item: x.item, theme: x.theme };
  }));
  const pts = blocs.reduce((s, b) => s + (b.item.points || (b.d.k === 'q' ? 2 : 4)), 0);
  return {
    titre: 'DS blanc',
    html: `${entete({ fil: `<a href="#ds">Mode DS</a> › <a href="#${ds.id}">Préparation du DS</a>`, surtitre: `DS blanc · ${t.minutes / 60} h · environ ${nbPts(pts)} points`, titre: esc(titres(ds.fiches)), sous: 'Les conditions du devoir : une copie, une calculatrice, pas de corrigé. Lance le chronomètre et rédige sur papier.', repere: 'beta' })}
      <div class="actions" style="margin-bottom:14px">${chronoHtml(t.minutes, 'chrono-blanc')}</div>
      ${blocs.map((b, i) => `<section class="carte" style="margin-bottom:14px"><div class="bandeau-q ${b.d.k === 'ex' ? 'bandeau-ex' : ''}"><span class="num">Partie ${i + 1}</span><h1 style="font-size:1.15rem">${b.item.titre}</h1></div>
        <div class="meta">${pillNiv(b.item.niveau)}${b.item.points ? `<span>${nbPts(b.item.points)} points</span>` : ''}${b.item.duree ? `<span>${b.item.duree} min</span>` : ''}</div>
        ${b.item.mention ? `<p class="mention"><b>Sujet du BAC correspondant.</b> ${b.item.mention}</p>` : ''}
        ${b.theme.preambule && b.d.k === 'q' && (!b.theme.preambule_pour?.length || b.theme.preambule_pour.includes(b.d.n)) ? `<div class="contenu contexte">${b.theme.preambule}</div>` : ''}
        <div class="contenu" style="margin-top:12px">${b.item.enonce}</div></section>`).join('')}
      <div class="carte"><h2>Tu as terminé ?</h2><p>Corrige-toi partie par partie, au barème : chaque lien ouvre le corrigé pas à pas.</p>
        <ul class="liste">${t.refs.map(lienItem).join('')}</ul></div>`,
    monte(v) { monteChrono(v, 'chrono-blanc'); },
  };
}
