// Le plan de l'année : trois parcours, cinq périodes, et la progression de la classe.
import { esc, ic, jour, ecart, dateSimple, toast } from '../util.js';
import { store, sauve, chapitresVus } from '../etat.js';
import { D, info } from '../donnees.js';
import { PERIODES, periodeActuelle, BAC, SEANCES_CIBLE, seancesSemaine, niveauFiche } from '../moteur.js';
import { entete, pillNiv } from '../composants.js';
import { rafraichit } from '../nav.js';

const PARCOURS = {
  10: 'Assurer les bases : chaque chapitre au niveau 10, les questions de cours et les exercices classiques, sans impasse.',
  14: 'Les exercices classiques du BAC, à savoir refaire sans hésiter, puis les sujets récents chronométrés.',
  18: 'Les démonstrations longues et les expressions littérales en plus, et la rédaction soignée qui fait la différence.',
};

export async function rendu() {
  const st = store.state;
  const auj = jour();
  const obj = st.profil.objectif || 14;
  const actuelle = periodeActuelle();
  const vus = new Set(chapitresVus());
  const cible = SEANCES_CIBLE[obj];
  const faites = seancesSemaine();
  return {
    titre: "Plan de l'année",
    html: `${entete({ surtitre: "Plan de l'année", titre: `Viser ${obj} au bac, en ${ecart(auj, BAC)} jours`, sous: 'Le plan suit la progression de ton professeur : coche les chapitres vus en classe. Une séance sautée ne casse rien, il se recalcule.', repere: 'coach' })}
      <div class="carte pile">
        <div class="champ"><span style="font-weight:600;color:var(--encre)">Ton parcours</span>
          <span class="seg" role="group" aria-label="Parcours">${[10, 14, 18].map((L) => `<button type="button" data-obj="${L}" aria-pressed="${L === obj}">Viser ${L}</button>`).join('')}</span></div>
        <p style="margin:0">${PARCOURS[obj]}</p>
        <p class="petit discret" style="margin:0">Cette semaine : <b>${faites} séance${faites > 1 ? 's' : ''} sur ${cible}</b> prévues pour ce parcours (${SEANCES_CIBLE[10]} pour viser 10, ${SEANCES_CIBLE[14]} pour 14, ${SEANCES_CIBLE[18]} pour 18).</p>
      </div>
      <div class="section-titre"><h2>Les cinq périodes jusqu'au bac</h2></div>
      <ol class="frise">${PERIODES.map((p) => {
        const etat = auj > p.fin ? 'passe' : p.id === actuelle.id ? 'actuel' : '';
        return `<li class="${etat}"><span class="rail"><span class="point"></span></span><div class="bloc">
          <div class="dates">${dateSimple(p.debut)} au ${dateSimple(p.fin)}${p.id === actuelle.id ? ' · en ce moment' : ''}</div>
          <h3>${esc(p.nom)}</h3><p style="margin:0 0 4px"><b>${esc(p.but)}</b></p><p class="petit discret" style="margin:0">${esc(p.detail)}</p></div></li>`;
      }).join('')}</ol>
      <div class="section-titre"><h2>Les chapitres vus en classe</h2><span class="petit discret">${vus.size} sur ${D.fiches.length}</span></div>
      ${D.domaines.map((d) => `<h3 class="groupe-titre">${esc(d.nom)}</h3><ul class="liste">${d.fiches.map(info).filter(Boolean).map((f) => {
        const nv = niveauFiche(f.num);
        return `<li><div class="ligne"><span class="inter"><input type="checkbox" data-vu="${f.num}" ${vus.has(f.num) ? 'checked' : ''} aria-label="Fiche ${f.num} vue en classe"><span></span></span>
          <span><a class="tit" href="#fiche-${String(f.num).padStart(2, '0')}" style="text-decoration:none">Fiche ${f.num} · ${esc(f.titre_court)}</a>
          <span class="sous">${nv.atteint ? pillNiv(nv.atteint) + ' atteint' : vus.has(f.num) ? '<span>niveau 10 à valider</span>' : '<span>pas encore vu</span>'}</span></span>
          <span class="fin">${vus.has(f.num) && nv.atteint < obj ? `<span class="puce puce-bleu">vers ${Math.min(obj, (nv.atteint || 6) + 4)}</span>` : ''}</span></div></li>`;
      }).join('')}</ul>`).join('')}
      <p class="petit discret" style="margin-top:14px">Bacs blancs complets en janvier, en avril et fin mai. Ta note estimée se recale sur chacun d'eux, puis sur tes notes du bac en juillet.</p>`,
    monte(v) {
      v.querySelectorAll('[data-obj]').forEach((b) => b.addEventListener('click', () => {
        st.profil.objectif = Number(b.dataset.obj);
        if (!st.seance?.faite && !st.seance?.etape) st.seance = null;
        sauve();
        toast(`Parcours : viser ${b.dataset.obj}.`);
        rafraichit();
      }));
      v.querySelectorAll('[data-vu]').forEach((c) => c.addEventListener('change', () => {
        st.vuEnClasse[c.dataset.vu] = c.checked;
        if (!st.seance?.faite && !st.seance?.etape) st.seance = null;
        sauve();
        rafraichit();
      }));
    },
  };
}
export { ic };
