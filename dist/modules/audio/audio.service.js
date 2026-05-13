"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioService = void 0;
const storage_service_1 = require("../storage/storage.service");
const in_memory_db_1 = require("../database/in-memory.db");
const elevenlabs_client_1 = require("./elevenlabs.client");
const cloning_client_1 = require("./cloning.client");
class AudioService {
    async synthesizeAnswer(input) {
        const profile = input.voiceProfileId
            ? in_memory_db_1.db.voiceProfiles.find((p) => p.id === input.voiceProfileId)
            : in_memory_db_1.db.voiceProfiles.find((p) => p.providerVoiceId === input.voiceId);
        // If this profile has a Python-side clone, use it.
        if (profile?.cloneProfileId) {
            try {
                console.log(`[AudioService] cloning via Python (clone=${profile.cloneProfileId})`);
                const cloned = await (0, cloning_client_1.synthesizeCloned)({
                    text: input.text,
                    cloneProfileId: profile.cloneProfileId,
                });
                return {
                    audioUrl: cloned.audioUrl,
                    audioDurationSeconds: cloned.audioDurationSeconds,
                    provider: "voice-clone",
                    ttsError: null,
                };
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.warn(`[AudioService] clone failed, falling back to ElevenLabs: ${message}`);
                // fall through to ElevenLabs
            }
        }
        const voiceId = profile?.providerVoiceId ?? input.voiceId ?? elevenlabs_client_1.DEFAULT_VOICE_ID;
        console.log(`[AudioService] ElevenLabs synth: voice=${voiceId}`);
        const fileName = `tts-${Date.now()}.mp3`;
        try {
            const result = await (0, elevenlabs_client_1.synthesize)({
                text: input.text,
                voiceId,
                outputDir: storage_service_1.generatedAudioDir,
                outputFileName: fileName,
            });
            return {
                audioUrl: result.audioUrl,
                audioDurationSeconds: result.audioDurationSeconds,
                provider: "elevenlabs",
                ttsError: null,
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`[AudioService] ElevenLabs failed, falling back to browser TTS: ${message}`);
            return {
                audioUrl: undefined,
                audioDurationSeconds: undefined,
                provider: "browser",
                ttsError: message,
            };
        }
    }
}
exports.AudioService = AudioService;
