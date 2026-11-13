// Les offres de la stratégie et un paiement simulé (dans l'application : Stripe).
import { esc, ic, toast } from '../util.js';
import { store, sauve, aLePass } from '../etat.js';
import { entete } from '../composants.js';

export const OFFRES = {
  gratuit: { nom: 'Gratuit', prix: '0 €', unite: '', points: ['Le test de niveau', 'Une préparation de DS offerte', "L'exercice du jour"] },
  mensuel: { nom: 'Mensuel', prix: '9,99 €', unite: 'par mois', montant: '9,99 €', points: ["L'application complète", 'Le mode DS sans limite', 'Sans les stages en direct', 'Résiliable en ligne en quelques clics'] },
  pass: { nom: 'Pass Bac 2027', prix: '79 €', unite: 'une fois', montant: '79 €', points: ["L'application jusqu'aux résultats du bac", 'Le mode DS, le plan de l\'année, les niveaux', 'Les trois stages en direct : Noël, printemps, sprint final', 'Clients actuels : 59 €'] },
  pack: { nom: 'Pack BAC', prix: '149 €', unite: 'une fois', montant: '149 €', points: ['Tout le Pass Bac 2027', 'Le cahier imprimé', 'Deux bacs blancs corrigés par un professeur'] },
  stage: { nom: 'Stage à l\'unité', prix: '29 €', unite: 'le stage', montant: '29 €', points: ['Un stage en direct', 'Déduit du Pass si tu le prends dans les 7 jours'] },
};

export async function offres() {
  const st = store.state;
  const actuelle = st.profil.offre || 'gratuit';
  return {
    titre: 'Offres',
    html: `${entete({ surtitre: 'Offres', titre: 'Ton accompagnement jusqu\'au bac', sous: 'Le Pass Bac 2027 contient ce qu\'aucun livre ne donne : le plan de l\'année, la correction et les stages en direct.', repere: 'ouverture' })}
      <div class="offres">${Object.entries(OFFRES).map(([id, o]) => `<section class="carte offre ${id === 'pass' ? 'mise' : ''}">
        ${id === 'pass' ? '<span class="ruban">Jusqu\'aux résultats</span>' : ''}
        <h2>${esc(o.nom)}</h2><div class="prix chiffres">${o.prix}<small>${o.unite}</small></div>
        <ul>${o.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        ${id === actuelle ? '<span class="puce puce-ok">Ton offre actuelle</span>' : id === 'gratuit' ? '' : `<a class="btn ${id === 'pass' ? 'btn-cuivre' : 'btn-ligne'}" href="#paiement-${id}">Choisir</a>`}
      </section>`).join('')}</div>
      <p class="petit discret" style="margin-top:14px">Les clients actuels de la boutique retrouvent leurs fiches en se connectant avec la même adresse e-mail. Le paiement passe par Stripe ; la boutique Shopify garde les produits physiques.</p>`,
  };
}

export async function paiement(id) {
  const o = OFFRES[id];
  const st = store.state;
  return {
    titre: 'Paiement',
    html: `${entete({ fil: '<a href="#offres">Offres</a>', surtitre: 'Paiement', titre: `${esc(o.nom)} · ${o.montant}`, sous: id === 'mensuel' ? 'Sans engagement : la résiliation se fait en ligne, en quelques clics.' : 'Un seul paiement, sans abonnement.', repere: 'ouverture' })}
      <form class="carte pile" id="f-paie">
        <p class="puce puce-bleu" style="justify-self:start">Paiement simulé : aucun prélèvement dans ce prototype</p>
        <div class="champ"><label for="p-mail">Adresse e-mail du payeur</label><input id="p-mail" type="email" value="${esc(st.profil.emailParent || '')}" placeholder="parent@exemple.fr" autocomplete="email"><span class="aide">Le reçu et le lien vers la page parents partent à cette adresse.</span></div>
        <div class="champ"><label for="p-carte">Carte bancaire</label><input id="p-carte" value="Saisie de la carte par Stripe" disabled></div>
        <label class="case"><input type="checkbox" id="p-retract"><span>Je demande l'accès immédiat au contenu numérique et je renonce à mon droit de rétractation de 14 jours pour ce contenu.</span></label>
        <p class="petit discret" style="margin:0">Cette case est exigée pour ouvrir l'accès tout de suite (article L221-28 du Code de la consommation). Les conditions de vente sont à faire relire par un juriste.</p>
        <div class="actions"><button class="btn btn-cuivre" type="submit">${ic('cadenas')}Payer ${o.montant}</button><a class="btn btn-ligne" href="#offres">Retour</a></div>
      </form>`,
    monte(v) {
      v.querySelector('#f-paie').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!v.querySelector('#p-retract').checked) { toast('Coche la demande d\'accès immédiat pour continuer.'); return; }
        if (id !== 'stage') st.profil.offre = id;
        const mail = v.querySelector('#p-mail').value.trim();
        if (mail) st.profil.emailParent = mail;
        sauve();
        v.querySelector('#f-paie').outerHTML = `<div class="carte pile"><h2>${id === 'stage' ? 'Stage réservé' : 'Accès ouvert'}</h2>
          <p>${id === 'stage' ? 'Le lien du direct arrive par e-mail la veille.' : `L'offre ${esc(o.nom)} est active sur le compte de ${esc(st.profil.prenom)}. Tout ce qui était réservé au Pass est ouvert.`}</p>
          <div class="actions"><a class="btn" href="#aujourdhui">Aller à l'accueil</a></div></div>`;
        toast('Paiement simulé réussi.');
      });
    },
  };
}
export { aLePass };
