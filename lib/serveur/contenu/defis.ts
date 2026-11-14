import "server-only";
import type { Defi, Simulation } from "@/lib/commun/simulations";

// Les simulations du labo et leurs défis (décision 0011). Un énoncé est du contenu : il reste sur le serveur, qui ne
// l'envoie au navigateur qu'après avoir vérifié qu'il peut être montré (lib/serveur/defis.ts). Les règles de calcul,
// elles, sont dans lib/commun/simulations/ : le navigateur en a besoin pour animer.
// Chaque réponse est recalculée à part dans tests/unitaires/simulations.test.ts.

const g = { nom: "Intensité de la pesanteur g", valeur: "9,81 m·s⁻²" };
const cercle = [{ nom: "Distance du cercle", valeur: "4,60 m" }, { nom: "Hauteur du cercle", valeur: "3,05 m" }];
const son = { nom: "Célérité du son c", valeur: "340 m/s" };
const terre = [{ nom: "Rayon de la Terre R_T", valeur: "6 371 km" }, { nom: "Masse de la Terre M_T", valeur: "5,97 × 10²⁴ kg" }, { nom: "Constante de gravitation G", valeur: "6,67 × 10⁻¹¹ N·m²·kg⁻²" }];

export const SIMULATIONS: Simulation[] = [
  {
    id: "basket", nom: "Le basketteur", theme: "Chute libre", fiche: 1,
    accroche: "Calcule la vitesse du saut, puis celle du tir. Le ballon ne rentre que si ton calcul est juste.",
    defis: [
      {
        id: "basket-1", niveau: 10, titre: "Attraper le ballon au sommet", etat: "brouillon",
        enonce: "Une passe arrive au-dessus du joueur. Il saute à la verticale pour attraper le ballon au sommet de son saut, là où sa vitesse verticale s'annule. Avec quelle vitesse doit-il décoller ?",
        donnees: [{ nom: "Hauteur à gagner", valeur: "0,60 m" }, g],
        champs: [{ id: "v0", nom: "Vitesse au décollage", unite: "m/s", min: 2, max: 5, pas: 0.01 }],
        fixes: { mode: 0, cible: 0.6 },
        rappel: ["Vitesse", "Position"],
      },
      {
        id: "basket-2", niveau: 14, titre: "Le tir à 45°", etat: "brouillon",
        enonce: "Le joueur tire depuis la ligne des lancers francs. Le centre du ballon doit passer par le centre du cercle. Quelle vitesse doit-il donner au ballon ?",
        donnees: [{ nom: "Angle du tir avec l'horizontale α", valeur: "45°" }, { nom: "Hauteur de lâcher H", valeur: "2,20 m" }, ...cercle, g],
        champs: [{ id: "v0", nom: "Vitesse du ballon", unite: "m/s", min: 5, max: 10, pas: 0.01 }],
        fixes: { mode: 1, angle: 45, hauteur: 2.2 },
        rappel: ["Position", "Trajectoire"],
      },
      {
        id: "basket-3", niveau: 18, titre: "Le tir en suspension", etat: "brouillon",
        enonce: "Le joueur tire en sautant : il lâche le ballon plus haut, avec un angle plus grand. Le centre du ballon doit encore passer par le centre du cercle. Quelle vitesse doit-il donner au ballon ?",
        donnees: [{ nom: "Angle du tir avec l'horizontale α", valeur: "52°" }, { nom: "Hauteur de lâcher H", valeur: "2,60 m" }, ...cercle, g],
        champs: [{ id: "v0", nom: "Vitesse du ballon", unite: "m/s", min: 5, max: 10, pas: 0.01 }],
        fixes: { mode: 1, angle: 52, hauteur: 2.6 },
        rappel: ["Position", "Trajectoire"],
      },
    ],
  },
  {
    id: "largage", nom: "Le largage", theme: "Chute libre", fiche: 1,
    accroche: "Un drone lâche un colis en plein vol. Calcule où, à quelle vitesse ou à quelle altitude, pour qu'il tombe sur la cible.",
    defis: [
      {
        id: "largage-1", niveau: 10, titre: "Où lâcher le colis ?", etat: "brouillon",
        enonce: "Le drone vole à l'horizontale, à vitesse constante. Le colis doit tomber sur la cible. À quelle distance de la cible, mesurée au sol, le drone doit-il le lâcher ?",
        donnees: [{ nom: "Vitesse du drone v", valeur: "12 m/s" }, { nom: "Altitude H", valeur: "20 m" }, g],
        champs: [{ id: "d", nom: "Distance de largage", unite: "m", min: 0, max: 60, pas: 0.1 }],
        fixes: { v: 12, H: 20 },
        rappel: ["Position", "Portée"],
      },
      {
        id: "largage-2", niveau: 14, titre: "À quelle vitesse voler ?", etat: "brouillon",
        enonce: "Le drone doit lâcher le colis 60 m avant la cible. À quelle vitesse doit-il voler pour que le colis tombe dessus ?",
        donnees: [{ nom: "Distance de largage", valeur: "60 m" }, { nom: "Altitude H", valeur: "45 m" }, g],
        champs: [{ id: "v", nom: "Vitesse du drone", unite: "m/s", min: 5, max: 40, pas: 0.1 }],
        fixes: { d: 60, H: 45 },
        rappel: ["Position", "Portée"],
      },
      {
        id: "largage-3", niveau: 18, titre: "À quelle altitude voler ?", etat: "brouillon",
        enonce: "Le drone vole à 15 m/s et doit lâcher le colis 30 m avant la cible. À quelle altitude doit-il voler pour que le colis tombe dessus ?",
        donnees: [{ nom: "Vitesse du drone v", valeur: "15 m/s" }, { nom: "Distance de largage", valeur: "30 m" }, g],
        champs: [{ id: "H", nom: "Altitude du drone", unite: "m", min: 5, max: 80, pas: 0.1 }],
        fixes: { v: 15, d: 30 },
        rappel: ["Position", "Trajectoire", "Portée"],
      },
    ],
  },
  {
    id: "satellite", nom: "Le satellite", theme: "Gravitation", fiche: 3,
    accroche: "Donne la bonne vitesse au satellite : trop lent, il retombe ; trop rapide, il s'éloigne. Puis trouve la durée d'un tour et l'altitude géostationnaire.",
    defis: [
      {
        id: "satellite-1", niveau: 10, titre: "Mettre un satellite en orbite", etat: "brouillon",
        enonce: "Une fusée lâche un satellite à 400 km d'altitude, à l'horizontale. Pour rester sur une orbite circulaire à cette altitude, il doit partir avec la bonne vitesse. Laquelle ?",
        donnees: [{ nom: "Altitude h", valeur: "400 km" }, ...terre],
        champs: [{ id: "v", nom: "Vitesse du satellite", unite: "km/s", min: 5, max: 10, pas: 0.01 }],
        fixes: { mode: 0, h: 400, tol: 0.015 },
        rappel: ["Satellite de la Terre", "Vitesse"],
      },
      {
        id: "satellite-2", niveau: 14, titre: "La durée d'un tour", etat: "brouillon",
        enonce: "Un satellite d'observation tourne à 700 km d'altitude, sur une orbite circulaire. Il prend une photo, puis doit en prendre une autre exactement un tour plus tard. Combien de temps dure un tour ?",
        donnees: [{ nom: "Altitude h", valeur: "700 km" }, ...terre],
        champs: [{ id: "T", nom: "Durée d'un tour", unite: "min", min: 60, max: 200, pas: 0.1 }],
        fixes: { mode: 1, h: 700, tol: 0.3 },
        rappel: ["Satellite de la Terre", "Période de révolution"],
      },
      {
        id: "satellite-3", niveau: 18, titre: "Le satellite géostationnaire", etat: "brouillon",
        enonce: "Un satellite de télévision doit rester au-dessus de la même station, sur l'équateur. Il doit donc faire un tour en un jour sidéral, comme la Terre. À quelle altitude faut-il le placer ?",
        donnees: [{ nom: "Jour sidéral T", valeur: "86 164 s" }, ...terre],
        champs: [{ id: "h", nom: "Altitude du satellite", unite: "km", min: 1000, max: 60000, pas: 10 }],
        fixes: { mode: 2, tol: 2 },
        rappel: ["Satellite de la Terre", "Troisième loi de Kepler", "Satellite géostationnaire"],
      },
    ],
  },
  {
    id: "temperature", nom: "Le thé", theme: "Température", fiche: 5,
    accroche: "Calcule combien de temps chauffer l'eau, puis quand boire ton thé. Trop tôt il brûle, trop tard il est froid.",
    defis: [
      {
        id: "temperature-1", niveau: 10, titre: "Chauffer l'eau", etat: "brouillon",
        enonce: "Une bouilloire chauffe de l'eau pour un thé qui s'infuse à 90 °C. On néglige les pertes : toute l'énergie électrique chauffe l'eau. Combien de temps faut-il chauffer ?",
        donnees: [{ nom: "Masse d'eau m", valeur: "0,50 kg" }, { nom: "Capacité thermique massique c", valeur: "4 180 J·kg⁻¹·K⁻¹" }, { nom: "Puissance de la bouilloire P", valeur: "2 000 W" }, { nom: "Température de départ", valeur: "20 °C" }, { nom: "Température visée", valeur: "90 °C" }],
        champs: [{ id: "chauffe", nom: "Durée de chauffe", unite: "s", min: 10, max: 300, pas: 1 }],
        fixes: { mode: 0, m: 0.5, c: 4180, P: 2000, theta0: 20, cible: 90, tol: 1 },
        rappel: ["Système incompressible", "Flux thermique"],
      },
      {
        id: "temperature-2", niveau: 14, titre: "Quand boire le thé ?", etat: "brouillon",
        enonce: "Le thé est servi à 90 °C dans une pièce à 20 °C. Il refroidit au contact de l'air, avec un temps caractéristique de 12 min. Il est bon à boire à 60 °C. Au bout de combien de temps faut-il le boire ?",
        donnees: [{ nom: "Température de départ θ_0", valeur: "90 °C" }, { nom: "Température de la pièce θ_th", valeur: "20 °C" }, { nom: "Temps caractéristique τ", valeur: "12 min" }, { nom: "Température visée", valeur: "60 °C" }],
        champs: [{ id: "date", nom: "Temps d'attente", unite: "min", min: 0, max: 60, pas: 0.1 }],
        fixes: { mode: 1, theta0: 90, thetaTh: 20, tau: 720, cible: 60, tol: 1 },
        rappel: ["Contact avec un thermostat"],
      },
      {
        id: "temperature-3", niveau: 18, titre: "Trouver le temps caractéristique", etat: "brouillon",
        enonce: "Le thé est servi à 85 °C dans une tasse, dans une pièce à 20 °C. Il faut d'abord calculer le temps caractéristique du refroidissement. Le thé est bon à boire à 50 °C. Au bout de combien de temps faut-il le boire ?",
        donnees: [{ nom: "Masse de thé m", valeur: "0,25 kg" }, { nom: "Capacité thermique massique c", valeur: "4 180 J·kg⁻¹·K⁻¹" }, { nom: "Coefficient d'échange h", valeur: "25 W·m⁻²·K⁻¹" }, { nom: "Surface d'échange S", valeur: "0,030 m²" }, { nom: "Température de départ θ_0", valeur: "85 °C" }, { nom: "Température de la pièce θ_th", valeur: "20 °C" }, { nom: "Température visée", valeur: "50 °C" }],
        champs: [{ id: "date", nom: "Temps d'attente", unite: "min", min: 0, max: 60, pas: 0.1 }],
        fixes: { mode: 1, theta0: 85, thetaTh: 20, m: 0.25, c: 4180, h: 25, S: 0.03, cible: 50, tol: 1 },
        rappel: ["Contact avec un thermostat"],
      },
    ],
  },
  {
    id: "doppler", nom: "L'effet Doppler", theme: "Son", fiche: 6,
    accroche: "Un véhicule fonce vers toi : le son que tu entends est plus aigu. Calcule sa vitesse ou la fréquence émise pour entendre la bonne note.",
    defis: [
      {
        id: "doppler-1", niveau: 10, titre: "La voiture de course", etat: "brouillon",
        enonce: "Une voiture de course fonce vers les tribunes. Son moteur émet un son de 300 Hz. À quelle vitesse doit-elle rouler pour que le public entende 400 Hz ?",
        donnees: [{ nom: "Fréquence émise f_E", valeur: "300 Hz" }, { nom: "Fréquence à entendre f_R", valeur: "400 Hz" }, son],
        champs: [{ id: "v", nom: "Vitesse de la voiture", unite: "m/s", min: 0, max: 150, pas: 0.1 }],
        fixes: { fE: 300, c: 340, cible: 400, tol: 2 },
        rappel: ["Effet Doppler"],
      },
      {
        id: "doppler-2", niveau: 14, titre: "Le klaxon du train", etat: "brouillon",
        enonce: "Un train entre en gare à 80 m/s. Le chef de gare doit entendre exactement un la, à 440 Hz. Quelle fréquence le klaxon doit-il émettre ?",
        donnees: [{ nom: "Vitesse du train v", valeur: "80 m/s" }, { nom: "Fréquence à entendre f_R", valeur: "440 Hz" }, son],
        champs: [{ id: "fE", nom: "Fréquence émise", unite: "Hz", min: 200, max: 600, pas: 0.1 }],
        fixes: { v: 80, c: 340, cible: 440, tol: 1 },
        rappel: ["Effet Doppler"],
      },
      {
        id: "doppler-3", niveau: 18, titre: "Le radar sonore", etat: "brouillon",
        enonce: "Une sirène émet à 400 Hz. Le radar sonore placé devant elle reçoit 425 Hz. Règle la vitesse du véhicule, en kilomètres par heure, pour retrouver cette mesure.",
        donnees: [{ nom: "Fréquence émise f_E", valeur: "400 Hz" }, { nom: "Fréquence reçue f_R", valeur: "425 Hz" }, son],
        champs: [{ id: "vkmh", nom: "Vitesse du véhicule", unite: "km/h", min: 0, max: 300, pas: 0.1 }],
        fixes: { fE: 400, c: 340, cible: 425, tol: 0.5 },
        rappel: ["Effet Doppler"],
      },
    ],
  },
  {
    id: "rc", nom: "Le circuit RC", theme: "Électricité", fiche: 8,
    accroche: "Choisis la résistance ou la capacité pour que la lampe s'allume, ou s'éteigne, exactement à la bonne date.",
    defis: [
      {
        id: "rc-1", niveau: 10, titre: "Régler la constante de temps", etat: "brouillon",
        enonce: "On charge le condensateur. La lampe témoin s'allume quand la tension u_C atteint 63 % de E. Elle doit s'allumer 2,0 s après la fermeture de l'interrupteur. Quelle résistance faut-il choisir ?",
        donnees: [{ nom: "Tension du générateur E", valeur: "5,0 V" }, { nom: "Capacité C", valeur: "1 000 µF" }, { nom: "Seuil : 63 % de E", valeur: "3,16 V" }],
        champs: [{ id: "R", nom: "Résistance R", unite: "kΩ", min: 0.1, max: 20, pas: 0.01 }],
        fixes: { E: 5, C: 1000, seuil: 5 * (1 - Math.exp(-1)), tCible: 2, tol: 0.05, decharge: 0 },
        rappel: ["Charge sous $E$"],
      },
      {
        id: "rc-2", niveau: 14, titre: "Le minuteur", etat: "brouillon",
        enonce: "Un minuteur allume une lampe quand la tension u_C atteint 4,0 V. La lampe doit s'allumer 10 s après la fermeture de l'interrupteur. Quelle résistance faut-il choisir ?",
        donnees: [{ nom: "Tension du générateur E", valeur: "6,0 V" }, { nom: "Capacité C", valeur: "470 µF" }, { nom: "Seuil U_s", valeur: "4,0 V" }],
        champs: [{ id: "R", nom: "Résistance R", unite: "kΩ", min: 1, max: 50, pas: 0.1 }],
        fixes: { E: 6, C: 470, seuil: 4, tCible: 10, tol: 0.15, decharge: 0 },
        rappel: ["Charge sous $E$", "Instant d’un seuil $U_s$"],
      },
      {
        id: "rc-3", niveau: 18, titre: "La durée de l'éclair", etat: "brouillon",
        enonce: "Le condensateur d'un flash est chargé sous 300 V. Il se décharge dans la lampe, qui s'éteint quand la tension tombe à 100 V. L'éclair doit durer 0,50 s. Quelle capacité faut-il choisir ?",
        donnees: [{ nom: "Tension de départ U_0", valeur: "300 V" }, { nom: "Résistance de la lampe R", valeur: "2,0 kΩ" }, { nom: "Seuil U_s", valeur: "100 V" }],
        champs: [{ id: "C", nom: "Capacité C", unite: "µF", min: 10, max: 1000, pas: 1 }],
        fixes: { E: 300, R: 2, seuil: 100, tCible: 0.5, tol: 0.01, decharge: 1 },
        rappel: ["Décharge", "Instant d’un seuil $U_s$"],
      },
    ],
  },
  {
    id: "dilution", nom: "Préparer une solution", theme: "Solutions", fiche: 9,
    accroche: "Prélève, complète à l'eau, compare les couleurs. Ta solution doit avoir exactement la concentration demandée.",
    defis: [
      {
        id: "dilution-1", niveau: 10, titre: "Diluer une solution", etat: "brouillon",
        enonce: "On dispose d'une solution mère de sulfate de cuivre de concentration 0,50 mol/L. On veut préparer 100,0 mL d'une solution fille de concentration 0,10 mol/L. Quel volume de solution mère faut-il prélever ?",
        donnees: [{ nom: "Concentration de la solution mère", valeur: "0,50 mol/L" }, { nom: "Volume de la fiole jaugée", valeur: "100,0 mL" }, { nom: "Concentration voulue", valeur: "0,10 mol/L" }],
        champs: [{ id: "V", nom: "Volume à prélever", unite: "mL", min: 1, max: 50, pas: 0.1 }],
        fixes: { mode: 0, Cmere: 0.5, Vfille: 100, cible: 0.1, tol: 0.02, milli: 0, teinte: 0 },
        rappel: ["Dilution"],
      },
      {
        id: "dilution-2", niveau: 14, titre: "Choisir la fiole jaugée", etat: "brouillon",
        enonce: "Avec une pipette jaugée, on prélève 5,0 mL d'une solution mère de permanganate de potassium à 20 mmol/L. On veut une solution fille à 2,0 mmol/L. Quel doit être le volume de la fiole jaugée ?",
        donnees: [{ nom: "Concentration de la solution mère", valeur: "20 mmol/L" }, { nom: "Volume prélevé", valeur: "5,0 mL" }, { nom: "Concentration voulue", valeur: "2,0 mmol/L" }],
        champs: [{ id: "Vfille", nom: "Volume de la fiole jaugée", unite: "mL", min: 10, max: 500, pas: 1 }],
        fixes: { mode: 1, Cmere: 0.02, V: 5, cible: 0.002, tol: 0.02, milli: 1, teinte: 1 },
        rappel: ["Dilution"],
      },
      {
        id: "dilution-3", niveau: 18, titre: "Dissoudre un solide", etat: "brouillon",
        enonce: "On veut préparer 100,0 mL d'une solution de sulfate de cuivre de concentration 0,100 mol/L, en dissolvant du sulfate de cuivre pentahydraté solide. Quelle masse de solide faut-il peser ?",
        donnees: [{ nom: "Masse molaire du solide M", valeur: "249,7 g/mol" }, { nom: "Volume de la fiole jaugée", valeur: "100,0 mL" }, { nom: "Concentration voulue", valeur: "0,100 mol/L" }],
        champs: [{ id: "m", nom: "Masse à peser", unite: "g", min: 0.1, max: 20, pas: 0.01 }],
        fixes: { mode: 2, M: 249.7, Vfille: 100, cible: 0.1, tol: 0.02, milli: 0, teinte: 0 },
        rappel: ["Quantité de matière"],
      },
    ],
  },
  {
    id: "ph", nom: "Le pH", theme: "Acides et bases", fiche: 9,
    accroche: "Prépare la solution, plonge la sonde : le pH-mètre doit afficher exactement le pH demandé.",
    defis: [
      {
        id: "ph-1", niveau: 10, titre: "Un acide fort", etat: "brouillon",
        enonce: "On veut préparer une solution d'acide chlorhydrique de pH égal à 2,0. Dans l'eau, cet acide fort est entièrement dissocié : la concentration en ions oxonium est égale à la concentration apportée. Quelle concentration faut-il préparer ?",
        donnees: [{ nom: "pH voulu", valeur: "2,0" }, { nom: "Concentration standard c°", valeur: "1 mol/L" }],
        champs: [{ id: "C", nom: "Concentration de l'acide", unite: "mmol/L", min: 0.01, max: 1000, pas: 0.01 }],
        fixes: { mode: 0, cible: 2, tol: 0.03 },
        rappel: ["pH"],
      },
      {
        id: "ph-2", niveau: 14, titre: "Un mélange acide et base", etat: "brouillon",
        enonce: "Un mélange contient un acide AH et sa base conjuguée A⁻. Le pK_A du couple vaut 4,8. Quel rapport [A⁻]/[AH] faut-il pour que le pH du mélange soit égal à 5,2 ?",
        donnees: [{ nom: "pK_A du couple", valeur: "4,8" }, { nom: "pH voulu", valeur: "5,2" }],
        champs: [{ id: "rapport", nom: "Rapport [A⁻]/[AH]", unite: "", min: 0.01, max: 100, pas: 0.01 }],
        fixes: { mode: 1, pKA: 4.8, cible: 5.2, tol: 0.03 },
        rappel: ["Prédominance"],
      },
      {
        id: "ph-3", niveau: 18, titre: "Diluer pour changer le pH", etat: "brouillon",
        enonce: "Une solution d'acide chlorhydrique a un pH de 2,0. On la dilue avec de l'eau pour obtenir un pH de 3,5. Par combien faut-il diviser sa concentration ? C'est le facteur de dilution.",
        donnees: [{ nom: "pH de départ", valeur: "2,0" }, { nom: "pH voulu", valeur: "3,5" }],
        champs: [{ id: "F", nom: "Facteur de dilution", unite: "", min: 1, max: 1000, pas: 0.1 }],
        fixes: { mode: 2, pH0: 2, cible: 3.5, tol: 0.03 },
        rappel: ["pH", "Dilution"],
      },
    ],
  },
  {
    id: "titrage", nom: "Le titrage", theme: "Chimie", fiche: 10,
    accroche: "Calcule le volume à verser : la solution doit changer de couleur à la dernière goutte, ni avant ni après.",
    defis: [
      {
        id: "titrage-1", niveau: 10, titre: "Le volume équivalent", etat: "brouillon",
        enonce: "On titre de l'acide chlorhydrique par de la soude : H₃O⁺ + HO⁻ → 2 H₂O. Un indicateur coloré, incolore au départ, devient rose à l'équivalence. Quel volume de soude faut-il verser pour atteindre l'équivalence ?",
        donnees: [{ nom: "Concentration de l'acide C_A", valeur: "0,080 mol/L" }, { nom: "Volume d'acide titré V_A", valeur: "20,0 mL" }, { nom: "Concentration de la soude C_B", valeur: "0,10 mol/L" }],
        champs: [{ id: "V", nom: "Volume de soude à verser", unite: "mL", min: 0, max: 25, pas: 0.1 }],
        fixes: { CA: 0.08, VA: 20, CB: 0.1, a: 1, b: 1, tol: 0.15, couleur: 0 },
        rappel: ["Équivalence", "Titrage colorimétrique"],
      },
      {
        id: "titrage-2", niveau: 14, titre: "Préparer la soude", etat: "brouillon",
        enonce: "On titre de l'acide éthanoïque par de la soude : CH₃COOH + HO⁻ → CH₃COO⁻ + H₂O. Pour une lecture précise, on veut que la solution change de couleur à 12,0 mL de soude versée. Quelle concentration doit avoir la soude ?",
        donnees: [{ nom: "Concentration de l'acide C_A", valeur: "0,060 mol/L" }, { nom: "Volume d'acide titré V_A", valeur: "20,0 mL" }, { nom: "Volume versé à l'équivalence V_E", valeur: "12,0 mL" }],
        champs: [{ id: "CB", nom: "Concentration de la soude", unite: "mol/L", min: 0.01, max: 0.5, pas: 0.001 }],
        fixes: { CA: 0.06, VA: 20, Vfixe: 12, a: 1, b: 1, tol: 0.15, couleur: 0 },
        rappel: ["Équivalence", "Titrage colorimétrique"],
      },
      {
        id: "titrage-3", niveau: 18, titre: "Le titrage au permanganate", etat: "brouillon",
        enonce: "On titre des ions fer(II) par une solution violette de permanganate de potassium : MnO₄⁻ + 5 Fe²⁺ + 8 H⁺ → Mn²⁺ + 5 Fe³⁺ + 4 H₂O. Avant l'équivalence, le permanganate versé est consommé : sa couleur disparaît. À l'équivalence, la couleur violette persiste. Quel volume faut-il verser pour atteindre l'équivalence ?",
        donnees: [{ nom: "Concentration des ions fer(II) C_A", valeur: "0,050 mol/L" }, { nom: "Volume titré V_A", valeur: "20,0 mL" }, { nom: "Concentration du permanganate C_B", valeur: "0,020 mol/L" }],
        champs: [{ id: "V", nom: "Volume de permanganate à verser", unite: "mL", min: 0, max: 25, pas: 0.1 }],
        fixes: { CA: 0.05, VA: 20, CB: 0.02, a: 5, b: 1, tol: 0.15, couleur: 1 },
        rappel: ["Équivalence", "Titrage colorimétrique"],
      },
    ],
  },
  {
    id: "beer", nom: "Le spectrophotomètre", theme: "Dosage par étalonnage", fiche: 10,
    accroche: "Plus la solution est concentrée, plus elle absorbe la lumière. Prépare celle qui donne exactement l'absorbance demandée.",
    defis: [
      {
        id: "beer-1", niveau: 10, titre: "La bonne concentration", etat: "brouillon",
        enonce: "Une espèce colorée suit la loi de Beer-Lambert. Une solution étalon de concentration 2,0 mmol/L a une absorbance de 0,50. On veut une solution de la même espèce dont l'absorbance vaut 0,80. Quelle concentration doit-elle avoir ?",
        donnees: [{ nom: "Concentration de l'étalon", valeur: "2,0 mmol/L" }, { nom: "Absorbance de l'étalon", valeur: "0,50" }, { nom: "Absorbance voulue", valeur: "0,80" }],
        champs: [{ id: "C", nom: "Concentration de la solution", unite: "mmol/L", min: 0.1, max: 10, pas: 0.01 }],
        fixes: { mode: 0, k: 0.25, cible: 0.8, tol: 0.02 },
        rappel: ["Loi de Beer-Lambert"],
      },
      {
        id: "beer-2", niveau: 14, titre: "La solution diluée dix fois", etat: "brouillon",
        enonce: "La droite d'étalonnage d'une espèce colorée a pour équation A = k × C, avec k = 0,15 L/mmol. Une solution commerciale est diluée 10 fois avant la mesure. Quelle doit être la concentration de la solution commerciale pour que la solution diluée ait une absorbance de 0,45 ?",
        donnees: [{ nom: "Coefficient k", valeur: "0,15 L/mmol" }, { nom: "Facteur de dilution", valeur: "10" }, { nom: "Absorbance voulue", valeur: "0,45" }],
        champs: [{ id: "Cmere", nom: "Concentration de la solution commerciale", unite: "mmol/L", min: 1, max: 100, pas: 0.1 }],
        fixes: { mode: 1, k: 0.15, F: 10, cible: 0.45, tol: 0.015 },
        rappel: ["Loi de Beer-Lambert"],
      },
      {
        id: "beer-3", niveau: 18, titre: "Préparer la solution à mesurer", etat: "brouillon",
        enonce: "La droite d'étalonnage a pour équation A = k × C, avec k = 0,15 L/mmol. On dispose d'une solution mère à 20 mmol/L et d'une fiole jaugée de 50,0 mL. Quel volume de solution mère faut-il prélever pour que la solution fille ait une absorbance de 0,60 ?",
        donnees: [{ nom: "Coefficient k", valeur: "0,15 L/mmol" }, { nom: "Concentration de la solution mère", valeur: "20 mmol/L" }, { nom: "Volume de la fiole jaugée", valeur: "50,0 mL" }, { nom: "Absorbance voulue", valeur: "0,60" }],
        champs: [{ id: "V", nom: "Volume à prélever", unite: "mL", min: 1, max: 25, pas: 0.1 }],
        fixes: { mode: 2, k: 0.15, Cmere: 20, Vfille: 50, cible: 0.6, tol: 0.015 },
        rappel: ["Loi de Beer-Lambert"],
      },
    ],
  },
  {
    id: "cinetique", nom: "La cinétique", theme: "Vitesse de réaction", fiche: 11,
    accroche: "La couleur s'efface à mesure que le réactif disparaît. Calcule quand arrêter la réaction, ou à quelle vitesse elle doit aller.",
    defis: [
      {
        id: "cinetique-1", niveau: 10, titre: "Le temps de demi-réaction", etat: "brouillon",
        enonce: "Une espèce colorée disparaît en suivant une loi d'ordre 1, avec une constante de vitesse k = 0,023 s⁻¹. Au bout de combien de temps sa concentration est-elle divisée par deux ?",
        donnees: [{ nom: "Constante de vitesse k", valeur: "0,023 s⁻¹" }, { nom: "Part du réactif restante", valeur: "50 %" }],
        champs: [{ id: "date", nom: "Durée de la réaction", unite: "s", min: 1, max: 200, pas: 0.1 }],
        fixes: { k: 0.023, cible: 0.5, tol: 0.006, unite: 0 },
        rappel: ["Loi d’ordre 1", "Temps de demi-réaction"],
      },
      {
        id: "cinetique-2", niveau: 14, titre: "Arrêter la réaction à temps", etat: "brouillon",
        enonce: "Une réaction suit une loi d'ordre 1, avec une constante de vitesse k = 0,050 min⁻¹. On l'arrête quand il ne reste que 10 % du réactif. Au bout de combien de temps ?",
        donnees: [{ nom: "Constante de vitesse k", valeur: "0,050 min⁻¹" }, { nom: "Part du réactif restante", valeur: "10 %" }],
        champs: [{ id: "date", nom: "Durée de la réaction", unite: "min", min: 1, max: 200, pas: 0.1 }],
        fixes: { k: 0.05, cible: 0.1, tol: 0.003, unite: 1 },
        rappel: ["Loi d’ordre 1"],
      },
      {
        id: "cinetique-3", niveau: 18, titre: "Choisir la vitesse", etat: "brouillon",
        enonce: "Une réaction suit une loi d'ordre 1. On veut qu'il ne reste que 10 % du réactif au bout de 5,0 min. Quelle doit être sa constante de vitesse ?",
        donnees: [{ nom: "Durée de la réaction", valeur: "5,0 min" }, { nom: "Part du réactif restante", valeur: "10 %" }],
        champs: [{ id: "k", nom: "Constante de vitesse k", unite: "min⁻¹", min: 0.01, max: 2, pas: 0.001 }],
        fixes: { dateFixe: 5, cible: 0.1, tol: 0.003, unite: 1 },
        rappel: ["Loi d’ordre 1"],
      },
    ],
  },
  {
    id: "radio", nom: "La décroissance radioactive", theme: "Radioactivité", fiche: 11,
    accroche: "Les noyaux se désintègrent un à un. Calcule la date, l'âge ou la demi-vie pour tomber sur la bonne part restante.",
    defis: [
      {
        id: "radio-1", niveau: 10, titre: "Deux demi-vies", etat: "brouillon",
        enonce: "Un échantillon contient de l'iode 131, dont la demi-vie est de 8,0 jours. Au bout de combien de temps ne reste-t-il qu'un quart des noyaux ?",
        donnees: [{ nom: "Demi-vie de l'iode 131", valeur: "8,0 jours" }, { nom: "Part des noyaux restants", valeur: "25 %" }],
        champs: [{ id: "date", nom: "Durée d'attente", unite: "jours", min: 0, max: 60, pas: 0.1 }],
        fixes: { demiVie: 8, cible: 0.25, tol: 0.006, unite: 0, activite: 0 },
        rappel: ["Décroissance"],
      },
      {
        id: "radio-2", niveau: 14, titre: "L'âge d'un os", etat: "brouillon",
        enonce: "Un os ancien contient du carbone 14, dont la demi-vie est de 5 730 ans. Son activité vaut 60 % de celle d'un os actuel. Quel est l'âge de cet os ?",
        donnees: [{ nom: "Demi-vie du carbone 14", valeur: "5 730 ans" }, { nom: "Activité restante", valeur: "60 %" }],
        champs: [{ id: "date", nom: "Âge de l'os", unite: "ans", min: 0, max: 20000, pas: 10 }],
        fixes: { demiVie: 5730, cible: 0.6, tol: 0.005, unite: 1, activite: 1 },
        rappel: ["Décroissance"],
      },
      {
        id: "radio-3", niveau: 18, titre: "Choisir la demi-vie", etat: "brouillon",
        enonce: "Pour un examen médical, on cherche un traceur dont l'activité tombe à 10 % de sa valeur de départ en 24 h. Quelle demi-vie doit-il avoir ?",
        donnees: [{ nom: "Durée", valeur: "24 h" }, { nom: "Activité restante", valeur: "10 %" }],
        champs: [{ id: "demiVie", nom: "Demi-vie du traceur", unite: "h", min: 1, max: 30, pas: 0.1 }],
        fixes: { dateFixe: 24, cible: 0.1, tol: 0.0045, unite: 2, activite: 1 },
        rappel: ["Décroissance"],
      },
    ],
  },
  {
    id: "pile", nom: "La pile et l'électrolyse", theme: "Oxydoréduction", fiche: 12,
    accroche: "Les électrons circulent, le zinc se consomme, le cuivre se dépose. Calcule le courant, la masse ou la durée.",
    defis: [
      {
        id: "pile-1", niveau: 10, titre: "Tenir dix heures", etat: "brouillon",
        enonce: "Une pile de capacité 2,0 A·h alimente une lampe. La lampe doit rester allumée 10 h, et on veut qu'elle reçoive le plus de courant possible. Quelle intensité la pile peut-elle débiter ?",
        donnees: [{ nom: "Capacité de la pile Q", valeur: "2,0 A·h" }, { nom: "Durée voulue", valeur: "10 h" }],
        champs: [{ id: "I", nom: "Intensité du courant", unite: "A", min: 0.01, max: 2, pas: 0.01 }],
        fixes: { mode: 0, Q: 2, dureeVisee: 10, tol: 0.02 },
        rappel: ["Pile", "Énergie électrique"],
      },
      {
        id: "pile-2", niveau: 14, titre: "Assez de zinc", etat: "brouillon",
        enonce: "Dans une pile, le zinc de l'électrode est consommé : Zn → Zn²⁺ + 2 e⁻. La pile doit débiter un courant de 0,50 A pendant 1,0 h. Quelle masse de zinc faut-il, au plus juste ?",
        donnees: [{ nom: "Intensité du courant I", valeur: "0,50 A" }, { nom: "Durée voulue", valeur: "1,0 h" }, { nom: "Masse molaire du zinc", valeur: "65,4 g/mol" }, { nom: "Constante de Faraday F", valeur: "96 500 C/mol" }],
        champs: [{ id: "m", nom: "Masse de zinc", unite: "g", min: 0.05, max: 5, pas: 0.01 }],
        fixes: { mode: 1, I: 0.5, M: 65.4, z: 2, dureeVisee: 1, tol: 0.02 },
        rappel: ["Pile", "Oxydoréduction"],
      },
      {
        id: "pile-3", niveau: 18, titre: "Cuivrer une clé", etat: "brouillon",
        enonce: "On recouvre une clé de cuivre par électrolyse : Cu²⁺ + 2 e⁻ → Cu. Le générateur impose un courant de 0,80 A. Combien de temps faut-il pour déposer 0,50 g de cuivre ?",
        donnees: [{ nom: "Intensité du courant I", valeur: "0,80 A" }, { nom: "Masse de cuivre voulue", valeur: "0,50 g" }, { nom: "Masse molaire du cuivre", valeur: "63,5 g/mol" }, { nom: "Constante de Faraday F", valeur: "96 500 C/mol" }],
        champs: [{ id: "dureeMin", nom: "Durée de l'électrolyse", unite: "min", min: 1, max: 120, pas: 0.1 }],
        fixes: { mode: 2, I: 0.8, M: 63.5, z: 2, masseVisee: 0.5, tol: 0.02 },
        rappel: ["Électrolyse", "Oxydoréduction"],
      },
    ],
  },
  {
    id: "synthese", nom: "La synthèse", theme: "Chimie organique", fiche: 13,
    accroche: "Chauffe, filtre, pèse. Calcule ce qu'il faut engager pour récupérer exactement la quantité de produit demandée.",
    defis: [
      {
        id: "synthese-1", niveau: 10, titre: "La quantité de réactif", etat: "brouillon",
        enonce: "On prépare de l'aspirine à partir d'acide salicylique, le réactif limitant. Une mole d'acide salicylique donne au plus une mole d'aspirine. La réaction est supposée totale. Quelle quantité d'acide salicylique faut-il pour obtenir 9,0 g d'aspirine ?",
        donnees: [{ nom: "Masse molaire de l'aspirine", valeur: "180 g/mol" }, { nom: "Masse d'aspirine voulue", valeur: "9,0 g" }],
        champs: [{ id: "n", nom: "Quantité d'acide salicylique", unite: "mol", min: 0.001, max: 0.5, pas: 0.001 }],
        fixes: { mode: 0, M: 180, cible: 9, tol: 0.02 },
        rappel: ["Rendement"],
      },
      {
        id: "synthese-2", niveau: 14, titre: "Compter avec le rendement", etat: "brouillon",
        enonce: "La synthèse de l'aspirine a un rendement de 80 %. Une mole d'acide salicylique, le réactif limitant, donne au plus une mole d'aspirine. Quelle masse d'acide salicylique faut-il engager pour obtenir 5,0 g d'aspirine ?",
        donnees: [{ nom: "Rendement", valeur: "80 %" }, { nom: "Masse molaire de l'acide salicylique", valeur: "138 g/mol" }, { nom: "Masse molaire de l'aspirine", valeur: "180 g/mol" }, { nom: "Masse d'aspirine voulue", valeur: "5,0 g" }],
        champs: [{ id: "m", nom: "Masse d'acide salicylique", unite: "g", min: 0.1, max: 50, pas: 0.01 }],
        fixes: { mode: 1, Mr: 138, Mp: 180, rendement: 0.8, cible: 5, tol: 0.02 },
        rappel: ["Rendement"],
      },
      {
        id: "synthese-3", niveau: 18, titre: "Une synthèse en deux étapes", etat: "brouillon",
        enonce: "Une synthèse se fait en deux étapes, de rendements 80 % puis 60 %. À chaque étape, une mole de réactif donne au plus une mole de produit. Quelle quantité de réactif de départ faut-il pour obtenir 0,024 mol de produit final ?",
        donnees: [{ nom: "Rendement de la première étape", valeur: "80 %" }, { nom: "Rendement de la deuxième étape", valeur: "60 %" }, { nom: "Quantité de produit voulue", valeur: "0,024 mol" }],
        champs: [{ id: "n", nom: "Quantité de réactif de départ", unite: "mol", min: 0.001, max: 0.5, pas: 0.001 }],
        fixes: { mode: 2, rendement: 0.8, rendement2: 0.6, cible: 0.024, tol: 0.02 },
        rappel: ["Rendement"],
      },
    ],
  },
];

export const simulation = (id: string): Simulation | null => SIMULATIONS.find((s) => s.id === id) ?? null;

/** Un défi et sa simulation, à partir de l'identifiant du défi. */
export function defi(id: string): { simulation: Simulation; defi: Defi; rang: number } | null {
  for (const s of SIMULATIONS) {
    const rang = s.defis.findIndex((d) => d.id === id);
    if (rang >= 0) return { simulation: s, defi: s.defis[rang], rang };
  }
  return null;
}
