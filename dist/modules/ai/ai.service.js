"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const http_1 = require("../../common/http");
const env_1 = require("../../config/env");
const ROLE_PROMPTS = {
    "Dr. Smith": `You are Dr. Smith, a knowledgeable and caring medical advisor.
You provide general health guidance, explain symptoms, suggest when to see a specialist, and promote healthy habits.
Speak like a real doctor — professional but warm. Use medical terms but explain them simply.
Keep answers concise (2-4 sentences). Always remind patients to consult a real doctor for serious concerns.`,
    "Prof. Williams": `You are Prof. Williams, an experienced and passionate teacher.
You explain concepts clearly with examples and analogies. You adapt your explanation to the student's level.
You encourage curiosity and ask follow-up questions to deepen understanding.
Keep explanations concise but thorough (2-4 sentences). Make learning feel exciting.`,
    "Sarah Chen": `You are Sarah Chen, a friendly and efficient customer support specialist.
You help with orders, refunds, shipping, account issues, and general inquiries.
You speak naturally and concisely — like a real human support agent, not a robot.
Keep answers short (2-4 sentences). Be warm, helpful, and direct.`,
    "Raj Patel": `You are Raj Patel, a sharp and patient tech support engineer.
You troubleshoot software issues, guide users through fixes step by step, and explain technical concepts simply.
You ask clarifying questions when needed and never make the user feel dumb.
Keep answers clear and actionable (2-4 sentences).`,
    "Emma Davis": `You are Emma Davis, a persuasive and knowledgeable sales consultant.
You help customers find the right product, explain features and pricing, and highlight value.
You are enthusiastic but not pushy — you genuinely want to help people make the right choice.
Keep answers engaging and concise (2-4 sentences).`,
    "James Wilson": `You are James Wilson, a professional HR assistant.
You help with company policies, leave requests, onboarding questions, benefits, and workplace guidelines.
You speak formally but approachably, and always reference company policy when relevant.
Keep answers clear and policy-aware (2-4 sentences).`,
};
const DEFAULT_PROMPT = `You are a helpful, friendly AI personal assistant.
You speak naturally and concisely — like a knowledgeable friend, not a robot.
Keep answers short (2-4 sentences). Be warm, helpful, and direct.
If you don't know something, say so honestly.`;
function getSystemPrompt(agentName, customRole) {
    if (ROLE_PROMPTS[agentName])
        return ROLE_PROMPTS[agentName];
    // "My Voice" is the user's cloned voice — speak as the chosen role, not as a person named "My Voice".
    if (agentName === "My Voice") {
        const role = customRole || "Personal Assistant";
        if (role === "Personal Assistant")
            return DEFAULT_PROMPT;
        return `You are an experienced ${role}, speaking in the user's own voice.
Be helpful, professional, and natural. Keep answers concise (2-4 sentences).
Do NOT introduce yourself by name — just answer the user's question directly.`;
    }
    if (customRole) {
        return `You are ${agentName}, a ${customRole}.
Speak naturally and concisely. Keep answers short (2-4 sentences). Be helpful and direct.`;
    }
    return DEFAULT_PROMPT;
}
class AiService {
    async generateAnswer(question, agentName = "", customRole, history = []) {
        const trimmed = question.trim();
        if (!trimmed) {
            return "Could you share a bit more detail so I can help you out?";
        }
        if (!env_1.env.geminiApiKey || env_1.env.geminiApiKey === "your-gemini-api-key") {
            throw new http_1.HttpError(500, "GEMINI_API_KEY is not configured");
        }
        const systemPrompt = getSystemPrompt(agentName, customRole);
        console.log(`[AI] Gemini → "${trimmed.substring(0, 50)}..." agent=${agentName} history=${history.length}`);
        const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require("@google/generative-ai")));
        const genAI = new GoogleGenerativeAI(env_1.env.geminiApiKey);
        const modelNames = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
        let lastErr = null;
        for (const modelName of modelNames) {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        systemInstruction: systemPrompt,
                    });
                    const chat = model.startChat({
                        history: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
                    });
                    const result = await chat.sendMessage(trimmed);
                    const text = result.response.text();
                    if (!text)
                        throw new http_1.HttpError(502, "Gemini returned an empty response");
                    if (modelName !== modelNames[0] || attempt > 0) {
                        console.log(`[AI] Gemini recovered via ${modelName} (attempt ${attempt + 1})`);
                    }
                    return text;
                }
                catch (err) {
                    lastErr = err;
                    const msg = err.message ?? "";
                    const transient = /\b(503|429|overloaded|high demand|temporarily|unavailable)\b/i.test(msg);
                    console.warn(`[AI] ${modelName} attempt ${attempt + 1} failed: ${msg.slice(0, 160)}`);
                    if (!transient)
                        break;
                    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
                }
            }
        }
        console.warn(`[AI] Gemini exhausted, trying Azure OpenAI fallback…`);
        try {
            const azureText = await this.callAzureOpenAi(systemPrompt, history, trimmed);
            if (azureText) {
                console.log(`[AI] Azure OpenAI fallback succeeded`);
                return azureText;
            }
        }
        catch (azureErr) {
            console.error(`[AI] Azure OpenAI fallback failed:`, azureErr.message);
        }
        console.error(`[AI] All providers failed:`, lastErr);
        if (lastErr instanceof http_1.HttpError)
            throw lastErr;
        throw new http_1.HttpError(502, `LLM request failed: ${lastErr?.message ?? "unknown"}`);
    }
    async callAzureOpenAi(systemPrompt, history, question) {
        const { azureOpenAiKey, azureOpenAiEndpoint, azureOpenAiDeployment, azureOpenAiApiVersion } = env_1.env;
        if (!azureOpenAiKey || !azureOpenAiEndpoint || !azureOpenAiDeployment) {
            return null;
        }
        const base = azureOpenAiEndpoint.replace(/\/+$/, "");
        const url = `${base}/openai/deployments/${azureOpenAiDeployment}/chat/completions?api-version=${azureOpenAiApiVersion}`;
        const messages = [
            { role: "system", content: systemPrompt },
            ...history.map((m) => ({ role: m.role === "model" ? "assistant" : "user", content: m.text })),
            { role: "user", content: question },
        ];
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "api-key": azureOpenAiKey },
            body: JSON.stringify({ messages, temperature: 0.7, max_tokens: 400 }),
        });
        if (!resp.ok) {
            const body = await resp.text();
            throw new Error(`Azure ${resp.status}: ${body.slice(0, 300)}`);
        }
        const data = (await resp.json());
        return data.choices?.[0]?.message?.content?.trim() || null;
    }
}
exports.AiService = AiService;
