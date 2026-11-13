"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cocherVu } from "@/lib/serveur/commandes/cours";

export default function CaseVu({ fiche, vu }: { fiche: number; vu: boolean }) {
  const router = useRouter();
  const [coche, setCoche] = useState(vu);
  const [message, setMessage] = useState("");
  const [, lance] = useTransition();
  return (
    <label className="case" style={{ padding: 0, alignItems: "center" }}>
      <span className="inter">
        <input type="checkbox" checked={coche} onChange={(e) => {
          const suite = e.target.checked;
          setCoche(suite);
          lance(async () => {
            const r = await cocherVu({ fiche, vu: suite });
            if (r.ok) { setMessage(suite ? "Chapitre ajouté à ta progression." : "Chapitre retiré de ta progression."); router.refresh(); }
            else { setCoche(!suite); setMessage(r.message); }
          });
        }} /><span />
      </span>
      <span><b>Vu en classe</b><br /><span className="petit discret" role="status">{message || "Ta séance du jour et ton plan suivent la progression de ton professeur."}</span></span>
    </label>
  );
}
