# 0005. Les textes de l'interface s'écrivent dans une langue simple et directe

Date : 2026-11-14
État : demandée par Yane le 14 novembre, après l'essai de la première version locale

## La question

À l'essai, Yane a relevé des phrases reprises du prototype et du cahier des charges qui sonnent comme un texte écrit par une IA : « Donne-moi la date et le chapitre », « le plan sort tout seul », « Voici ce qui t'attend ce soir », « ta séance du jour les suivra », « Une séance sautée ne casse rien : celle du lendemain se recalcule », « lisibles sur téléphone », « Ceux construits d'après un sujet récent indiquent le sujet correspondant ».

## Le choix

Ces règles s'ajoutent à la section 5 du cahier des charges et l'emportent sur les textes du prototype.

- Des phrases courtes : sujet, verbe, complément. Une idée par phrase.
- L'application ne parle pas d'elle à la première personne (« Donne-moi ») et ne prête pas d'intention à une chose (« le plan sort tout seul », « la séance suivra »). On dit ce qui se passe : « Ton plan de révision est généré automatiquement », « Ta séance du jour portera sur ces chapitres ».
- Un lien ou un bouton que l'élève active peut parler à sa place : « Je saisis la date de mon prochain DS ».
- On ne suppose ni l'appareil ni l'heure : pas de « téléphone », pas de « ce soir ». On écrit « l'application », « aujourd'hui ».
- On ne donne un nombre que là où il sert. La liste des cours ne compte plus les questions et les exercices de toute l'année.
- Les fiches reprennent les questions tombées au bac de 2004 à 2026 (Yane, 14 novembre). L'interface n'insiste plus sur « 2025 et 2026 ».
- Une question tombée au bac porte l'année quand la fiche la donne : « Tombé au BAC 2026 », « Tombé au BAC 2025 et 2026 ». Sans année dans la fiche : « Tombé au BAC ». Un exercice construit d'après un sujet le nomme : « D'après le BAC Polynésie 2025 ».
- Les questions d'une fiche s'affichent pour une note visée, et viser 14 demande aussi les questions de l'objectif 10. Les boutons s'appellent « Viser 10 », « Viser 14 », « Viser 18 ». La liste s'ouvre sur la note visée par l'élève.
- La phrase voulue par Yane pour la semaine : « Si tu rates une séance, son contenu se reporte sur la séance du lendemain. »

## Ce que ça change

Les textes des écrans de l'élève (`app/(appli)/app/**`, `components/appli/**`), `lib/commun/format.ts` (`etiquetteBac`, `etiquetteDapres`, `majusculeInitiale`) et ses tests. Les indices tirés de la liste des notions d'une question, écrite en minuscules dans la fiche, s'affichent avec une majuscule ; la fiche n'est pas modifiée.

## À confirmer

- L'ouverture de la liste des questions sur la note visée par l'élève est mon interprétation : Yane a demandé que « viser 14 » montre aussi les questions de l'objectif 10.
- Les pages du test de niveau d'avant le kit et les pages de l'administration n'ont pas été relues dans cette passe.
