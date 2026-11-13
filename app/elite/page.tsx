"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import katex from "katex";
import "katex/dist/katex.min.css";
import ContenuHtml from "@/components/socle/ContenuHtml";

/* ── Access ───────────────────────────────────────────────── */
const ACCESS_CODE = "ELITE-J3";
const TIMER_PER_SUBJECT = 15 * 60; // 15 minutes in seconds

/* ── Types ────────────────────────────────────────────────── */
interface Question {
  s: "Maths" | "PC";
  t: string;
  q: string;
  o: string[];
  a: number;
  e: string;
}

interface AnswerRecord {
  question: Question;
  chosen: number;
  correct: boolean;
}

type Phase = "gate" | "start" | "quiz" | "end";

/* ── Math rendering (KaTeX) ───────────────────────────────── */
/* Inline LaTeX is written between $...$ inside any string below.
   Plain text passes through untouched. */
function renderMath(latex: string): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false,
    });
  } catch {
    return latex;
  }
}

function MathText({ children }: { children: string }) {
  const parts = children.split(/(\$[^$]*\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.length >= 2 && part.startsWith("$") && part.endsWith("$")) {
          return (
            <ContenuHtml key={i} html={renderMath(part.slice(1, -1))} />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ── Questions (niveau Marathon de l'Élite · archétypes BAC) ─ */
const QUESTIONS: Question[] = [
  /* ═════════ MATHS ═════════ */

  /* Probabilités (27,7 % des points) */
  {
    s: "Maths", t: "Probabilités · dénombrement",
    q: "Un élève de première choisit 3 spécialités parmi les 12 proposées. Combien de choix différents sont possibles ?",
    o: ["1 728", "1 320", "220", "36"], a: 2,
    e: "Choisir 3 spécialités parmi 12 sans tenir compte de l'ordre, c'est une combinaison : $\\binom{12}{3}=\\dfrac{12\\times11\\times10}{3\\times2\\times1}=220$. (Piège : $12^3=1728$, ou l'arrangement $12\\times11\\times10=1320$.)",
  },
  {
    s: "Maths", t: "Probabilités · loi binomiale",
    q: "$X$ suit la loi binomiale $\\mathcal{B}(5\\,;\\,0{,}4)$. Quelle est la valeur de $P(X=2)$ ?",
    o: ["0,2592", "0,3456", "0,0346", "0,4000"], a: 1,
    e: "$P(X=2)=\\binom{5}{2}(0{,}4)^2(0{,}6)^3=10\\times0{,}16\\times0{,}216=0{,}3456$. (Sans le coefficient $\\binom{5}{2}$ on trouverait par erreur $0{,}0346$.)",
  },
  {
    s: "Maths", t: "Probabilités · variable aléatoire",
    q: "$X$ suit la loi binomiale $\\mathcal{B}(50\\,;\\,0{,}2)$. Quel est son écart-type $\\sigma(X)$ ?",
    o: ["8", "$\\sqrt{10}\\approx 3{,}16$", "$\\sqrt{8}\\approx 2{,}83$", "10"], a: 2,
    e: "$V(X)=np(1-p)=50\\times0{,}2\\times0{,}8=8$, donc $\\sigma(X)=\\sqrt{8}\\approx 2{,}83$. (8 est la variance, 10 est l'espérance $np$.)",
  },
  {
    s: "Maths", t: "Probabilités · probabilités totales",
    q: "Dans une population, 60 % des individus sont vaccinés. Parmi les vaccinés, 5 % tombent malades ; parmi les non-vaccinés, 30 %. Quelle est la probabilité $P(M)$ qu'un individu pris au hasard soit malade ?",
    o: ["0,15", "0,35", "0,12", "0,03"], a: 0,
    e: "Formule des probabilités totales : $P(M)=P(V)\\,P_V(M)+P(\\bar V)\\,P_{\\bar V}(M)=0{,}6\\times0{,}05+0{,}4\\times0{,}30=0{,}03+0{,}12=0{,}15$.",
  },

  /* Géométrie dans l'espace (25,3 %) */
  {
    s: "Maths", t: "Géométrie dans l'espace · vecteur normal",
    q: "Un vecteur normal au plan d'équation $2x-y+3z+1=0$ est :",
    o: ["$\\vec n\\,(2\\,;-1\\,;3)$", "$\\vec n\\,(2\\,;1\\,;3)$", "$\\vec n\\,(1\\,;-1\\,;1)$", "$\\vec n\\,(-1\\,;3\\,;1)$"], a: 0,
    e: "Les coefficients de $x$, $y$ et $z$ dans l'équation donnent directement un vecteur normal : $\\vec n\\,(2\\,;-1\\,;3)$.",
  },
  {
    s: "Maths", t: "Géométrie dans l'espace · produit scalaire",
    q: "Soit $\\vec u\\,(1\\,;2\\,;-1)$ et $\\vec v\\,(3\\,;-1\\,;k)$. Pour quelle valeur de $k$ ces vecteurs sont-ils orthogonaux ?",
    o: ["$k=-1$", "$k=1$", "$k=5$", "$k=0$"], a: 1,
    e: "Orthogonaux $\\iff \\vec u\\cdot\\vec v=0$. Or $\\vec u\\cdot\\vec v=1\\times3+2\\times(-1)+(-1)\\times k=1-k$, qui s'annule pour $k=1$.",
  },
  {
    s: "Maths", t: "Géométrie dans l'espace · droite",
    q: "La droite passant par $A\\,(1\\,;0\\,;2)$ et de vecteur directeur $\\vec u\\,(1\\,;-1\\,;3)$ admet pour représentation paramétrique $(t\\in\\mathbb{R})$ :",
    o: [
      "$x=1+t,\\ y=-t,\\ z=2+3t$",
      "$x=1+t,\\ y=1-t,\\ z=3+2t$",
      "$x=t,\\ y=-t,\\ z=3t$",
      "$x=2+t,\\ y=-t,\\ z=1+3t$",
    ], a: 0,
    e: "On écrit $x=x_A+t\\,u_x$, etc. : $x=1+t,\\ y=0-t,\\ z=2+3t$.",
  },
  {
    s: "Maths", t: "Géométrie dans l'espace · équation de plan",
    q: "Le plan passant par $A\\,(1\\,;2\\,;-1)$ et de vecteur normal $\\vec n\\,(3\\,;0\\,;-2)$ a pour équation cartésienne :",
    o: ["$3x-2z-5=0$", "$3x-2z+5=0$", "$3x+2z-5=0$", "$x+2y-z=0$"], a: 0,
    e: "$\\vec n\\,(3\\,;0\\,;-2)$ donne $3x-2z+d=0$. Comme $A$ appartient au plan : $3(1)-2(-1)+d=0$, soit $5+d=0$, d'où $d=-5$ : $3x-2z-5=0$.",
  },

  /* Suites numériques (19,3 %) */
  {
    s: "Maths", t: "Suites · récurrence",
    q: "Soit $(u_n)$ définie par $u_0=5$ et $u_{n+1}=\\dfrac{3}{4}\\,u_n+2$. Que vaut $u_1$ ?",
    o: ["$\\dfrac{15}{4}$", "$\\dfrac{23}{4}$", "$\\dfrac{17}{4}$", "$\\dfrac{23}{2}$"], a: 1,
    e: "$u_1=\\dfrac{3}{4}\\times5+2=\\dfrac{15}{4}+\\dfrac{8}{4}=\\dfrac{23}{4}$. (Oublier le $+2$ donnerait $\\tfrac{15}{4}$.)",
  },
  {
    s: "Maths", t: "Suites · arithmético-géométrique",
    q: "Soit $(u_n)$ vérifiant $u_{n+1}=0{,}5\\,u_n+3$. On pose $v_n=u_n-\\ell$ où $\\ell$ est le point fixe. Que valent $\\ell$ et la nature de $(v_n)$ ?",
    o: [
      "$\\ell=6$ ; $(v_n)$ géométrique de raison $0{,}5$",
      "$\\ell=3$ ; $(v_n)$ géométrique de raison $0{,}5$",
      "$\\ell=6$ ; $(v_n)$ arithmétique de raison $3$",
      "$\\ell=1{,}5$ ; $(v_n)$ géométrique de raison $0{,}5$",
    ], a: 0,
    e: "Le point fixe vérifie $\\ell=0{,}5\\,\\ell+3$, soit $\\ell=6$. Alors $v_{n+1}=u_{n+1}-6=0{,}5\\,(u_n-6)=0{,}5\\,v_n$ : $(v_n)$ est géométrique de raison $0{,}5$.",
  },
  {
    s: "Maths", t: "Suites · limite",
    q: "Quelle est la limite de la suite $u_n=2-3\\times0{,}8^{\\,n}$ quand $n\\to+\\infty$ ?",
    o: ["$-1$", "$2$", "$0$", "$-\\infty$"], a: 1,
    e: "Comme $-1<0{,}8<1$, on a $0{,}8^{\\,n}\\to0$, donc $u_n\\to 2-3\\times0=2$.",
  },

  /* Primitives / Intégrales / Équa. diff. (14,5 %) */
  {
    s: "Maths", t: "Intégration · primitive",
    q: "Une primitive de $f(x)=e^{2x}$ sur $\\mathbb{R}$ est :",
    o: ["$2e^{2x}$", "$e^{2x}$", "$\\dfrac{1}{2}e^{2x}$", "$e^{x^2}$"], a: 2,
    e: "Une primitive de $e^{ax}$ est $\\dfrac{1}{a}e^{ax}$. Ici $\\dfrac{1}{2}e^{2x}$, dont la dérivée redonne bien $e^{2x}$.",
  },
  {
    s: "Maths", t: "Intégration · intégrale définie",
    q: "Que vaut l'intégrale $\\displaystyle\\int_0^1 (2x+1)\\,dx$ ?",
    o: ["$1$", "$\\dfrac{3}{2}$", "$2$", "$3$"], a: 2,
    e: "Une primitive est $x^2+x$. Donc $\\displaystyle\\int_0^1(2x+1)\\,dx=\\big[x^2+x\\big]_0^1=(1+1)-0=2$.",
  },
  {
    s: "Maths", t: "Équations différentielles",
    q: "Les solutions de l'équation différentielle $y'=3y$ sont :",
    o: ["$y=Ce^{3x},\\ C\\in\\mathbb{R}$", "$y=Ce^{-3x}$", "$y=3x+C$", "$y=e^{3x}+C$"], a: 0,
    e: "$y'=ay \\Rightarrow y=Ce^{ax}$. Ici $a=3$, d'où $y=Ce^{3x}$ avec $C\\in\\mathbb{R}$.",
  },

  /* Fonctions (exp/ln, convexité) (13,3 %) */
  {
    s: "Maths", t: "Fonctions · convexité",
    q: "Soit $f$ deux fois dérivable sur un intervalle $I$. $f$ est convexe sur $I$ si et seulement si :",
    o: ["$f'\\geq0$ sur $I$", "$f''\\geq0$ sur $I$", "$f''\\leq0$ sur $I$", "$f'\\leq0$ sur $I$"], a: 1,
    e: "$f$ convexe $\\iff f''\\geq0$ (la courbe est au-dessus de ses tangentes). Un point d'inflexion est un point où $f''$ s'annule en changeant de signe.",
  },
  {
    s: "Maths", t: "Fonctions · dérivée composée",
    q: "La dérivée de $f(x)=e^{x^2}$ est :",
    o: ["$e^{x^2}$", "$2x\\,e^{x^2}$", "$2x\\,e^{2x}$", "$x^2e^{x^2-1}$"], a: 1,
    e: "$(e^u)'=u'\\,e^u$ avec $u=x^2$ et $u'=2x$ : $f'(x)=2x\\,e^{x^2}$.",
  },

  /* ═════════ PHYSIQUE-CHIMIE ═════════ */

  /* Mécanique du point (18,3 %) */
  {
    s: "PC", t: "Mécanique · 2e loi de Newton",
    q: "Dans un référentiel galiléen, la deuxième loi de Newton s'écrit :",
    o: ["$\\sum\\vec F=m\\vec v$", "$\\sum\\vec F=m\\vec a$", "$\\sum\\vec F=\\dfrac{1}{2}mv^2$", "$\\sum\\vec F=m\\vec g$"], a: 1,
    e: "$\\sum\\vec F=m\\vec a$ : la somme des forces extérieures égale masse $\\times$ accélération.",
  },
  {
    s: "PC", t: "Mécanique · énergie cinétique",
    q: "Une voiture de masse $m=1200$ kg roule à $v=20$ m·s⁻¹. Son énergie cinétique vaut :",
    o: ["$4{,}8\\times10^{5}$ J", "$2{,}4\\times10^{5}$ J", "$2{,}4\\times10^{4}$ J", "$1{,}2\\times10^{4}$ J"], a: 1,
    e: "$E_c=\\dfrac{1}{2}mv^2=\\dfrac{1}{2}\\times1200\\times20^2=2{,}4\\times10^{5}$ J. (Oublier le facteur $\\tfrac12$ donnerait $4{,}8\\times10^5$ J.)",
  },
  {
    s: "PC", t: "Mécanique · chute libre",
    q: "Une bille tombe en chute libre sans vitesse initiale. Au bout de $t=2{,}0$ s, sa vitesse vaut (avec $g=9{,}8$ m·s⁻²) :",
    o: ["$9{,}8$ m·s⁻¹", "$19{,}6$ m·s⁻¹", "$39{,}2$ m·s⁻¹", "$4{,}9$ m·s⁻¹"], a: 1,
    e: "En chute libre l'accélération vaut $g$, donc $v=g\\,t=9{,}8\\times2{,}0=19{,}6$ m·s⁻¹.",
  },

  /* Optique & ondes lumineuses (12,4 %) */
  {
    s: "PC", t: "Optique · lunette afocale",
    q: "Une lunette afocale a un objectif de focale $f'_1=50$ cm et un oculaire de focale $f'_2=2{,}0$ cm. Son grossissement vaut :",
    o: ["$25$", "$0{,}04$", "$52$", "$100$"], a: 0,
    e: "$G=\\dfrac{f'_{\\text{objectif}}}{f'_{\\text{oculaire}}}=\\dfrac{50}{2{,}0}=25$.",
  },
  {
    s: "PC", t: "Ondes · diffraction",
    q: "Une fente de largeur $a=0{,}10$ mm est éclairée par un laser de longueur d'onde $\\lambda=600$ nm. Le demi-angle de diffraction $\\theta$ vaut :",
    o: ["$6{,}0\\times10^{-6}$ rad", "$6{,}0\\times10^{-3}$ rad", "$1{,}7\\times10^{2}$ rad", "$6{,}0\\times10^{-12}$ rad"], a: 1,
    e: "$\\theta=\\dfrac{\\lambda}{a}=\\dfrac{600\\times10^{-9}}{0{,}10\\times10^{-3}}=6{,}0\\times10^{-3}$ rad.",
  },
  {
    s: "PC", t: "Ondes · effet Doppler",
    q: "Une ambulance se rapproche d'un piéton immobile. Par rapport au son émis, le son perçu par le piéton est :",
    o: ["plus grave (fréquence plus basse)", "plus aigu (fréquence plus haute)", "inchangé", "deux fois plus fort"], a: 1,
    e: "Une source qui se rapproche $\\Rightarrow$ fréquence perçue plus élevée (son plus aigu) : c'est l'effet Doppler.",
  },

  /* Mécanique céleste (7,3 %) */
  {
    s: "PC", t: "Mécanique céleste · gravitation",
    q: "La force gravitationnelle entre deux masses $m$ et $M$ séparées d'une distance $d$ a pour valeur :",
    o: ["$F=G\\dfrac{mM}{d}$", "$F=G\\dfrac{mM}{d^2}$", "$F=G\\dfrac{m+M}{d^2}$", "$F=G\\,mM\\,d^2$"], a: 1,
    e: "$F=G\\dfrac{mM}{d^2}$ : la force varie en $1/d^2$ (loi de gravitation de Newton).",
  },
  {
    s: "PC", t: "Mécanique céleste · lois de Kepler",
    q: "La troisième loi de Kepler relie la période $T$ et le demi-grand axe $a$ de l'orbite par :",
    o: ["$\\dfrac{T^2}{a^3}=\\text{constante}$", "$\\dfrac{T}{a}=\\text{constante}$", "$\\dfrac{T^3}{a^2}=\\text{constante}$", "$T^2=a^3$"], a: 0,
    e: "$\\dfrac{T^2}{a^3}$ est identique pour tous les corps en orbite autour d'un même astre.",
  },

  /* Thermodynamique & transferts (10,2 %) */
  {
    s: "PC", t: "Thermodynamique · transfert thermique",
    q: "Quelle énergie faut-il pour chauffer $m=2{,}0$ kg d'eau de $20$ °C à $80$ °C ? (capacité thermique massique $c=4180$ J·kg⁻¹·K⁻¹)",
    o: ["$1{,}7\\times10^{5}$ J", "$5{,}0\\times10^{5}$ J", "$2{,}5\\times10^{5}$ J", "$8{,}4\\times10^{3}$ J"], a: 1,
    e: "$Q=mc\\,\\Delta T=2{,}0\\times4180\\times(80-20)=5{,}0\\times10^{5}$ J.",
  },
  {
    s: "PC", t: "Thermodynamique · flux thermique",
    q: "Le flux thermique $\\Phi$ à travers une paroi de résistance thermique $R_{th}$, soumise à un écart de température $\\Delta T$, vaut :",
    o: ["$\\Phi=R_{th}\\,\\Delta T$", "$\\Phi=\\dfrac{\\Delta T}{R_{th}}$", "$\\Phi=\\dfrac{R_{th}}{\\Delta T}$", "$\\Phi=R_{th}+\\Delta T$"], a: 1,
    e: "$\\Phi=\\dfrac{\\Delta T}{R_{th}}$ (analogie avec la loi d'Ohm $I=\\tfrac{U}{R}$).",
  },

  /* Synthèse organique (11,8 %) */
  {
    s: "PC", t: "Synthèse · groupes caractéristiques",
    q: "Le groupe caractéristique d'un acide carboxylique est :",
    o: ["$-\\text{OH}$", "$-\\text{COOH}$", "$-\\text{CHO}$", "$-\\text{NH}_2$"], a: 1,
    e: "$-\\text{COOH}$ (carboxyle). $-\\text{OH}$ = alcool, $-\\text{CHO}$ = aldéhyde, $-\\text{NH}_2$ = amine.",
  },
  {
    s: "PC", t: "Synthèse · rendement",
    q: "Une synthèse pouvait produire au maximum $0{,}50$ mol d'ester ; on en obtient $0{,}35$ mol. Le rendement vaut :",
    o: ["$143\\,\\%$", "$70\\,\\%$", "$35\\,\\%$", "$85\\,\\%$"], a: 1,
    e: "$\\eta=\\dfrac{n_{\\text{obtenu}}}{n_{\\text{théorique}}}=\\dfrac{0{,}35}{0{,}50}=0{,}70=70\\,\\%$. Un rendement est toujours $\\leq 100\\,\\%$.",
  },

  /* Dosages & titrages (10,3 %) */
  {
    s: "PC", t: "Titrages · équivalence",
    q: "À l'équivalence d'un titrage, les réactifs titrant et titré sont :",
    o: ["en large excès de titrant", "introduits dans les proportions stœchiométriques", "sans réaction l'un avec l'autre", "tous deux en large excès"], a: 1,
    e: "À l'équivalence, ils ont réagi exactement dans les proportions stœchiométriques : on en déduit la concentration cherchée.",
  },
  {
    s: "PC", t: "Titrages · concentration",
    q: "On titre $V_A=20{,}0$ mL d'un acide par une base à $C_B=0{,}10$ mol·L⁻¹ (réaction de proportions 1:1). L'équivalence est atteinte à $V_E=15{,}0$ mL. La concentration $C_A$ vaut :",
    o: ["$0{,}13$ mol·L⁻¹", "$0{,}075$ mol·L⁻¹", "$0{,}10$ mol·L⁻¹", "$0{,}15$ mol·L⁻¹"], a: 1,
    e: "À l'équivalence $C_A V_A=C_B V_E$, donc $C_A=\\dfrac{C_B V_E}{V_A}=\\dfrac{0{,}10\\times15{,}0}{20{,}0}=0{,}075$ mol·L⁻¹.",
  },

  /* Acides / bases & pH (5,1 %) */
  {
    s: "PC", t: "Acides-bases · pH",
    q: "Une solution a une concentration $[\\text{H}_3\\text{O}^+]=1{,}0\\times10^{-3}$ mol·L⁻¹. Son pH vaut :",
    o: ["$3$", "$11$", "$-3$", "$10^{-3}$"], a: 0,
    e: "$\\text{pH}=-\\log[\\text{H}_3\\text{O}^+]=-\\log(10^{-3})=3$.",
  },
  {
    s: "PC", t: "Acides-bases · pKa et prédominance",
    q: "Pour un couple acide/base de $pK_A=4{,}8$, la forme basique prédomine lorsque :",
    o: ["$\\text{pH}<4{,}8$", "$\\text{pH}>4{,}8$", "$\\text{pH}=7$ toujours", "quel que soit le pH"], a: 1,
    e: "La forme basique $\\text{A}^-$ prédomine si $\\text{pH}>pK_A$ ; l'acide $\\text{AH}$ prédomine si $\\text{pH}<pK_A$.",
  },
];

/* Counts per subject (computed) */
const COUNT_MATHS = QUESTIONS.filter((q) => q.s === "Maths").length;
const COUNT_PC = QUESTIONS.filter((q) => q.s === "PC").length;
const COUNT_ALL = QUESTIONS.length;

/* ── Colour tokens (elite brand) ─────────────────────────── */
const C = {
  navy: "#0f172a",
  navy2: "#1e293b",
  amber: "#f59e0b",
  amberDark: "#b45309",
  maths: "#4338ca",
  mathsBg: "#eef2ff",
  pc: "#0d9488",
  pcBg: "#f0fdfa",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  red: "#dc2626",
  redBg: "#fef2f2",
  line: "#e2e8f0",
  slate: "#475569",
  mut: "#64748b",
  light: "#f8fafc",
  bg: "#eef2f7",
};

/* ── Helpers ──────────────────────────────────────────────── */
const KEYS = ["1", "2", "3", "4"];

function buildPool(subject: "Maths" | "PC" | "all"): Question[] {
  return subject === "all" ? QUESTIONS : QUESTIONS.filter((q) => q.s === subject);
}

function pct(n: number, d: number) {
  return Math.round((n / d) * 100);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTimerSeconds(subject: "Maths" | "PC" | "all"): number {
  return subject === "all" ? TIMER_PER_SUBJECT * 2 : TIMER_PER_SUBJECT;
}

/* ── Sub-components ───────────────────────────────────────── */

function Header() {
  return (
    <header
      style={{
        background: C.navy, color: "#fff", borderRadius: "0 0 16px 16px",
        padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: 1, fontSize: 18 }}>
        MASTER<span style={{ color: C.amber }}>BAC</span>
      </div>
      <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#cbd5e1" }}>
        L&apos;Académie de l&apos;Élite
      </div>
    </header>
  );
}

/* ── Gate screen ──────────────────────────────────────────── */
function GateScreen({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);

  const tryUnlock = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (code.trim().toUpperCase() === ACCESS_CODE.toUpperCase()) {
        onUnlock();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setCode("");
      }
    },
    [code, onUnlock]
  );

  return (
    <div
      style={{
        minHeight: "100vh", background: C.navy,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "20px", fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>
        Académie de l&apos;Élite
      </h1>
      <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 32, textAlign: "center", maxWidth: 300 }}>
        Espace réservé aux membres. Entrez votre code d&apos;accès.
      </p>

      <form onSubmit={tryUnlock} style={{ width: "100%", maxWidth: 320 }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code d'accès"
          autoFocus
          style={{
            width: "100%", padding: "14px 18px", borderRadius: 12,
            border: shake ? "2px solid #dc2626" : "2px solid #334155",
            background: "#1e293b", color: "#fff", fontSize: 16, fontWeight: 700,
            letterSpacing: 2, textTransform: "uppercase", outline: "none",
            marginBottom: 12, textAlign: "center", transition: "border-color .15s",
            animation: shake ? "shake .4s" : "none", fontFamily: '"DM Sans", sans-serif',
          }}
        />
        <button
          type="submit"
          style={{
            width: "100%", padding: "14px", background: C.amber, color: C.navy,
            border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800,
            cursor: "pointer", letterSpacing: 0.5,
          }}
        >
          Accéder au quiz →
        </button>
      </form>

      {shake && (
        <p style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>
          Code incorrect. Réessaye.
        </p>
      )}

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

/* ── Start screen ─────────────────────────────────────────── */
function StartScreen({ onStart }: { onStart: (s: "Maths" | "PC" | "all") => void }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 48px" }}>
        <Header />
        <div
          style={{
            background: "#fff", borderRadius: 16, boxShadow: "0 10px 30px rgba(15,23,42,.08)",
            padding: "30px", marginTop: 22,
          }}
        >
          <div style={{ color: C.amberDark, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", fontSize: 13 }}>
            Marathon de l&apos;Élite · Jour 2 · Niveau BAC
          </div>
          <h1 style={{ fontSize: 30, margin: "8px 0 6px", letterSpacing: -0.3, color: C.navy }}>
            Les 20 % qui font 80 % des points
          </h1>
          <p style={{ color: C.slate, fontSize: 16, marginBottom: 20 }}>
            Les archétypes d&apos;exercices qui tombent à chaque session. Pour chaque question : tu calcules, on corrige ensemble, et on retient la méthode.
          </p>
          <div
            style={{
              background: C.light, border: "1px dashed " + C.line, borderRadius: 12,
              padding: "14px 18px", fontSize: 14, color: C.slate, marginBottom: 24,
            }}
          >
            <b style={{ color: C.navy }}>Au menu :</b>{" "}
            Maths (Probabilités, Géométrie dans l&apos;espace, Suites, Primitives / intégrales, Fonctions &amp; convexité) &nbsp;·&nbsp;
            Physique-Chimie (Mécanique du point &amp; céleste, Optique &amp; ondes, Synthèse, Titrages, Thermo, Acide-base).
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: C.mut, marginBottom: 12 }}>
            Choisis ta matière
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { key: "Maths" as const, ic: "📐", label: "Maths", count: COUNT_MATHS, time: 15, border: "#c7d2fe" },
              { key: "PC" as const, ic: "⚗️", label: "Physique-Chimie", count: COUNT_PC, time: 15, border: "#99f6e4" },
              { key: "all" as const, ic: "🎯", label: "Les deux", count: COUNT_ALL, time: 30, border: "#fde68a" },
            ].map(({ key, ic, label, count, time, border }) => (
              <button
                key={key}
                onClick={() => onStart(key)}
                style={{
                  border: "2px solid " + border, background: "#fff", borderRadius: 14,
                  padding: "18px 12px", cursor: "pointer", textAlign: "center",
                  fontWeight: 700, fontSize: 16, transition: ".15s", fontFamily: '"DM Sans", sans-serif',
                }}
              >
                <span style={{ fontSize: 30, display: "block", marginBottom: 8 }}>{ic}</span>
                {label}
                <small style={{ display: "block", fontWeight: 500, fontSize: 12, color: C.mut, marginTop: 4 }}>
                  {count} questions · {time} min
                </small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Quiz screen ──────────────────────────────────────────── */
function QuizScreen({
  pool, idx, score, answered, chosen, timeLeft, onChoose, onNext,
}: {
  pool: Question[];
  idx: number;
  score: number;
  answered: boolean;
  chosen: number | null;
  timeLeft: number;
  onChoose: (i: number) => void;
  onNext: () => void;
}) {
  const q = pool[idx];
  const progress = (idx / pool.length) * 100;
  const isLast = idx === pool.length - 1;
  const isUrgent = timeLeft <= 60;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key)) {
        onChoose(Number(e.key) - 1);
      } else if (e.key === "Enter" && answered) {
        onNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answered, onChoose, onNext]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 48px" }}>
        <Header />
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 10px 30px rgba(15,23,42,.08)", padding: "30px", marginTop: 22 }}>
          {/* Progress row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <span style={{ fontSize: 13, color: C.mut, fontWeight: 700, whiteSpace: "nowrap" }}>
              {idx + 1} / {pool.length}
            </span>
            <div style={{ flex: 1, height: 10, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", background: C.amber, width: progress + "%", transition: "width .3s" }} />
            </div>
            <span
              style={{
                fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
                color: isUrgent ? C.red : C.navy,
                animation: isUrgent ? "pulse-timer 1s infinite" : "none",
              }}
            >
              ⏱ {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 13, color: C.navy, fontWeight: 800, whiteSpace: "nowrap" }}>
              ⭐ {score}
            </span>
          </div>
          <style>{`@keyframes pulse-timer{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

          {/* Chip */}
          <span
            style={{
              display: "inline-block", fontSize: 12, fontWeight: 800, color: "#fff",
              borderRadius: 20, padding: "4px 12px", marginBottom: 14,
              background: q.s === "Maths" ? C.maths : C.pc,
            }}
          >
            {q.t}
          </span>

          {/* Question */}
          <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 18, color: C.navy, lineHeight: 1.45 }}>
            <MathText>{q.q}</MathText>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {q.o.map((opt, i) => {
              const isCorrect = i === q.a;
              const isChosen = i === chosen;
              let border = C.line;
              let bg = "#fff";
              let keyBg = "#eef2f7";
              let keyColor = C.slate;

              if (answered) {
                if (isCorrect) { border = C.green; bg = C.greenBg; keyBg = C.green; keyColor = "#fff"; }
                if (isChosen && !isCorrect) { border = C.red; bg = C.redBg; keyBg = C.red; keyColor = "#fff"; }
              }

              return (
                <button
                  key={i}
                  onClick={() => !answered && onChoose(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    border: "2px solid " + border, background: bg,
                    borderRadius: 12, padding: "14px 16px",
                    cursor: answered ? "default" : "pointer",
                    fontSize: 16, textAlign: "left", transition: ".12s", width: "100%",
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0, width: 26, height: 26, borderRadius: 7,
                      background: keyBg, color: keyColor, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                    }}
                  >
                    {KEYS[i]}
                  </span>
                  <span><MathText>{opt}</MathText></span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <div
              style={{
                marginTop: 16, borderRadius: 12, padding: "14px 16px", fontSize: 15, lineHeight: 1.5,
                background: chosen === q.a ? C.greenBg : C.redBg,
                border: "1px solid " + (chosen === q.a ? "#bbf7d0" : "#fecaca"),
                color: C.navy,
              }}
            >
              <b>{chosen === q.a ? "✅ Correct !" : "❌ Pas tout à fait."}</b>{" "}
              <MathText>{q.e}</MathText>
            </div>
          )}

          {/* Next row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <span style={{ fontSize: 12, color: C.mut }}>
              Astuce : touches 1-4 pour répondre, Entrée pour continuer.
            </span>
            <button
              onClick={onNext}
              disabled={!answered}
              style={{
                background: C.amber, color: C.navy, border: "none", borderRadius: 10,
                padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: answered ? "pointer" : "not-allowed",
                opacity: answered ? 1 : 0.4, transition: ".15s", fontFamily: '"DM Sans", sans-serif',
              }}
            >
              {isLast ? "Voir mon score →" : "Suivant →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── End / detailed results ───────────────────────────────── */
function EndScreen({
  pool, score, answers, timeUp, onRestart, onHome,
}: {
  pool: Question[];
  score: number;
  answers: AnswerRecord[];
  timeUp: boolean;
  onRestart: () => void;
  onHome: () => void;
}) {
  const n = pool.length;
  const answeredCount = answers.length;
  const p = pct(score, n);

  const msg = timeUp && answeredCount < n
    ? `Temps écoulé ! Tu as répondu à ${answeredCount} question${answeredCount > 1 ? "s" : ""} sur ${n}. Entraîne-toi à aller plus vite sur les archétypes. ⏱`
    : p >= 80
      ? "Excellent ! Tu maîtrises les essentiels. Continue sur ta lancée. 🚀"
      : p >= 50
      ? "Bien joué ! Reprends les questions ratées : c'est là que sont tes points faciles. 💪"
      : "C'est le moment d'agir : revois ces notions clés, elles rapportent gros au BAC. On est là pour ça. 📘";

  const wrongAnswers = answers.filter((a) => !a.correct);
  const rightAnswers = answers.filter((a) => a.correct);
  const unanswered = n - answeredCount;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px 48px" }}>
        <Header />

        {/* Score card */}
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 10px 30px rgba(15,23,42,.08)", padding: "30px", marginTop: 22 }}>
          <div style={{ color: C.amberDark, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", fontSize: 13 }}>
            {timeUp && answeredCount < n ? "⏱ Temps écoulé" : p >= 80 ? "Bravo" : "Ton résultat"}
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2, color: C.navy }}>
            {score} / {n}
          </div>
          <div
            style={{
              display: "inline-block", marginBottom: 8,
              background: p >= 80 ? C.greenBg : p >= 50 ? "#fffbeb" : C.redBg,
              color: p >= 80 ? C.green : p >= 50 ? "#92400e" : C.red,
              borderRadius: 20, padding: "4px 14px", fontSize: 14, fontWeight: 800,
            }}
          >
            {p}%
          </div>
          <div style={{ fontSize: 18, color: C.slate, marginBottom: 22 }}>{msg}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={onRestart}
              style={{
                background: C.navy, color: "#fff", border: "none", borderRadius: 10,
                padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: '"DM Sans", sans-serif',
              }}
            >
              ↻ Recommencer
            </button>
            <button
              onClick={onHome}
              style={{
                background: "#fff", color: C.navy, border: "2px solid " + C.line,
                borderRadius: 10, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Changer de matière
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: unanswered > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12, marginTop: 16 }}>
          <div style={{ background: C.greenBg, border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.green }}>{rightAnswers.length}</div>
            <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>correctes</div>
          </div>
          <div style={{ background: C.redBg, border: "1px solid #fecaca", borderRadius: 14, padding: "16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: C.red }}>{wrongAnswers.length}</div>
            <div style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>à retravailler</div>
          </div>
          {unanswered > 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid " + C.line, borderRadius: 14, padding: "16px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.mut }}>{unanswered}</div>
              <div style={{ fontSize: 13, color: C.mut, fontWeight: 600 }}>non répondues</div>
            </div>
          )}
        </div>

        {/* Detailed breakdown */}
        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 10px 30px rgba(15,23,42,.08)", padding: "24px", marginTop: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 13, textTransform: "uppercase", letterSpacing: 2, color: C.mut, marginBottom: 18 }}>
            Résultats détaillés · Question par question
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {answers.map((record, i) => {
              const { question: q, chosen, correct } = record;
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 12,
                    border: "1px solid " + (correct ? "#bbf7d0" : "#fecaca"),
                    background: correct ? C.greenBg : C.redBg,
                    padding: "14px 16px",
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                    <span
                      style={{
                        display: "inline-block", fontSize: 11, fontWeight: 800, color: "#fff",
                        borderRadius: 20, padding: "2px 10px",
                        background: q.s === "Maths" ? C.maths : C.pc,
                      }}
                    >
                      {q.t}
                    </span>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{correct ? "✅" : "❌"}</span>
                  </div>

                  {/* Question text */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8, lineHeight: 1.45 }}>
                    Q{i + 1}. <MathText>{q.q}</MathText>
                  </div>

                  {/* Answer comparison */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                    {!correct && (
                      <div style={{ fontSize: 13, color: C.red }}>
                        <b>Ta réponse :</b> <MathText>{q.o[chosen]}</MathText>
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: C.green }}>
                      <b>Bonne réponse :</b> <MathText>{q.o[q.a]}</MathText>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div
                    style={{
                      fontSize: 13, color: C.slate,
                      borderTop: "1px solid " + (correct ? "#bbf7d0" : "#fecaca"),
                      paddingTop: 8, marginTop: 4, lineHeight: 1.5,
                    }}
                  >
                    <b>Explication :</b> <MathText>{q.e}</MathText>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 22 }}>
          Académie de l&apos;Élite · MasterBac
        </div>
      </div>
    </div>
  );
}

/* ── Main inner component (uses useSearchParams) ─────────── */
function EliteQuiz() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("gate");
  const [pool, setPool] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeUpTriggered = useRef(false);

  /* Auto-unlock via URL ?code=ELITE-J3 */
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode && urlCode.toUpperCase() === ACCESS_CODE.toUpperCase()) {
      setPhase("start");
    }
  }, [searchParams]);

  /* Timer countdown */
  useEffect(() => {
    if (phase === "quiz") {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, [phase]);

  /* Auto-end when time runs out */
  useEffect(() => {
    if (phase === "quiz" && timeLeft === 0 && !timeUpTriggered.current) {
      timeUpTriggered.current = true;
      setPhase("end");
    }
  }, [timeLeft, phase]);

  const handleUnlock = useCallback(() => setPhase("start"), []);

  const handleStart = useCallback((subject: "Maths" | "PC" | "all") => {
    setPool(buildPool(subject));
    setIdx(0);
    setScore(0);
    setAnswered(false);
    setChosen(null);
    setAnswers([]);
    setTimeLeft(getTimerSeconds(subject));
    timeUpTriggered.current = false;
    setPhase("quiz");
  }, []);

  const handleChoose = useCallback(
    (i: number) => {
      if (answered) return;
      const q = pool[idx];
      const correct = i === q.a;
      setChosen(i);
      setAnswered(true);
      if (correct) setScore((s) => s + 1);
      setAnswers((prev) => [...prev, { question: q, chosen: i, correct }]);
    },
    [answered, pool, idx]
  );

  const handleNext = useCallback(() => {
    if (!answered) return;
    if (idx < pool.length - 1) {
      setIdx((i) => i + 1);
      setAnswered(false);
      setChosen(null);
    } else {
      setPhase("end");
    }
  }, [answered, idx, pool.length]);

  const handleRestart = useCallback(() => {
    setIdx(0);
    setScore(0);
    setAnswered(false);
    setChosen(null);
    setAnswers([]);
    setPhase("quiz");
  }, []);

  const handleHome = useCallback(() => {
    setPhase("start");
  }, []);

  if (phase === "gate") return <GateScreen onUnlock={handleUnlock} />;
  if (phase === "start") return <StartScreen onStart={handleStart} />;
  if (phase === "quiz")
    return (
      <QuizScreen
        pool={pool} idx={idx} score={score}
        answered={answered} chosen={chosen} timeLeft={timeLeft}
        onChoose={handleChoose} onNext={handleNext}
      />
    );
  return (
    <EndScreen
      pool={pool} score={score} answers={answers} timeUp={timeLeft === 0}
      onRestart={handleRestart} onHome={handleHome}
    />
  );
}

/* ── Page export (Suspense required for useSearchParams) ─── */
export default function ElitePage() {
  return (
    <Suspense>
      <EliteQuiz />
    </Suspense>
  );
}
