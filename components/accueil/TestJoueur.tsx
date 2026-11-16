"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Question, type Reponse, type Vue } from "@/components/appli/QuizJoueur";
import { repondreTestAccueil } from "@/lib/serveur/commandes/test-accueil";

const NOMS = { qcm: "QCM", vrai_faux: "Vrai ou faux", trou: "Texte à trous", association: "Association", ordre: "Mise en ordre" };

// Le test de la page d'accueil : une question après l'autre, sans correction ni score. Le serveur garde les réponses ;
// le visiteur reçoit ses résultats dans l'application, une fois son compte créé.
export default function TestJoueur({ vueInitiale, rangInitial, total, limite }: { vueInitiale: Vue; rangInitial: number; total: number; limite: string }) {
  const router = useRouter();
  const [vue, setVue] = useState(vueInitiale);
  const [rang, setRang] = useState(rangInitial);
  const [choisi, setChoisi] = useState<number | boolean | null>(null);
  const [message, setMessage] = useState("");
  const [enCours, lance] = useTransition();
  const envoie = (reponse: Reponse) => {
    setMessage("");
    setChoisi(reponse.type === "qcm" ? reponse.choix : reponse.type === "vrai_faux" ? reponse.valeur : null);
    lance(async () => {
      const r = await repondreTestAccueil({ rang, reponse });
      if (!r.ok) { setMessage(r.message); setChoisi(null); return; }
      if (r.valeur.fini || !r.valeur.suivante) { router.replace("/test/resultats"); return; }
      setVue(r.valeur.suivante);
      setRang(r.valeur.rang);
      setChoisi(null);
    });
  };
  return (
    <div id="quiz">
      <div className="progression-q"><span>Question {rang + 1} sur {total}</span><div className="barre"><i style={{ width: `${(100 * rang) / total}%` }} /></div>
        <span className="petit discret">Fin du test à {new Date(limite).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></div>
      <div className="carte">
        <div className="meta" style={{ marginTop: 0 }}><span className={`niv niv-${vue.niveau}`}>Objectif {vue.niveau}</span><span>{NOMS[vue.type]}</span></div>
        <p className="quiz-q">{vue.q}</p>
        <Question key={rang} vue={vue} fige={enCours} envoie={envoie} choisi={choisi} />
        <p role="alert" className="petit" style={{ color: "var(--brique)", margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}
