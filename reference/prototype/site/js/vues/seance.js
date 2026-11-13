// La séance du jour, en trois temps : revoir, s'exercer sur papier, se corriger au barème.
import { esc, ic, maths } from '../util.js';
import { store, sauve } from '../etat.js';
import { decoupe } from '../donnees.js';
import { seanceDuJour, marqueSeanceFaite } from '../moteur.js';
import { entete, chronoHtml, monteChrono } from '../composants.js';
import { travail } from '../travail.js';
import { quizHtml, monteQuiz, bilanQuiz } from '../quiz.js';
import { rafraichit } from '../nav.js';

const ETAPES = ['À revoir', 'Un exercice sur papier', 'La correction au barème'];

function stepper(actif) {
  return `<ol class="etapes" aria-label="Étapes de la séance">${ETAPES.map((e, i) => `<li class="${i < actif ? 'fait' : ''}" ${i === actif ? 'aria-current="step"' : ''}>${i + 1}. ${e}</li>`).join('')}</ol>`;
}

export async function rendu() {
  const s = seanceDuJour();
  const etape = Math.min(s.etape || 0, 2);
  const quizIds = s.revoir.filter((k) => k.startsWith('quiz:')).map((k) => k.slice(5));
  const questions = s.revoir.filter((k) => !k.startsWith('quiz:'));
  const tete = entete({
    surtitre: 'Séance du jour · 25 minutes',
    titre: etape === 0 ? 'D\'abord, ce qui est à revoir' : 'Un exercice à ton niveau, sur papier',
    sous: etape === 0 ? 'Cinq minutes sur les questions que tu as ratées ces derniers jours.' : 'Prends une feuille et un stylo, comme le jour du DS. Le téléphone garde le temps et la correction.',
    fil: '<a href="#aujourdhui">Aujourd\'hui</a> › Séance du jour',
    repere: 'coach',
  });

  if (s.faite && etape >= 2) {
    return {
      titre: 'Séance du jour',
      html: `${tete}<div class="carte"><h2>Séance terminée</h2><p>Tes résultats sont dans ton carnet d'erreurs et ta note estimée est à jour. Demain, la séance repart de là.</p>
        <div class="actions"><a class="btn" href="#aujourdhui">Retour à l'accueil</a><a class="btn btn-ligne" href="#parents">${ic('envoi')}Voir le bilan envoyé aux parents</a></div></div>`,
    };
  }

  if (etape === 0) {
    // 1. revoir : d'abord les questions de quiz, puis les questions de cours du carnet, une à une
    const sous = s.sousEtape || 0;
    if (quizIds.length && sous === 0) {
      return {
        titre: 'Séance du jour',
        html: `${tete}${stepper(0)}${quizHtml(quizIds)}`,
        monte(v) {
          monteQuiz(v, quizIds, {
            surFin: (res, zone) => {
              zone.innerHTML = `${bilanQuiz(res, quizIds)}<div class="actions"><button class="btn btn-cuivre" type="button" id="suite">${questions.length ? 'Revoir mes questions de cours' : 'Passer à l\'exercice'}${ic('chevron')}</button></div>`;
              zone.querySelector('#suite').addEventListener('click', () => {
                s.sousEtape = 1;
                if (!questions.length) s.etape = 1;
                sauve();
                rafraichit();
              });
            },
          });
        },
      };
    }
    const idx = (s.sousEtape || 0) - (quizIds.length ? 1 : 0);
    const k = questions[idx];
    if (!k) { s.etape = 1; sauve(); return rendu(); }
    const d = decoupe(k);
    const t = await travail(d.fiche, d.k, d.n, {
      surResultat: () => {
        const b = document.getElementById('apres-revue');
        if (b) b.hidden = false;
      },
    });
    return {
      titre: 'Séance du jour',
      html: `${tete}${stepper(0)}<p class="petit discret">Question ${idx + 1} sur ${questions.length} de ton carnet d'erreurs · fiche ${d.fiche}</p>${t.html}
        <div class="actions" id="apres-revue" hidden style="margin-top:14px"><button class="btn btn-cuivre" type="button" id="suite">${idx + 1 < questions.length ? 'Question suivante' : 'Passer à l\'exercice'}${ic('chevron')}</button></div>`,
      monte(v) {
        t.monte(v);
        v.querySelector('#suite').addEventListener('click', () => {
          s.sousEtape = (s.sousEtape || 0) + 1;
          if (idx + 1 >= questions.length) s.etape = 1;
          sauve();
          rafraichit();
        });
      },
    };
  }

  // 2 et 3. l'exercice sur papier, puis la correction au barème
  if (!s.exercice) {
    return { titre: 'Séance du jour', html: `${tete}<p class="vide">Pas d'exercice à proposer aujourd'hui : coche les chapitres vus en classe dans les cours.</p>` };
  }
  const d = decoupe(s.exercice);
  const t = await travail(d.fiche, d.k, d.n, {
    chrono: chronoHtml(15, 'chrono-seance'),
    surResultat: () => {
      marqueSeanceFaite();
      s.etape = 2;
      sauve();
      const b = document.getElementById('fin-seance');
      if (b) b.hidden = false;
    },
  });
  return {
    titre: 'Séance du jour',
    html: `${tete}<div id="stepper">${stepper(etape === 2 ? 2 : 1)}</div>
      <p class="petit discret">Choisie pour toi : ${s.raison === 'ds' ? 'elle porte sur le chapitre de ton prochain DS' : s.raison === 'defaut' ? 'tant que tu n\'as pas coché tes chapitres vus en classe, elle porte sur le premier chapitre de l\'année' : 'elle porte sur un chapitre vu en classe'}, au prochain niveau à valider, et ${t.item.demande ? 'elle est tombée au BAC récemment' : 'tu ne l\'as pas encore réussie'}.</p>
      ${t.html}
      <div class="carte" id="fin-seance" hidden style="margin-top:14px"><h2>Séance terminée</h2><p>25 minutes de travail. Le carnet d'erreurs et ta note estimée sont à jour.</p>
        <div class="actions"><a class="btn" href="#aujourdhui">Retour à l'accueil</a><a class="btn btn-ligne" href="#parents">${ic('envoi')}Bilan pour mes parents</a></div></div>`,
    monte(v) {
      t.monte(v);
      monteChrono(v, 'chrono-seance');
      v.querySelector('#voir-corrige')?.addEventListener('click', () => {
        if (s.etape < 2) { s.etape = 1; sauve(); }
        v.querySelector('#stepper').innerHTML = stepper(2);
      });
    },
  };
}
