"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from project root (2 levels up from apps/api/src/config/)
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../../../.env") });
exports.env = {
    apiPort: Number(process.env.API_PORT ?? 4000),
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    geminiApiKey: process.env.GEMINI_API_KEY ?? "",
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
    elevenLabsModelId: process.env.ELEVENLABS_VOICE_MODEL_ID ?? "eleven_multilingual_v2",
    azureOpenAiKey: process.env.AZURE_OPENAI_API_KEY ?? "",
    azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT ?? "",
    azureOpenAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT ?? "",
    azureOpenAiApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
    ttsServerUrl: process.env.TTS_SERVER_URL ?? "http://localhost:5000",
};
