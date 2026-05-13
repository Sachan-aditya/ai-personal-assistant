"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceService = void 0;
const node_path_1 = __importDefault(require("node:path"));
const uuid_1 = require("uuid");
const http_1 = require("../../common/http");
const elevenlabs_client_1 = require("../audio/elevenlabs.client");
const cloning_client_1 = require("../audio/cloning.client");
const storage_service_1 = require("../storage/storage.service");
const in_memory_db_1 = require("../database/in-memory.db");
class VoiceService {
    listProfiles() {
        return in_memory_db_1.db.voiceProfiles;
    }
    createProfile(input) {
        const now = new Date().toISOString();
        const profile = {
            id: (0, uuid_1.v4)(),
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
        in_memory_db_1.db.voiceProfiles.push(profile);
        return profile;
    }
    getProfile(profileId) {
        const profile = in_memory_db_1.db.voiceProfiles.find((entry) => entry.id === profileId);
        if (!profile) {
            throw new http_1.HttpError(404, "Voice profile not found");
        }
        return {
            ...profile,
            samples: in_memory_db_1.db.voiceSamples.filter((sample) => sample.voiceProfileId === profileId),
        };
    }
    addSample(profileId, input) {
        const profile = in_memory_db_1.db.voiceProfiles.find((entry) => entry.id === profileId);
        if (!profile) {
            throw new http_1.HttpError(404, "Voice profile not found");
        }
        const sample = {
            id: (0, uuid_1.v4)(),
            voiceProfileId: profileId,
            fileName: input.fileName,
            storedFileName: input.storedFileName,
            fileUrl: input.fileUrl,
            mimeType: input.mimeType,
            durationSeconds: input.durationSeconds,
            uploadedAt: new Date().toISOString(),
        };
        in_memory_db_1.db.voiceSamples.push(sample);
        profile.sampleCount += 1;
        profile.updatedAt = new Date().toISOString();
        return sample;
    }
    async submitProfile(profileId) {
        const profile = in_memory_db_1.db.voiceProfiles.find((entry) => entry.id === profileId);
        if (!profile) {
            throw new http_1.HttpError(404, "Voice profile not found");
        }
        const samples = in_memory_db_1.db.voiceSamples.filter((s) => s.voiceProfileId === profileId);
        let cloneError;
        if (samples.length > 0) {
            const filePaths = samples
                .map((s) => s.storedFileName)
                .filter((f) => Boolean(f))
                .map((f) => node_path_1.default.join(storage_service_1.uploadsDir, f));
            if (filePaths.length > 0) {
                try {
                    const { voiceId } = await (0, elevenlabs_client_1.cloneVoice)({
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
                }
                catch (err) {
                    cloneError = err instanceof Error ? err.message : String(err);
                    console.warn(`[VoiceService] clone failed, falling back to stock voice: ${cloneError}`);
                }
            }
        }
        profile.status = "ready";
        profile.provider = "elevenlabs";
        profile.providerVoiceId = (0, elevenlabs_client_1.resolveVoiceId)(profile.name, profile.notes);
        profile.updatedAt = new Date().toISOString();
        // Try the Python pitch-clone server with the latest sample. This is the
        // demo-friendly path that runs offline. Failure is non-fatal — the profile
        // still works via the stock persona voice.
        const latest = samples[samples.length - 1];
        if (latest?.storedFileName) {
            try {
                const analyzed = await (0, cloning_client_1.analyzeSample)(latest.storedFileName);
                profile.cloneProfileId = analyzed.profile_id;
                profile.clonedSampleFile = latest.storedFileName;
                profile.provider = "voice-clone";
                console.log(`[VoiceService] pitch-clone profile=${analyzed.profile_id} f0=${analyzed.f0_hz.toFixed(1)}Hz voice=${analyzed.voice_id}`);
            }
            catch (err) {
                console.warn(`[VoiceService] pitch-clone failed (using stock voice): ${err.message}`);
            }
        }
        return cloneError ? Object.assign({}, profile, { cloneError }) : profile;
    }
    updateProfile(profileId, input) {
        const profile = in_memory_db_1.db.voiceProfiles.find((entry) => entry.id === profileId);
        if (!profile) {
            throw new http_1.HttpError(404, "Voice profile not found");
        }
        if (input.notes !== undefined)
            profile.notes = input.notes;
        if (input.name !== undefined)
            profile.name = input.name;
        profile.updatedAt = new Date().toISOString();
        return profile;
    }
    deleteSample(sampleId) {
        const sample = in_memory_db_1.db.voiceSamples.find((entry) => entry.id === sampleId);
        if (!sample) {
            throw new http_1.HttpError(404, "Sample not found");
        }
        const profile = in_memory_db_1.db.voiceProfiles.find((entry) => entry.id === sample.voiceProfileId);
        if (!profile) {
            throw new http_1.HttpError(404, "Voice profile not found");
        }
        in_memory_db_1.db.voiceSamples = in_memory_db_1.db.voiceSamples.filter((entry) => entry.id !== sampleId);
        profile.sampleCount = Math.max(0, profile.sampleCount - 1);
        profile.updatedAt = new Date().toISOString();
        return { success: true };
    }
}
exports.VoiceService = VoiceService;
