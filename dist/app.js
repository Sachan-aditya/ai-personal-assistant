"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_1 = require("./common/http");
const env_1 = require("./config/env");
const ai_service_1 = require("./modules/ai/ai.service");
const audio_service_1 = require("./modules/audio/audio.service");
const conversation_service_1 = require("./modules/conversations/conversation.service");
const conversation_routes_1 = require("./modules/conversations/conversation.routes");
const storage_service_1 = require("./modules/storage/storage.service");
const voice_routes_1 = require("./modules/voice/voice.routes");
const voice_service_1 = require("./modules/voice/voice.service");
function createApp() {
    const app = (0, express_1.default)();
    const storageService = new storage_service_1.StorageService();
    const aiService = new ai_service_1.AiService();
    const audioService = new audio_service_1.AudioService();
    const voiceService = new voice_service_1.VoiceService();
    const conversationService = new conversation_service_1.ConversationService(aiService, audioService);
    app.use((0, cors_1.default)({
        origin: env_1.env.webOrigin,
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use("/uploads", express_1.default.static(storage_service_1.uploadsDir));
    app.use("/generated-audio", express_1.default.static(storage_service_1.generatedAudioDir));
    app.get("/api/v1/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.use("/api/v1/voice-profiles", (0, voice_routes_1.createVoiceRouter)(voiceService, storageService));
    app.use("/api/v1/conversations", (0, conversation_routes_1.createConversationRouter)(conversationService));
    app.use(http_1.notFound);
    app.use(http_1.errorHandler);
    return app;
}
