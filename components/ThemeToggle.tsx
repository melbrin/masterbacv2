"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    // Sync state with what the anti-flash script already applied
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      aria-label={light ? "Passer en mode sombre" : "Passer en mode clair"}
      className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-[16px] transition-all hover:scale-110 active:scale-95 shadow-sm"
    >
      {light ? "\uD83C\uDF19" : "\u2600\uFE0F"}
    </button>
  );
}
