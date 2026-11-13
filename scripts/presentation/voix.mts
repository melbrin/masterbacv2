// Fabrique la voix de la présentation avec ElevenLabs, une scène par fichier.
// La clé se lit dans la variable ELEVENLABS_API_KEY ; elle n'est jamais écrite ni affichée.
// Usage : ELEVENLABS_API_KEY=... node scripts/presentation/voix.mts <dossier> <id de voix> [--tout]
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEXTES } from "./textes.mts";

const [dossier, voix, option] = process.argv.slice(2);
const cle = process.env.ELEVENLABS_API_KEY;
if (!dossier || !voix || !cle) {
  console.error("Il faut un dossier de sortie, un identifiant de voix et la variable ELEVENLABS_API_KEY.");
  process.exit(1);
}
mkdirSync(dossier, { recursive: true });

for (const [i, scene] of TEXTES.entries()) {
  const fichier = join(dossier, `${scene.id}.mp3`);
  if (existsSync(fichier) && option !== "--tout") continue;
  const reponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voix)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": cle, "content-type": "application/json" },
    body: JSON.stringify({
      text: scene.texte,
      model_id: "eleven_multilingual_v2",
      language_code: undefined,
      previous_text: TEXTES[i - 1]?.texte,
      next_text: TEXTES[i + 1]?.texte,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
    }),
  });
  if (!reponse.ok) {
    console.error(`${scene.id} : refus du service (${reponse.status}) ${(await reponse.text()).slice(0, 200)}`);
    process.exit(1);
  }
  writeFileSync(fichier, Buffer.from(await reponse.arrayBuffer()));
  console.log(`${scene.id} : fait`);
}
