// La page parents : ce que le parent reçoit chaque semaine. C'est lui qui paie.
import { esc, ic, jour, ajouteJours, ecart, dateLongue, dateSimple, nombre, toast } from '../util.js';
import { store, sauve, chapitresVus, aLePass, prenom } from '../etat.js';
import { info } from '../donnees.js';
import { noteEstimee, prochainDS, niveauFiche, etatsFiche, lundi, SEANCES_CIBLE, tentatives, BAC } from '../moteur.js';
import { entete, pillNiv, barreEtats, repere } from '../composants.js';

export async function rendu() {
  const st = store.state;
  const p = st.profil;
  const auj = jour();
  const l = lundi();
  const semaine = st.seances.filter((s) => s.date >= ajouteJours(l, -7) && s.date < l);
  const cetteSemaine = st.seances.filter((s) => s.date >= l);
  const sem = semaine.length ? semaine : cetteSemaine;
  const minutes = sem.reduce((a, s) => a + s.minutes, 0);
  const note = noteEstimee();
  const ds = prochainDS();
  const vus = chapitresVus();
  const notesDS = st.ds.filter((d) => d.note != null).sort((a, b) => b.date.localeCompare(a.date));
  const cible = SEANCES_CIBLE[p.objectif] || 4;
  const reponses = Object.values(st.tentatives).flat().filter((a) => a.t >= new Date(ajouteJours(l, -7)).getTime()).length;
  const enf = esc(prenom());
  return {
    titre: 'Page parents',
    html: `${entete({ surtitre: 'Page parents', titre: `Le bilan de la semaine de ${enf}`, sous: `Ce que reçoit le parent chaque dimanche, par e-mail et sur cette page, à l'adresse ${esc(p.emailParent || 'du parent')}. Dans l'application, le parent a son propre accès, sans voir les réponses de son enfant.`, repere: 'ouverture' })}
      ${repere('fevrier') ? `<p class="petit discret" style="margin:-4px 0 12px">L'envoi automatique du dimanche est prévu de février à avril ; avant, le bilan part à la main.</p>` : ''}
      <div class="rapport">
        <div class="grille-2">
          <div class="carte chiffre-cle"><b class="chiffres">${sem.length}<span style="font-size:.5em;color:var(--discret)">/${cible}</span></b><span>séances de 25 minutes la semaine dernière, sur ${cible} prévues pour viser ${p.objectif}</span></div>
          <div class="carte chiffre-cle"><b class="chiffres">${Math.round(minutes / 60 * 10) / 10 > 0 ? nombre(minutes / 60, 1) : '0'} h</b><span>de travail suivi, ${reponses} réponses corrigées</span></div>
          <div class="carte chiffre-cle"><b class="chiffres">${note ? nombre(note.valeur, 1) : '?'}</b><span>note estimée en physique-chimie${note ? `, entre ${note.bas} et ${note.haut}` : ''}</span></div>
        </div>
        ${ds ? `<section class="carte"><h2>Prochain devoir : ${dateLongue(ds.date)}</h2>
          <p style="margin:0">${esc(ds.fiches.map((n) => info(n).titre_court).join(', '))}. ${enf} a fait ${ds.seances.filter((s) => s.faite).length} séance${ds.seances.filter((s) => s.faite).length > 1 ? 's' : ''} de préparation sur ${ds.seances.length}, avec un DS blanc chronométré prévu avant le devoir.</p></section>` : ''}
        <section class="carte"><h2>Les chapitres vus en classe</h2>
          <ul class="liste" style="box-shadow:none">${vus.map((n) => { const nv = niveauFiche(n); const e = etatsFiche(n); return `<li><div class="ligne" style="grid-template-columns:1fr auto"><span><span class="tit">${esc(info(n).titre_court)}</span><span class="sous"><span>${e.acquis + e.solide} notions acquises sur ${e.total}</span></span><span style="display:block;margin-top:6px;max-width:300px">${barreEtats(e)}</span></span><span>${nv.atteint ? pillNiv(nv.atteint) : '<span class="puce">en cours</span>'}</span></div></li>`; }).join('') || '<li class="vide">Aucun chapitre coché pour l\'instant.</li>'}</ul></section>
        ${notesDS.length ? `<section class="carte"><h2>Les notes de DS saisies</h2><ul style="margin:0;padding-left:1.1em">${notesDS.map((d) => `<li>${dateSimple(d.date)} : <b>${nombre(d.note, 1)}</b> sur 20, ${esc(d.fiches.map((n) => info(n).titre_court).join(', '))}</li>`).join('')}</ul></section>` : ''}
        <section class="carte"><h2>Comment l'aider cette semaine</h2>
          <p style="margin:0">Demandez-lui de vous montrer sa séance du jour : 25 minutes, sur papier, puis la correction. Le soir du devoir, demandez-lui sa note : elle sert à mesurer ses progrès. Il reste ${ecart(auj, BAC)} jours avant les épreuves de spécialité.</p></section>
        ${!aLePass() ? `<section class="carte" style="border:2px solid var(--cuivre)"><h2>Offrir le Pass Bac 2027</h2><p>79 €, une seule fois : l'application jusqu'aux résultats du bac, le mode DS, le plan de l'année et les trois stages en direct.</p><div class="actions"><a class="btn btn-cuivre" href="#paiement-pass">Offrir le Pass, 79 €</a></div></section>` : ''}
        <div class="actions"><button class="btn btn-ligne" type="button" id="copier">${ic('envoi')}Copier le lien de cette page</button><a class="btn-texte" href="#profil">Changer l'adresse du parent</a></div>
      </div>`,
    monte(v) {
      v.querySelector('#copier').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(location.href); toast('Lien copié.'); } catch (e) { toast('La copie est bloquée ici : dans l\'application, le lien part par e-mail.'); }
      });
    },
  };
}
export { tentatives };
