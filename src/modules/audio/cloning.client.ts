import { env } from "../../config/env";

export interface CloneAnalyzeResult {
  profile_id: string;
  f0_hz: number;
  gender: string;
  voice_id: string;
}

export async function analyzeSample(speakerWavFilename: string): Promise<CloneAnalyzeResult> {
  const resp = await fetch(`${env.ttsServerUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speaker_wav: speakerWavFilename }),
  });
  if (!resp.ok) {
    throw new Error(`TTS analyze ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return (await resp.json()) as CloneAnalyzeResult;
}

export interface CloneSynthResult {
  audioUrl: string;
  audioDurationSeconds: number;
}

export async function synthesizeCloned(input: { text: string; cloneProfileId: string }): Promise<CloneSynthResult> {
  const resp = await fetch(`${env.ttsServerUrl}/api/tts-clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.text, profile_id: input.cloneProfileId }),
  });
  if (!resp.ok) {
    throw new Error(`TTS clone ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return (await resp.json()) as CloneSynthResult;
}
