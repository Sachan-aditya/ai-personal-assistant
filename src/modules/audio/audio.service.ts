import { generatedAudioDir } from "../storage/storage.service";
import { db } from "../database/in-memory.db";
import { DEFAULT_VOICE_ID, synthesize } from "./elevenlabs.client";
import { synthesizeCloned } from "./cloning.client";

export class AudioService {
  public async synthesizeAnswer(input: { text: string; voiceId: string; voiceProfileId?: string }) {
    const profile = input.voiceProfileId
      ? db.voiceProfiles.find((p) => p.id === input.voiceProfileId)
      : db.voiceProfiles.find((p) => p.providerVoiceId === input.voiceId);

    // If this profile has a Python-side clone, use it.
    if (profile?.cloneProfileId) {
      try {
        console.log(`[AudioService] cloning via Python (clone=${profile.cloneProfileId})`);
        const cloned = await synthesizeCloned({
          text: input.text,
          cloneProfileId: profile.cloneProfileId,
        });
        return {
          audioUrl: cloned.audioUrl,
          audioDurationSeconds: cloned.audioDurationSeconds,
          provider: "voice-clone" as const,
          ttsError: null as string | null,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[AudioService] clone failed, falling back to ElevenLabs: ${message}`);
        // fall through to ElevenLabs
      }
    }

    const voiceId = profile?.providerVoiceId ?? input.voiceId ?? DEFAULT_VOICE_ID;
    console.log(`[AudioService] ElevenLabs synth: voice=${voiceId}`);
    const fileName = `tts-${Date.now()}.mp3`;
    try {
      const result = await synthesize({
        text: input.text,
        voiceId,
        outputDir: generatedAudioDir,
        outputFileName: fileName,
      });

      return {
        audioUrl: result.audioUrl,
        audioDurationSeconds: result.audioDurationSeconds,
        provider: "elevenlabs" as const,
        ttsError: null as string | null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[AudioService] ElevenLabs failed, falling back to browser TTS: ${message}`);
      return {
        audioUrl: undefined,
        audioDurationSeconds: undefined,
        provider: "browser" as const,
        ttsError: message,
      };
    }
  }
}
