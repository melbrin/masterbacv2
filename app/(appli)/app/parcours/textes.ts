// Les phrases du parcours : ce que chaque étape et chaque alerte disent à l'élève, et où elles mènent.
// Les règles sont dans lib/moteur/parcours.ts ; ici, seulement leur mise en mots (décision 0005 : langue simple).
import { ENTRAINEMENT, ancreDuTp } from "@/lib/commun/entrainement";
import { p2, pluriel } from "@/lib/commun/format";
import type { Alerte, EtapeParcours } from "@/lib/moteur";

export interface Affiche { titre: string; detail: string; href: string; bouton: string }
/** Une étape mise en mots, avec son genre : la page le pose sur le lien (`data-etape`). */
export type EtapeAffichee = Affiche & { type: EtapeParcours["type"] };

/** Les noms d'un défi du labo et d'un TP, pour les étapes d'entraînement (décision 0015). */
export interface NomsDesEtapes {
  defi: (id: string) => { simulation: string; titre: string } | null;
  tp: (id: string) => { titre: string; famille: string; minutes: number } | null;
}

export function afficheEtape(e: EtapeParcours, titreFiche: (n: number) => string, minutesSeance: number, noms: NomsDesEtapes): EtapeAffichee {
  return { type: e.type, ...phrases(e, titreFiche, minutesSeance, noms) };
}

function phrases(e: EtapeParcours, titreFiche: (n: number) => string, minutesSeance: number, noms: NomsDesEtapes): Affiche {
  switch (e.type) {
    case "calibrage":
      return e.raison === "jamais"
        ? { titre: "Passe ton test de calibrage", detail: "Dix minutes pour savoir où tu en es. Ton parcours part de ce test.", href: "/app/calibrage", bouton: "Faire le test" }
        : { titre: "Refais ton test de calibrage", detail: "Ton dernier test a plus de 30 jours. Refais-le pour mesurer tes progrès.", href: "/app/calibrage", bouton: "Refaire le test" };
    case "chapitres":
      return { titre: "Coche tes chapitres vus en classe", detail: "Ta séance du jour et ton parcours porteront sur ces chapitres.", href: "/app/cours", bouton: "Ouvrir les cours" };
    case "ds":
      return { titre: `Prépare ton DS : ${e.titre}`, detail: e.jours <= 0 ? "Ton devoir est aujourd'hui." : `Ton devoir est dans ${pluriel(e.jours, "jour", "jours")}.`, href: `/app/ds/${e.id}/${e.seance}`, bouton: "Faire cette séance" };
    case "seance":
      return { titre: "Fais ta séance du jour", detail: `${minutesSeance} minutes : un exercice sur papier, puis sa correction.`, href: "/app/seance", bouton: "Ouvrir ma séance" };
    case "carnet":
      return { titre: `Revois ${pluriel(e.nombre, "question", "questions")} de ton carnet d'erreurs`, detail: "Ce sont des questions que tu as ratées. Elles sont à revoir aujourd'hui.", href: "/app/carnet", bouton: "Ouvrir mon carnet" };
    case "passage":
      return { titre: `Passe le test de l'objectif ${e.niveau}`, detail: `${titreFiche(e.fiche)}. Cinq questions, quinze minutes.`, href: `/app/quiz/nouveau?fiche=${e.fiche}&passage=${e.niveau}`, bouton: "Passer le test" };
    case "objectif":
      return {
        titre: `Atteins l'objectif ${e.niveau} : ${titreFiche(e.fiche)}`,
        detail: e.faits
          ? `${pluriel(e.faits, "question travaillée", "questions travaillées")} sur ${e.total}, ${Math.round(e.taux * 100)} % de réussite. Il en faut 70 %.`
          : `${pluriel(e.total, "question", "questions")} à travailler. Il faut 70 % de réussite.`,
        href: `/app/fiche/${p2(e.fiche)}?onglet=questions&niveau=${e.niveau}`, bouton: "Travailler ce chapitre",
      };
    case "defi": {
      const nom = noms.defi(e.defi);
      return {
        titre: `Réussis un défi du labo : ${nom?.simulation ?? "une simulation"}`,
        detail: `${titreFiche(e.fiche)}, objectif ${e.niveau}${nom ? ` : « ${nom.titre} »` : ""}. Tu calcules, puis tu lances la simulation.`,
        href: `/app/labo/${e.simulation}/${e.rang}`, bouton: "Ouvrir le défi",
      };
    }
    case "tp": {
      const nom = noms.tp(e.tp);
      return {
        titre: `${e.reprise ? "Termine ton TP" : "Fais un TP"} : ${nom?.titre ?? "un TP de ce chapitre"}`,
        detail: e.reprise
          ? `${titreFiche(e.fiche)}. Tu le reprends là où tu l'as laissé.`
          : `${titreFiche(e.fiche)}${nom ? `, ${nom.minutes} minutes` : ""}. Tu manipules comme à l'épreuve d'ECE.`,
        href: e.reprise ? `/app/tp/essai/${e.reprise}` : `/app/tp#${ancreDuTp(e.tp)}`, bouton: e.reprise ? "Reprendre le TP" : "Voir ce TP",
      };
    }
  }
}

export interface Signal { ton: "alerte" | "bravo"; texte: string; href?: string; lien?: string }

export function afficheAlerte(a: Alerte, titreFiche: (n: number) => string, prevues: number): Signal {
  switch (a.type) {
    case "pause":
      return { ton: "alerte", texte: `Tu n'as pas fait de séance depuis ${a.jours} jours. Reprends aujourd'hui, une séance suffit pour repartir.`, href: "/app/seance", lien: "Faire ma séance" };
    case "rythme":
      return a.reste > a.joursRestants
        ? { ton: "alerte", texte: `Cette semaine, tu ne peux plus faire tes ${prevues} séances. Fais-en le plus possible d'ici dimanche.`, href: "/app/seance", lien: "Faire ma séance" }
        : { ton: "alerte", texte: `Pour tenir ton rythme, il te faut une séance par jour d'ici dimanche. Il t'en reste ${a.reste}.`, href: "/app/seance", lien: "Faire ma séance" };
    case "fragile":
      return { ton: "alerte", texte: `Un chapitre est fragile : ${titreFiche(a.fiche)}. ${Math.round(a.taux * 100)} % de réussite à l'objectif ${a.niveau}.`, href: `/app/fiche/${p2(a.fiche)}?onglet=questions&niveau=${a.niveau}`, lien: "Reprendre ses questions" };
    case "bravo":
      return { ton: "bravo", texte: `Bravo ! Tu as réussi le test de l'objectif ${a.niveau} : ${titreFiche(a.fiche)}.` };
    case "but":
      return { ton: "bravo", texte: "Tu as atteint ta note visée sur tous tes chapitres vus en classe. Tu peux viser plus haut dans ton profil, ou garder tes acquis en t'entraînant.", href: ENTRAINEMENT.href, lien: "M'entraîner" };
  }
}
