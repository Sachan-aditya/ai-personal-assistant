"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const uuid_1 = require("uuid");
const http_1 = require("../../common/http");
const in_memory_db_1 = require("../database/in-memory.db");
class ConversationService {
    aiService;
    audioService;
    constructor(aiService, audioService) {
        this.aiService = aiService;
        this.audioService = audioService;
    }
    listConversations() {
        return in_memory_db_1.db.conversations
            .map((conversation) => ({
            ...conversation,
            messages: in_memory_db_1.db.messages.filter((message) => message.conversationId === conversation.id),
        }));
    }
    createConversation(voiceProfileId) {
        const profile = in_memory_db_1.db.voiceProfiles.find((entry) => entry.id === voiceProfileId);
        if (!profile) {
            throw new http_1.HttpError(404, "Voice profile not found");
        }
        const conversation = {
            id: (0, uuid_1.v4)(),
            voiceProfileId,
            channel: "dashboard",
            createdAt: new Date().toISOString(),
        };
        in_memory_db_1.db.conversations.push(conversation);
        return conversation;
    }
    getConversation(conversationId) {
        const conversation = in_memory_db_1.db.conversations.find((entry) => entry.id === conversationId);
        if (!conversation) {
            throw new http_1.HttpError(404, "Conversation not found");
        }
        return {
            ...conversation,
            messages: in_memory_db_1.db.messages.filter((message) => message.conversationId === conversationId),
        };
    }
    async askQuestion(conversationId, question) {
        const conversation = in_memory_db_1.db.conversations.find((entry) => entry.id === conversationId);
        if (!conversation) {
            throw new http_1.HttpError(404, "Conversation not found");
        }
        const profile = in_memory_db_1.db.voiceProfiles.find((entry) => entry.id === conversation.voiceProfileId);
        if (!profile || profile.status !== "ready" || !profile.providerVoiceId) {
            throw new http_1.HttpError(400, "Selected voice profile is not ready");
        }
        const questionMessage = {
            id: (0, uuid_1.v4)(),
            conversationId,
            sender: "user",
            content: question,
            createdAt: new Date().toISOString(),
        };
        in_memory_db_1.db.messages.push(questionMessage);
        const customRole = (profile.notes ?? "").split("::")[1] || undefined;
        const HISTORY_LIMIT = 10;
        const priorMessages = in_memory_db_1.db.messages
            .filter((m) => m.conversationId === conversationId && m.id !== questionMessage.id)
            .slice(-HISTORY_LIMIT)
            .map((m) => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.content,
        }));
        const answerText = await this.aiService.generateAnswer(question, profile.name, customRole, priorMessages);
        const audio = await this.audioService.synthesizeAnswer({
            text: answerText,
            voiceId: profile.providerVoiceId,
            voiceProfileId: profile.id,
        });
        const answerMessage = {
            id: (0, uuid_1.v4)(),
            conversationId,
            sender: "assistant",
            content: answerText,
            audioUrl: audio.audioUrl,
            audioDurationSeconds: audio.audioDurationSeconds,
            llmProvider: "gemini",
            ttsProvider: audio.provider,
            createdAt: new Date().toISOString(),
        };
        in_memory_db_1.db.messages.push(answerMessage);
        return {
            conversationId,
            questionMessage,
            answerMessage,
            ttsError: audio.ttsError,
        };
    }
}
exports.ConversationService = ConversationService;
