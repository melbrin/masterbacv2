// Les illustrations des portes de la page « S'entraîner » : des dessins au trait, faits pour la nuit du labo
// (les couleurs de la charte y prennent leurs versions claires). Elles sont décoratives : la porte qui les montre
// les cache aux lecteurs d'écran. Le labo, lui, montre une vraie vignette de simulation (components/simulations/Vignette.tsx).

const TRAIT = { fill: "none", stroke: "var(--encre)", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const CADRE = { viewBox: "0 0 200 132", focusable: "false" } as const;

// ---------- les TP : une burette au-dessus d'un erlenmeyer, et la courbe qu'on en tire ----------
const GRADUATIONS = Array.from({ length: 10 }, (_, i) => 12 + i * 6);
const RELEVES = [[150, 108.4], [157, 107], [162.5, 103.5], [166, 92], [169.5, 79.5], [176, 74.8], [184, 73.4]];

export function IllustrationTp() {
  return (
    <svg {...CADRE}>
      {/* la paillasse, la potence et sa pince */}
      <path d="M 16 123.5 H 184" stroke="var(--discret)" strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
      <path d="M 40 121.5 H 78" stroke="var(--discret)" strokeWidth={3} strokeLinecap="round" />
      <path d="M 59 121 V 8 M 59 38 H 92" {...TRAIT} stroke="var(--discret)" />
      <rect x={92} y={34} width={16} height={8} rx={2.5} {...TRAIT} stroke="var(--discret)" />
      {/* la burette : sa solution, ses parois, ses graduations, son robinet */}
      <path d="M 96.3 22 H 103.7 V 70 L 100.6 76 H 99.4 L 96.3 70 Z" fill="rgba(141, 182, 224, .5)" />
      <path d="M 95.5 6 V 70 L 99 76 V 90 M 104.5 6 V 70 L 101 76 V 90" {...TRAIT} />
      {GRADUATIONS.map((y, i) => <line key={y} x1={104.5} x2={i % 3 === 0 ? 111 : 108.5} y1={y} y2={y} stroke="var(--discret)" strokeWidth={1} />)}
      <path d="M 93.5 80 H 106.5" stroke="var(--cuivre)" strokeWidth={3.4} strokeLinecap="round" />
      {/* la goutte qui tombe */}
      <circle className="porte-goutte" cx={100} cy={99} r={1.9} fill="#B9D3EE" />
      {/* l'erlenmeyer : sa solution vient de virer, le barreau tourne au fond */}
      <path d="M 82 108 H 118 L 127 116 Q 130 122 123.5 122 H 76.5 Q 70 122 73 116 Z" fill="rgba(242, 110, 172, .62)" />
      <path d="M 93 88 V 98 L 73 116 Q 70 122 76.5 122 H 123.5 Q 130 122 127 116 L 107 98 V 88 M 90.5 88 H 95.5 M 104.5 88 H 109.5" {...TRAIT} />
      <path d="M 94.5 118.6 H 105.5" stroke="var(--encre)" strokeWidth={2.4} strokeLinecap="round" />
      {/* l'exploitation : la courbe du titrage, ses relevés, le volume à l'équivalence */}
      <path d="M 146 66 V 114 H 190" {...TRAIT} stroke="var(--discret)" strokeWidth={1.2} />
      <path d="M 166 114 V 92" stroke="var(--discret)" strokeWidth={1} strokeDasharray="2 3" />
      <path d="M 148 108.6 C 160 107.6 164 104 166 92 C 168 79 172 74.4 188 73.2" {...TRAIT} stroke="var(--cuivre)" strokeWidth={1.8} />
      {RELEVES.map(([x, y]) => <circle key={x} cx={x} cy={y} r={1.7} fill="var(--encre)" />)}
    </svg>
  );
}

// ---------- la mémoire : une grille de cases, dont quelques-unes sont allumées ----------
const ALLUMEES = new Set([1, 8, 10, 12, 19]); // le rang d'une case : sa ligne fois cinq, plus sa colonne

export function IllustrationMemoire() {
  return (
    <svg {...CADRE}>
      {Array.from({ length: 20 }, (_, i) => {
        const x = 33 + (i % 5) * 28;
        const y = 13 + Math.floor(i / 5) * 28;
        return ALLUMEES.has(i) ? (
          <g key={i} fill="var(--cuivre)">
            {/* la lueur de la case, décalée d'une case à l'autre */}
            <rect className="porte-lueur" style={{ animationDelay: `${-0.7 * (i % 4)}s` }} x={x - 4} y={y - 4} width={30} height={30} rx={9} opacity={0.3} />
            <rect x={x} y={y} width={22} height={22} rx={5.5} />
          </g>
        ) : <rect key={i} x={x} y={y} width={22} height={22} rx={5.5} fill="rgba(243, 236, 230, .05)" stroke="var(--encre)" strokeOpacity={0.36} strokeWidth={1.2} />;
      })}
    </svg>
  );
}

// ---------- les jeux : trois cartes en éventail, une question entre « faux » et « vrai » ----------
const CARTE = { x: 76, y: 24, width: 48, height: 72, rx: 8, fill: "#10294E", stroke: "var(--encre)", strokeWidth: 1.6 } as const;
const SIGNE = { fill: "none", strokeWidth: 3.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function IllustrationJeux() {
  return (
    <svg {...CADRE}>
      {/* les deux cartes du fond tournent autour d'un point placé sous l'éventail (entrainement.css) */}
      <g className="porte-carte porte-carte-faux">
        <rect {...CARTE} />
        <path d="M 85 51 L 101 67 M 101 51 L 85 67" {...SIGNE} stroke="var(--brique)" />
      </g>
      <g className="porte-carte porte-carte-vrai">
        <rect {...CARTE} />
        <path d="M 98 60 L 105 67 L 117 51.5" {...SIGNE} stroke="var(--vert)" />
      </g>
      <rect {...CARTE} />
      <rect x={81} y={29} width={38} height={62} rx={4.5} fill="none" stroke="var(--cuivre)" strokeOpacity={0.5} strokeWidth={1} />
      <text className="porte-question" x={100} y={75} textAnchor="middle">?</text>
    </svg>
  );
}
