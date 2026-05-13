import { v4 as uuid } from "uuid";
import { HttpError } from "../../common/http";
import { Conversation, Message } from "../../common/types";
import { AiService } from "../ai/ai.service";
import { AudioService } from "../audio/audio.service";
import { db } from "../database/in-memory.db";

export class ConversationService {
  constructor(
    private readonly aiService: AiService,
    private readonly audioService: AudioService,
  ) {}

  public listConversations() {
    return db.conversations
      .map((conversation) => ({
        ...conversation,
        messages: db.messages.filter((message) => message.conversationId === conversation.id),
      }));
  }

  public createConversation(voiceProfileId: string) {
    const profile = db.voiceProfiles.find((entry) => entry.id === voiceProfileId);

    if (!profile) {
      throw new HttpError(404, "Voice profile not found");
    }

    const conversation: Conversation = {
      id: uuid(),
      voiceProfileId,
      channel: "dashboard",
      createdAt: new Date().toISOString(),
    };

    db.conversations.push(conversation);
    return conversation;
  }

  public getConversation(conversationId: string) {
    const conversation = db.conversations.find((entry) => entry.id === conversationId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    return {
      ...conversation,
      messages: db.messages.filter((message) => message.conversationId === conversationId),
    };
  }

  public async askQuestion(conversationId: string, question: string) {
    const conversation = db.conversations.find((entry) => entry.id === conversationId);

    if (!conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    const profile = db.voiceProfiles.find((entry) => entry.id === conversation.voiceProfileId);

    if (!profile || profile.status !== "ready" || !profile.providerVoiceId) {
      throw new HttpError(400, "Selected voice profile is not ready");
    }

    const questionMessage: Message = {
      id: uuid(),
      conversationId,
      sender: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };

    db.messages.push(questionMessage);

    const customRole = (profile.notes ?? "").split("::")[1] || undefined;

    const HISTORY_LIMIT = 10;
    const priorMessages = db.messages
      .filter((m) => m.conversationId === conversationId && m.id !== questionMessage.id)
      .slice(-HISTORY_LIMIT)
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("model" as const),
        text: m.content,
      }));

    const answerText = await this.aiService.generateAnswer(question, profile.name, customRole, priorMessages);
    const audio = await this.audioService.synthesizeAnswer({
      text: answerText,
      voiceId: profile.providerVoiceId,
      voiceProfileId: profile.id,
    });

    const answerMessage: Message = {
      id: uuid(),
      conversationId,
      sender: "assistant",
      content: answerText,
      audioUrl: audio.audioUrl,
      audioDurationSeconds: audio.audioDurationSeconds,
      llmProvider: "gemini",
      ttsProvider: audio.provider,
      createdAt: new Date().toISOString(),
    };

    db.messages.push(answerMessage);

    return {
      conversationId,
      questionMessage,
      answerMessage,
      ttsError: audio.ttsError,
    };
  }
}
