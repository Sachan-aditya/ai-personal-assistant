"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSample = analyzeSample;
exports.synthesizeCloned = synthesizeCloned;
const env_1 = require("../../config/env");
async function analyzeSample(speakerWavFilename) {
    const resp = await fetch(`${env_1.env.ttsServerUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speaker_wav: speakerWavFilename }),
    });
    if (!resp.ok) {
        throw new Error(`TTS analyze ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    return (await resp.json());
}
async function synthesizeCloned(input) {
    const resp = await fetch(`${env_1.env.ttsServerUrl}/api/tts-clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.text, profile_id: input.cloneProfileId }),
    });
    if (!resp.ok) {
        throw new Error(`TTS clone ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    return (await resp.json());
}
