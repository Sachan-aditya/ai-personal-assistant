import dotenv from "dotenv";
import path from "path";

// Load .env from project root (2 levels up from apps/api/src/config/)
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export const env = {
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
