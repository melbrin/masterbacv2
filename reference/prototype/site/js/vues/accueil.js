// L'entrée d'un nouvel élève : le test de niveau gratuit, sans compte jusqu'au résultat, puis le compte par e-mail et code.
import { esc, ic, toast, dialogue, nombre } from '../util.js';
import { store, sauve, remet, etatNouveau } from '../etat.js';
import { D, info, quizFiche, quizParId } from '../donnees.js';
import { entete, repere } from '../composants.js';
import { quizHtml, monteQuiz } from '../quiz.js';

const CIBLES = [10, 14, 10, 18, 14, 10, 14, 18, 10, 14, 18, 10, 14];

function composeTest() {
  const ids = [];
  D.fiches.filter((f) => quizFiche(f.num).length).forEach((f, i) => {
    const L = CIBLES[i % CIBLES.length];
    const pool = quizFiche(f.num).sort((a, b) => Math.abs(a.niveau - L) - Math.abs(b.niveau - L));
    if (pool[0]) ids.push(pool[0].id);
  });
  return ids.slice(0, 12);
}

export async function bienvenue() {
  return {
    titre: 'Bienvenue',
    html: `<section class="accueil-hero apparait">
        <div class="surtitre">MasterBac · physique-chimie</div>
        <h1>Le coach qui te dit quoi travailler ce soir, te corrige et te tient jusqu'au bac.</h1>
        <p>Commence par le test de niveau : gratuit, sans compte. Tu crées ton compte seulement si tu veux garder ton score, préparer un DS ou envoyer ton bilan à tes parents.</p>
        <div class="actions"><a class="btn btn-cuivre" href="#test">${ic('lecture')}Faire le test de niveau</a><a class="btn btn-ligne" href="#aujourdhui" style="color:#FFFFFF;border-color:rgba(255,255,255,.35)">Revenir à la démonstration</a></div>
      </section>
      ${repere('existant')}
      <div class="grille-2" style="margin-top:16px">
        <div class="carte"><h3>Ce soir</h3><p class="petit" style="margin:0">Une séance de 25 minutes : ce que tu as raté à revoir, un exercice à ton niveau sur papier, la correction au barème.</p></div>
        <div class="carte"><h3>Avant chaque DS</h3><p class="petit" style="margin:0">Tu donnes la date et le chapitre, le plan de révision sort tout seul : la veille, à J-3 ou à J-7.</p></div>
        <div class="carte"><h3>Jusqu'au bac</h3><p class="petit" style="margin:0">Les 14 fiches à jour des BAC 2025 et 2026, les niveaux 10, 14 et 18, et une note estimée qui se recale sur tes DS.</p></div>
      </div>`,
  };
}

