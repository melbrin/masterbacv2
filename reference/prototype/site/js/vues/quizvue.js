// Les écrans de quiz : quiz du chapitre, quiz d'une séance de DS, test de passage de niveau, révision du carnet.
import { esc, ic, graineDuJour, toast } from '../util.js';
import { store, sauve } from '../etat.js';
import { info, quizFiche } from '../donnees.js';
import { quizPour, questionsPassage, carnetDu } from '../moteur.js';
import { entete } from '../composants.js';
import { quizHtml, monteQuiz, bilanQuiz } from '../quiz.js';
import { rafraichit } from '../nav.js';

const p2 = (n) => String(n).padStart(2, '0');

export async function chapitre(num) {
  const f = info(num);
  const ids = quizPour([num], 10, 18, graineDuJour('q' + num));
  return {
    titre: `Quiz · Fiche ${num}`,
    html: `${entete({ fil: `<a href="#cours">Cours</a> › <a href="#fiche-${p2(num)}-quiz">Fiche ${num} · ${esc(f.titre_court)}</a>`, surtitre: 'Quiz du chapitre', titre: esc(f.titre_court), sous: `${ids.length} questions, sans chronomètre. Chaque réponse est corrigée tout de suite.`, repere: 'beta' })}
      ${quizHtml(ids)}`,
    monte(v) {
      monteQuiz(v, ids, {
        surFin: (res, zone) => {
          zone.innerHTML = `${bilanQuiz(res, ids)}<div class="actions"><a class="btn" href="#fiche-${p2(num)}">Retour à la fiche</a><a class="btn btn-ligne" href="#quiz-${p2(num)}" id="encore">Un autre quiz</a></div>`;
          // même adresse : on redessine l'écran, le tirage repart des questions ratées
          zone.querySelector('#encore').addEventListener('click', (e) => { e.preventDefault(); rafraichit(); window.scrollTo(0, 0); });
        },
      });
    },
  };
}

export async function seanceDS(dsId, idx) {
  const ds = store.state.ds.find((d) => d.id === dsId);
  const s = ds?.seances[idx];
  const tache = s?.taches.find((t) => t.type === 'quiz');
  if (!tache) return { titre: 'Quiz', html: '<p class="vide">Ce quiz n\'existe plus.</p>' };
  return {
    titre: 'Quiz du DS',
    html: `${entete({ fil: `<a href="#ds">Mode DS</a> › <a href="#${ds.id}">Préparation du DS</a>`, surtitre: s.titre, titre: `${tache.ids.length} questions sur ${ds.fiches.map((n) => esc(info(n).titre_court)).join(', ')}`, repere: 'beta' })}
      ${quizHtml(tache.ids)}`,
    monte(v) {
      monteQuiz(v, tache.ids, {
        surFin: (res, zone) => {
          tache.resultat = res.filter((r) => r.ok).length;
          sauve();
          zone.innerHTML = `${bilanQuiz(res, tache.ids)}<div class="actions"><a class="btn" href="#${ds.id}">Retour au plan du DS</a></div>`;
        },
      });
    },
  };
}

export async function passage(num, L) {
  const f = info(num);
  const ids = questionsPassage(num, L);
  return {
    titre: 'Test de passage',
    html: `${entete({ fil: `<a href="#progres">Progrès</a> › <a href="#fiche-${p2(num)}">Fiche ${num}</a>`, surtitre: `Test de passage · objectif ${L}`, titre: esc(f.titre_court), sous: `${ids.length} questions en 15 minutes. Avec 70 % de bonnes réponses, le chapitre passe à l'objectif ${L}.`, repere: 'coach' })}
      ${quizHtml(ids, { chrono: 15 })}`,
    monte(v) {
      monteQuiz(v, ids, {
        surFin: (res, zone) => {
          const taux = res.filter((r) => r.ok).length / ids.length;
          const reussi = taux >= 0.7;
          if (reussi) { (store.state.passages[num] ||= {})[L] = Date.now(); sauve(); }
          zone.innerHTML = `${bilanQuiz(res, ids)}<h2>${reussi ? `Niveau validé : objectif ${L}` : 'Pas encore'}</h2>
            <p>${reussi ? 'Le chapitre monte d\'un niveau. Ta séance du jour vise maintenant le niveau suivant.' : 'Il fallait 70 % de bonnes réponses. Les questions ratées passent dans ton carnet ; le test se repasse quand tu veux.'}</p>
            <div class="actions"><a class="btn" href="#fiche-${p2(num)}">Retour à la fiche</a></div>`;
          if (reussi) toast(`Objectif ${L} validé sur la fiche ${num}.`);
        },
      });
    },
  };
}

export async function revision() {
  const ids = carnetDu().filter((c) => c.k.startsWith('quiz:')).map((c) => c.k.slice(5));
  return {
    titre: 'Révision du carnet',
    html: `${entete({ fil: '<a href="#carnet">Carnet d\'erreurs</a>', surtitre: 'Carnet d\'erreurs', titre: 'Les questions de quiz à revoir', sous: ids.length ? `${ids.length} questions arrivent à échéance aujourd'hui.` : 'Rien à revoir aujourd\'hui.', repere: 'beta' })}
      ${ids.length ? quizHtml(ids) : '<p class="vide">Ton carnet est à jour.</p>'}`,
    monte(v) {
      if (!ids.length) return;
      monteQuiz(v, ids, { surFin: (res, zone) => { zone.innerHTML = `${bilanQuiz(res, ids)}<div class="actions"><a class="btn" href="#carnet">Retour au carnet</a></div>`; } });
    },
  };
}
export { quizFiche, ic };
