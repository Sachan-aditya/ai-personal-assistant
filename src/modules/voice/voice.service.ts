import path from "node:path";
import { v4 as uuid } from "uuid";
import { HttpError } from "../../common/http";
import { VoiceProfile, VoiceSample } from "../../common/types";
import { cloneVoice, resolveVoiceId } from "../audio/elevenlabs.client";
import { analyzeSample } from "../audio/cloning.client";
import { uploadsDir } from "../storage/storage.service";
import { db } from "../database/in-memory.db";

export class VoiceService {
  public listProfiles() {
    return db.voiceProfiles;
  }

  public createProfile(input: { name: string; language: string; notes?: string }) {
    const now = new Date().toISOString();
    const profile: VoiceProfile = {
      id: uuid(),
      name: input.name,
      status: "draft",
      provider: null,
      providerVoiceId: null,
      language: input.language,
      sampleCount: 0,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    db.voiceProfiles.push(profile);
    return profile;
  }

  public getProfile(profileId: string) {
    const profile = db.voiceProfiles.find((entry) => entry.id === profileId);

    if (!profile) {
      throw new HttpError(404, "Voice profile not found");
    }

    return {
      ...profile,
      samples: db.voiceSamples.filter((sample) => sample.voiceProfileId === profileId),
    };
  }

  public addSample(
    profileId: string,
    input: {
      fileName: string;
      storedFileName?: string;
      fileUrl: string;
      mimeType?: string;
      durationSeconds?: number;
    },
  ) {
    const profile = db.voiceProfiles.find((entry) => entry.id === profileId);

    if (!profile) {
      throw new HttpError(404, "Voice profile not found");
    }

    const sample: VoiceSample = {
      id: uuid(),
      voiceProfileId: profileId,
      fileName: input.fileName,
      storedFileName: input.storedFileName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds,
      uploadedAt: new Date().toISOString(),
    };

    db.voiceSamples.push(sample);
    profile.sampleCount += 1;
    profile.updatedAt = new Date().toISOString();

    return sample;
  }

  public async submitProfile(profileId: string): Promise<VoiceProfile & { cloneError?: string }> {
    const profile = db.voiceProfiles.find((entry) => entry.id === profileId);

    if (!profile) {
      throw new HttpError(404, "Voice profile not found");
    }

    const samples = db.voiceSamples.filter((s) => s.voiceProfileId === profileId);
    let cloneError: string | undefined;

    if (samples.length > 0) {
      const filePaths = samples
        .map((s) => s.storedFileName)
        .filter((f): f is string => Boolean(f))
        .map((f) => path.join(uploadsDir, f));

      if (filePaths.length > 0) {
        try {
          const { voiceId } = await cloneVoice({
            name: `${profile.name}-${profile.id.slice(0, 8)}`,
            description: profile.notes,
            filePaths,
          });
          profile.provider = "elevenlabs";
          profile.providerVoiceId = voiceId;
          profile.status = "ready";
          profile.updatedAt = new Date().toISOString();
          console.log(`[VoiceService] cloned voice for ${profile.name}: ${voiceId}`);
          return profile;
        } catch (err) {
          cloneError = err instanceof Error ? err.message : String(err);
          console.warn(`[VoiceService] clone failed, falling back to stock voice: ${cloneError}`);
        }
      }
    }

    profile.status = "ready";
    profile.provider = "elevenlabs";
    profile.providerVoiceId = resolveVoiceId(profile.name, profile.notes);
    profile.updatedAt = new Date().toISOString();

    // Try the Python pitch-clone server with the latest sample. This is the
    // demo-friendly path that runs offline. Failure is non-fatal — the profile
    // still works via the stock persona voice.
    const latest = samples[samples.length - 1];
    if (latest?.storedFileName) {
      try {
        const analyzed = await analyzeSample(latest.storedFileName);
        profile.cloneProfileId = analyzed.profile_id;
        profile.clonedSampleFile = latest.storedFileName;
        profile.provider = "voice-clone";
        console.log(
          `[VoiceService] pitch-clone profile=${analyzed.profile_id} f0=${analyzed.f0_hz.toFixed(1)}Hz voice=${analyzed.voice_id}`,
        );
      } catch (err) {
        console.warn(`[VoiceService] pitch-clone failed (using stock voice): ${(err as Error).message}`);
      }
    }

    return cloneError ? Object.assign({}, profile, { cloneError }) : profile;
  }

  public updateProfile(profileId: string, input: { notes?: string; name?: string }) {
    const profile = db.voiceProfiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new HttpError(404, "Voice profile not found");
    }
    if (input.notes !== undefined) profile.notes = input.notes;
    if (input.name !== undefined) profile.name = input.name;
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  public deleteSample(sampleId: string) {
    const sample = db.voiceSamples.find((entry) => entry.id === sampleId);
    if (!sample) {
      throw new HttpError(404, "Sample not found");
    }

    const profile = db.voiceProfiles.find((entry) => entry.id === sample.voiceProfileId);
    if (!profile) {
      throw new HttpError(404, "Voice profile not found");
    }

    db.voiceSamples = db.voiceSamples.filter((entry) => entry.id !== sampleId);
    profile.sampleCount = Math.max(0, profile.sampleCount - 1);
    profile.updatedAt = new Date().toISOString();

    return { success: true };
  }
}