export async function test() {
  const ids = composeTest();
  return {
    titre: 'Test de niveau',
    html: `${entete({ fil: '<a href="#bienvenue">Accueil</a>', surtitre: 'Test de niveau gratuit', titre: `${ids.length} questions sur toute l'année`, sous: 'Version courte du prototype ; le test en ligne en compte 40 en 30 minutes. Pas besoin de compte pour avoir ton résultat.', repere: 'existant' })}
      ${quizHtml(ids, { chrono: 9 })}`,
    monte(v) {
      monteQuiz(v, ids, {
        enregistrer: false,
        surFin: (res, zone) => {
          const st = store.state;
          st.testTemp = { reponses: res, date: Date.now(), ids };
          sauve();
          zone.innerHTML = resultatHtml(res, ids);
          zone.querySelector('#envoyer-parents')?.addEventListener('click', () => {
            dialogue(`<h2>Envoyer mon résultat à mes parents</h2><p class="petit discret">Ils reçoivent ton score, ce qu'il faut travailler et la présentation de l'application.</p>
              <div class="champ"><label for="mp">Adresse e-mail d'un parent</label><input id="mp" type="email" placeholder="parent@exemple.fr"></div>
              <div class="actions"><button class="btn btn-cuivre" type="button" id="ok-mp">Envoyer</button><button class="btn btn-ligne" type="button" data-fermer>Annuler</button></div>`, (d) => {
              d.querySelector('#ok-mp').addEventListener('click', () => {
                const m = d.querySelector('#mp').value.trim();
                if (!m.includes('@')) { toast('Entre une adresse e-mail.'); return; }
                store.state.testTemp.emailParent = m;
                sauve();
                d.close();
                toast('Prêt à partir. Dans le prototype, rien n\'est envoyé.');
              });
            });
          });
        },
      });
    },
  };
}

function resultatHtml(res, ids) {
  const bons = res.filter((r) => r.ok).length;
  const taux = bons / ids.length;
  const niveau = taux >= 0.75 ? 18 : taux >= 0.5 ? 14 : 10;
  const note = 6 + 12 * taux;
  const parDomaine = D.domaines.map((d) => {
    const qs = res.filter((r) => d.fiches.includes(quizParId(r.id).fiche));
    return { nom: d.nom, n: qs.length, ok: qs.filter((r) => r.ok).length };
  }).filter((x) => x.n);
  return `<div class="score-final"><b class="chiffres">${bons}/${ids.length}</b><span>bonnes réponses</span></div>
    <p>Ton point de départ : <b>viser ${niveau}</b> pour commencer. Ta note estimée en physique-chimie se situe <b>entre ${Math.max(0, Math.floor(note - 2.5))} et ${Math.min(20, Math.ceil(note + 2.5))}</b> ; elle se précise avec tes séances et tes notes de DS.</p>
    <ul class="liste" style="margin-bottom:14px">${parDomaine.map((x) => `<li><div class="ligne" style="grid-template-columns:1fr auto"><span class="tit">${esc(x.nom)}</span><span class="puce ${x.ok === x.n ? 'puce-ok' : x.ok === 0 ? 'puce-ko' : ''}">${x.ok}/${x.n}</span></div></li>`).join('')}</ul>
    <div class="actions"><a class="btn btn-cuivre" href="#compte">${ic('ok')}Garder mon score : créer mon compte</a><button class="btn btn-ligne" type="button" id="envoyer-parents">${ic('envoi')}Envoyer à mes parents</button></div>`;
}

export async function compte() {
  const t = store.state.testTemp;
  return {
    titre: 'Créer mon compte',
    html: `${entete({ fil: '<a href="#bienvenue">Accueil</a>', surtitre: 'Créer mon compte', titre: 'Ton adresse e-mail suffit', sous: 'Pas de mot de passe : à chaque nouvel appareil, tu reçois un code à usage unique.', repere: 'beta' })}
      <form class="carte pile" id="f-compte">
        <div id="etape-1" class="pile">
          <div class="champ"><label for="c-mail">Ton adresse e-mail</label><input id="c-mail" type="email" autocomplete="email" placeholder="prenom@exemple.fr" required></div>
          <div class="actions"><button class="btn btn-cuivre" type="button" id="envoi-code">Recevoir mon code</button></div>
        </div>
        <div id="etape-2" class="pile" hidden>
          <p class="puce puce-bleu" style="justify-self:start">Prototype : ton code est 418 205</p>
          <div class="champ"><label for="c-code">Le code à 6 chiffres reçu par e-mail</label><input id="c-code" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="000 000"></div>
          <div class="actions"><button class="btn btn-cuivre" type="button" id="verif-code">Valider</button></div>
        </div>
        <div id="etape-3" class="pile" hidden>
          <div class="grille-2">
            <div class="champ"><label for="c-prenom">Prénom</label><input id="c-prenom" autocomplete="given-name"></div>
            <div class="champ"><label for="c-classe">Classe</label><select id="c-classe"><option>Terminale</option><option>Première</option></select></div>
          </div>
          <div class="champ"><span style="font-weight:600;color:var(--encre)">Note visée</span><span class="seg" role="group" aria-label="Note visée">${[10, 14, 18].map((L) => `<button type="button" data-obj="${L}" aria-pressed="${L === 14}">Viser ${L}</button>`).join('')}</span></div>
          <div class="champ"><label for="c-parent">Adresse e-mail d'un parent (facultatif)</label><input id="c-parent" type="email" value="${esc(t?.emailParent || '')}" placeholder="parent@exemple.fr"><span class="aide">Il reçoit le bilan de la semaine et son propre accès.</span></div>
          <label class="case"><input type="checkbox" id="c-15"><span>J'ai moins de 15 ans : l'accord d'un parent sera demandé par e-mail avant d'utiliser l'application.</span></label>
          <p class="petit discret" style="margin:0">On ne demande que le minimum : ton e-mail, ton prénom et ta classe. Données hébergées en France, ni publicité ni revente.</p>
          <div class="actions"><button class="btn btn-cuivre" type="submit">${ic('ok')}Créer mon compte</button></div>
        </div>
      </form>
      ${t ? `<p class="petit discret">Ton test de niveau (${t.reponses.filter((r) => r.ok).length}/${t.ids.length}) sera rattaché à ton compte.</p>` : ''}`,
    monte(v) {
      let objectif = 14;
      v.querySelector('#envoi-code').addEventListener('click', () => {
        const m = v.querySelector('#c-mail').value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) { toast('Entre une adresse e-mail complète.'); return; }
        v.querySelector('#etape-2').hidden = false;
        v.querySelector('#envoi-code').disabled = true;
        v.querySelector('#c-code').focus();
      });
      v.querySelector('#verif-code').addEventListener('click', () => {
        const c = v.querySelector('#c-code').value.replace(/\s/g, '');
        if (!/^\d{6}$/.test(c)) { toast('Le code compte 6 chiffres.'); return; }
        v.querySelector('#etape-3').hidden = false;
        v.querySelector('#verif-code').disabled = true;
        v.querySelector('#c-prenom').focus();
      });
      v.querySelectorAll('[data-obj]').forEach((b) => b.addEventListener('click', () => {
        objectif = Number(b.dataset.obj);
        v.querySelectorAll('[data-obj]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      }));
      v.querySelector('#f-compte').addEventListener('submit', (e) => {
        e.preventDefault();
        if (v.querySelector('#etape-3').hidden) return;
        const prenom = v.querySelector('#c-prenom').value.trim();
        if (!prenom) { toast('Indique ton prénom.'); return; }
        const profil = {
          prenom, classe: v.querySelector('#c-classe').value, specialites: ['Physique-chimie'], objectif,
          email: v.querySelector('#c-mail').value.trim(), emailParent: v.querySelector('#c-parent').value.trim(), moins15: v.querySelector('#c-15').checked,
        };
        remet(etatNouveau(profil, store.state.testTemp));
        toast(`Bienvenue ${prenom}. Coche les chapitres vus en classe pour lancer ta séance du jour.`);
        location.hash = 'cours';
      });
    },
  };
}
export { info, nombre };
