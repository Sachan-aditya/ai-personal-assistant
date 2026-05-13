import cors from "cors";
import express from "express";
import { errorHandler, notFound } from "./common/http";
import { env } from "./config/env";
import { AiService } from "./modules/ai/ai.service";
import { AudioService } from "./modules/audio/audio.service";
import { ConversationService } from "./modules/conversations/conversation.service";
import { createConversationRouter } from "./modules/conversations/conversation.routes";
import { generatedAudioDir, StorageService, uploadsDir } from "./modules/storage/storage.service";
import { createVoiceRouter } from "./modules/voice/voice.routes";
import { VoiceService } from "./modules/voice/voice.service";

export function createApp() {
  const app = express();

  const storageService = new StorageService();
  const aiService = new AiService();
  const audioService = new AudioService();
  const voiceService = new VoiceService();
  const conversationService = new ConversationService(aiService, audioService);

  app.use(
    cors({
      origin: env.webOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));
  app.use("/generated-audio", express.static(generatedAudioDir));

  app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/voice-profiles", createVoiceRouter(voiceService, storageService));
  app.use("/api/v1/conversations", createConversationRouter(conversationService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
