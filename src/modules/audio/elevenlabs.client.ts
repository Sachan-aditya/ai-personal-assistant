import { promises as fs } from "node:fs";
import path from "node:path";
import { HttpError } from "../../common/http";
import { env } from "../../config/env";

const ELEVENLABS_BASE = "https://api.elevenlabs.io";

export async function cloneVoice(input: {
  name: string;
  description?: string;
  filePaths: string[];
}): Promise<{ voiceId: string }> {
  if (!env.elevenLabsApiKey) {
    throw new HttpError(500, "ELEVENLABS_API_KEY is not configured");
  }
  if (input.filePaths.length === 0) {
    throw new HttpError(400, "At least one audio sample is required to clone");
  }

  const form = new FormData();
  form.append("name", input.name);
  if (input.description) form.append("description", input.description);

  for (const fp of input.filePaths) {
    const buf = await fs.readFile(fp);
    const ext = path.extname(fp).toLowerCase();
    const mime =
      ext === ".mp3" ? "audio/mpeg"
      : ext === ".wav" ? "audio/wav"
      : ext === ".m4a" ? "audio/mp4"
      : ext === ".ogg" ? "audio/ogg"
      : ext === ".webm" ? "audio/webm"
      : "application/octet-stream";
    const blob = new Blob([new Uint8Array(buf)], { type: mime });
    form.append("files", blob, path.basename(fp));
  }

  const resp = await fetch(`${ELEVENLABS_BASE}/v1/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": env.elevenLabsApiKey },
    body: form,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new HttpError(502, `ElevenLabs clone ${resp.status}: ${body.slice(0, 400)}`);
  }

  const json = (await resp.json()) as { voice_id?: string };
  if (!json.voice_id) {
    throw new HttpError(502, "ElevenLabs clone response missing voice_id");
  }
  return { voiceId: json.voice_id };
}

// Stable public ElevenLabs voice IDs. Verified working with no extra account permissions.
export const VOICE_IDS = {
  george: "JBFqnCBsd6RMkjVDRZzb",
  adam: "pNInz6obpgDQGcFmaJgB",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  brian: "nPczCjzI2devNBz1zQrb",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  emily: "LcfcDJNUP1GQjkzn1xUU",
  charlotte: "XB0fDUnXU5powFXDhCwa",
  charlie: "IKne3meq5aSn9XLyUdCD",
} as const;

export const DEFAULT_VOICE_ID = VOICE_IDS.george;

const PERSONA_VOICE_MAP: Record<string, string> = {
  "Dr. Smith": VOICE_IDS.adam,
  "Prof. Williams": VOICE_IDS.george,
  "Sarah Chen": VOICE_IDS.sarah,
  "Raj Patel": VOICE_IDS.daniel,
  "Emma Davis": VOICE_IDS.emily,
  "James Wilson": VOICE_IDS.brian,
};

// UI exposes Edge-TTS-style voice keys ("guy", "aria", "thomas"...). Map each
// to a stable ElevenLabs voice ID so the picker actually changes the voice.
const VOICE_KEY_MAP: Record<string, string> = {
  guy: VOICE_IDS.adam,
  andrew: VOICE_IDS.adam,
  brian: VOICE_IDS.brian,
  eric: VOICE_IDS.daniel,
  roger: VOICE_IDS.george,
  jenny: VOICE_IDS.sarah,
  aria: VOICE_IDS.charlotte,
  emma: VOICE_IDS.emily,
  prabhat: VOICE_IDS.adam,
  neerja: VOICE_IDS.sarah,
  ryan: VOICE_IDS.charlie,
  sonia: VOICE_IDS.charlotte,
  thomas: VOICE_IDS.george,
};

export function resolveVoiceId(profileName: string, notes?: string): string {
  const personaMatch = PERSONA_VOICE_MAP[profileName];
  if (personaMatch) return personaMatch;
  const voiceKey = (notes ?? "").split("::")[0];
  if (voiceKey && VOICE_KEY_MAP[voiceKey]) return VOICE_KEY_MAP[voiceKey];
  return DEFAULT_VOICE_ID;
}

export async function synthesize(input: {
  text: string;
  voiceId: string;
  outputDir: string;
  outputFileName: string;
}): Promise<{ audioUrl: string; audioDurationSeconds: number }> {
  if (!env.elevenLabsApiKey) {
    throw new HttpError(500, "ELEVENLABS_API_KEY is not configured");
  }

  const url = `${ELEVENLABS_BASE}/v1/text-to-speech/${input.voiceId}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": env.elevenLabsApiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: input.text,
      model_id: env.elevenLabsModelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new HttpError(502, `ElevenLabs TTS ${resp.status}: ${body.slice(0, 400)}`);
  }

  const audioBuffer = Buffer.from(await resp.arrayBuffer());

  await fs.mkdir(input.outputDir, { recursive: true });
  const outputPath = path.join(input.outputDir, input.outputFileName);
  await fs.writeFile(outputPath, audioBuffer);

  const durationSec = Math.max(1, Math.round(audioBuffer.length / 16000));
  return {
    audioUrl: `/generated-audio/${input.outputFileName}`,
    audioDurationSeconds: durationSec,
  };
}
