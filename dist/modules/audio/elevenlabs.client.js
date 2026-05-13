"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VOICE_ID = exports.VOICE_IDS = void 0;
exports.cloneVoice = cloneVoice;
exports.resolveVoiceId = resolveVoiceId;
exports.synthesize = synthesize;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const http_1 = require("../../common/http");
const env_1 = require("../../config/env");
const ELEVENLABS_BASE = "https://api.elevenlabs.io";
async function cloneVoice(input) {
    if (!env_1.env.elevenLabsApiKey) {
        throw new http_1.HttpError(500, "ELEVENLABS_API_KEY is not configured");
    }
    if (input.filePaths.length === 0) {
        throw new http_1.HttpError(400, "At least one audio sample is required to clone");
    }
    const form = new FormData();
    form.append("name", input.name);
    if (input.description)
        form.append("description", input.description);
    for (const fp of input.filePaths) {
        const buf = await node_fs_1.promises.readFile(fp);
        const ext = node_path_1.default.extname(fp).toLowerCase();
        const mime = ext === ".mp3" ? "audio/mpeg"
            : ext === ".wav" ? "audio/wav"
                : ext === ".m4a" ? "audio/mp4"
                    : ext === ".ogg" ? "audio/ogg"
                        : ext === ".webm" ? "audio/webm"
                            : "application/octet-stream";
        const blob = new Blob([new Uint8Array(buf)], { type: mime });
        form.append("files", blob, node_path_1.default.basename(fp));
    }
    const resp = await fetch(`${ELEVENLABS_BASE}/v1/voices/add`, {
        method: "POST",
        headers: { "xi-api-key": env_1.env.elevenLabsApiKey },
        body: form,
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new http_1.HttpError(502, `ElevenLabs clone ${resp.status}: ${body.slice(0, 400)}`);
    }
    const json = (await resp.json());
    if (!json.voice_id) {
        throw new http_1.HttpError(502, "ElevenLabs clone response missing voice_id");
    }
    return { voiceId: json.voice_id };
}
// Stable public ElevenLabs voice IDs. Verified working with no extra account permissions.
exports.VOICE_IDS = {
    george: "JBFqnCBsd6RMkjVDRZzb",
    adam: "pNInz6obpgDQGcFmaJgB",
    daniel: "onwK4e9ZLuTAKqWW03F9",
    brian: "nPczCjzI2devNBz1zQrb",
    sarah: "EXAVITQu4vr4xnSDxMaL",
    emily: "LcfcDJNUP1GQjkzn1xUU",
    charlotte: "XB0fDUnXU5powFXDhCwa",
    charlie: "IKne3meq5aSn9XLyUdCD",
};
exports.DEFAULT_VOICE_ID = exports.VOICE_IDS.george;
const PERSONA_VOICE_MAP = {
    "Dr. Smith": exports.VOICE_IDS.adam,
    "Prof. Williams": exports.VOICE_IDS.george,
    "Sarah Chen": exports.VOICE_IDS.sarah,
    "Raj Patel": exports.VOICE_IDS.daniel,
    "Emma Davis": exports.VOICE_IDS.emily,
    "James Wilson": exports.VOICE_IDS.brian,
};
// UI exposes Edge-TTS-style voice keys ("guy", "aria", "thomas"...). Map each
// to a stable ElevenLabs voice ID so the picker actually changes the voice.
const VOICE_KEY_MAP = {
    guy: exports.VOICE_IDS.adam,
    andrew: exports.VOICE_IDS.adam,
    brian: exports.VOICE_IDS.brian,
    eric: exports.VOICE_IDS.daniel,
    roger: exports.VOICE_IDS.george,
    jenny: exports.VOICE_IDS.sarah,
    aria: exports.VOICE_IDS.charlotte,
    emma: exports.VOICE_IDS.emily,
    prabhat: exports.VOICE_IDS.adam,
    neerja: exports.VOICE_IDS.sarah,
    ryan: exports.VOICE_IDS.charlie,
    sonia: exports.VOICE_IDS.charlotte,
    thomas: exports.VOICE_IDS.george,
};
function resolveVoiceId(profileName, notes) {
    const personaMatch = PERSONA_VOICE_MAP[profileName];
    if (personaMatch)
        return personaMatch;
    const voiceKey = (notes ?? "").split("::")[0];
    if (voiceKey && VOICE_KEY_MAP[voiceKey])
        return VOICE_KEY_MAP[voiceKey];
    return exports.DEFAULT_VOICE_ID;
}
async function synthesize(input) {
    if (!env_1.env.elevenLabsApiKey) {
        throw new http_1.HttpError(500, "ELEVENLABS_API_KEY is not configured");
    }
    const url = `${ELEVENLABS_BASE}/v1/text-to-speech/${input.voiceId}`;
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "xi-api-key": env_1.env.elevenLabsApiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
        },
        body: JSON.stringify({
            text: input.text,
            model_id: env_1.env.elevenLabsModelId,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
            },
        }),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new http_1.HttpError(502, `ElevenLabs TTS ${resp.status}: ${body.slice(0, 400)}`);
    }
    const audioBuffer = Buffer.from(await resp.arrayBuffer());
    await node_fs_1.promises.mkdir(input.outputDir, { recursive: true });
    const outputPath = node_path_1.default.join(input.outputDir, input.outputFileName);
    await node_fs_1.promises.writeFile(outputPath, audioBuffer);
    const durationSec = Math.max(1, Math.round(audioBuffer.length / 16000));
    return {
        audioUrl: `/generated-audio/${input.outputFileName}`,
        audioDurationSeconds: durationSec,
    };
}
