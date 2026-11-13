// Profil : l'élève, son parent, son offre, les réglages du prototype.
import { esc, ic, toast, dialogue } from '../util.js';
import { store, sauve, remet, etatDemo, appliqueTheme } from '../etat.js';
import { entete, REPERES } from '../composants.js';
import { OFFRES } from './offres.js';
import { rafraichit } from '../nav.js';

export async function rendu() {
  const st = store.state;
  const p = st.profil;
  const o = OFFRES[p.offre || 'gratuit'];
  return {
    titre: 'Profil',
    html: `${entete({ surtitre: 'Profil', titre: esc(p.prenom || 'Mon profil'), sous: `${esc(p.classe || 'Terminale')} · ${esc((p.specialites || []).join(' et '))}`, repere: 'beta' })}
      <div class="pile">
        <section class="carte pile">
          <h2>Mon compte</h2>
          <p style="margin:0">Connexion par e-mail et code à usage unique, sans mot de passe : <b>${esc(p.email || 'adresse à donner')}</b>.</p>
          <div class="champ"><span style="font-weight:600;color:var(--encre)">Note visée en physique-chimie</span>
            <span class="seg" role="group" aria-label="Note visée">${[10, 14, 18].map((L) => `<button type="button" data-obj="${L}" aria-pressed="${L === p.objectif}">Viser ${L}</button>`).join('')}</span></div>
        </section>
        <section class="carte pile">
          <div class="tete"><h2>Mon offre</h2><span class="puce ${p.offre === 'gratuit' ? '' : 'puce-ok'}">${esc(o.nom)}</span></div>
          <p style="margin:0">${p.offre === 'gratuit' ? 'Le test de niveau, une préparation de DS offerte et l\'exercice du jour.' : p.offre === 'mensuel' ? 'L\'application complète, sans les stages. Résiliable en ligne.' : 'L\'application jusqu\'aux résultats du bac, et les stages en direct.'}</p>
          <div class="actions"><a class="btn btn-ligne" href="#offres">${ic('offres')}Voir les offres</a></div>
        </section>
        <section class="carte pile">
          <h2>Mon parent</h2>
          <p class="petit discret" style="margin:0">Il reçoit le bilan de la semaine et son propre accès à la page parents. C'est souvent lui qui paie.</p>
          <form class="actions" id="f-parent"><div class="champ" style="flex:1;min-width:220px"><label for="mail-parent">Adresse e-mail du parent</label><input id="mail-parent" type="email" value="${esc(p.emailParent || '')}" placeholder="parent@exemple.fr"></div>
            <button class="btn" type="submit" style="align-self:end">${ic('envoi')}Envoyer le lien</button></form>
          <a href="#parents">Voir la page parents</a>
        </section>
        <section class="carte pile">
          <h2>Réglages</h2>
          <div class="champ"><span style="font-weight:600;color:var(--encre)">Thème</span>
            <span class="seg" role="group" aria-label="Thème">${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, n]) => `<button type="button" data-theme-choix="${v}" aria-pressed="${(st.reglages.theme || 'auto') === v}">${n}</button>`).join('')}</span></div>
          <label class="case" style="align-items:center"><span class="inter"><input type="checkbox" id="reperes" ${st.reglages.reperes ? 'checked' : ''}><span></span></span><span><b>Repères du plan</b><br><span class="petit discret">Affiche sur chaque écran l'ouverture où il est prévu : bêta du 7 décembre, ouverture du 19 décembre, coach complet du 15 janvier.</span></span></label>
        </section>
        <section class="carte pile">
          <h2>Prototype</h2>
          <p class="petit discret" style="margin:0">Tout est gardé dans ce navigateur : rien n'est envoyé, aucun paiement n'est réel. Les fiches sont celles du 12 novembre 2026, exportées depuis leur source.</p>
          <div class="actions"><a class="btn btn-ligne" href="#bienvenue">Essayer comme un nouvel élève</a><button class="btn btn-ligne" type="button" id="demo">Remettre le profil de démonstration</button></div>
          ${st.signalements.length ? `<p class="petit" style="margin:0">${st.signalements.length} signalement${st.signalements.length > 1 ? 's' : ''} d'erreur noté${st.signalements.length > 1 ? 's' : ''} dans cette démonstration.</p>` : ''}
        </section>
      </div>`,
    monte(v) {
      v.querySelectorAll('[data-obj]').forEach((b) => b.addEventListener('click', () => { p.objectif = Number(b.dataset.obj); if (!st.seance?.faite && !st.seance?.etape) st.seance = null; sauve(); toast(`Note visée : ${b.dataset.obj}.`); rafraichit(); }));
      v.querySelectorAll('[data-theme-choix]').forEach((b) => b.addEventListener('click', () => { st.reglages.theme = b.dataset.themeChoix; sauve(); appliqueTheme(); rafraichit(); }));
      v.querySelector('#reperes').addEventListener('change', (e) => { st.reglages.reperes = e.target.checked; sauve(); rafraichit(); });
      v.querySelector('#f-parent').addEventListener('submit', (e) => {
        e.preventDefault();
        const m = v.querySelector('#mail-parent').value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) { toast('Cette adresse ne semble pas complète.'); return; }
        p.emailParent = m;
        sauve();
        toast(`Lien prêt pour ${m}. Dans le prototype, rien n'est envoyé.`);
      });
      v.querySelector('#demo').addEventListener('click', () => {
        dialogue(`<h2>Remettre le profil de démonstration ?</h2><p>Tes essais dans ce navigateur sont effacés, et Inès retrouve sa semaine type.</p>
          <div class="actions"><button class="btn" type="button" id="ok">Remettre</button><button class="btn btn-ligne" type="button" data-fermer>Annuler</button></div>`, (d) => {
          d.querySelector('#ok').addEventListener('click', () => {
            d.close();
            window.dispatchEvent(new CustomEvent('mb:demo'));
          });
        });
      });
    },
  };
}
export { REPERES, remet, etatDemo };
