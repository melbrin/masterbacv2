"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cocherSeance } from "@/lib/serveur/commandes/ds";

export default function CaseSeance({ ds, seance, faite }: { ds: string; seance: string; faite: boolean }) {
  const router = useRouter();
  const [coche, setCoche] = useState(faite);
  const [, lance] = useTransition();
  return (
    <label className="case" style={{ padding: 0, alignItems: "center", gap: 8 }}><span className="petit">Faite</span>
      <span className="inter"><input type="checkbox" checked={coche} onChange={(e) => {
        const suite = e.target.checked;
        setCoche(suite);
        lance(async () => { const r = await cocherSeance({ id: ds, seance, faite: suite }); if (r.ok) router.refresh(); else setCoche(!suite); });
      }} /><span /></span></label>
  );
}
