import { HttpError } from "../../common/http";
import { env } from "../../config/env";

const ROLE_PROMPTS: Record<string, string> = {
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

function getSystemPrompt(agentName: string, customRole?: string): string {
  if (ROLE_PROMPTS[agentName]) return ROLE_PROMPTS[agentName];

  // "My Voice" is the user's cloned voice — speak as the chosen role, not as a person named "My Voice".
  if (agentName === "My Voice") {
    const role = customRole || "Personal Assistant";
    if (role === "Personal Assistant") return DEFAULT_PROMPT;
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

export interface ChatHistoryEntry {
  role: "user" | "model";
  text: string;
}

export class AiService {
  public async generateAnswer(
    question: string,
    agentName: string = "",
    customRole?: string,
    history: ChatHistoryEntry[] = [],
  ): Promise<string> {
    const trimmed = question.trim();
    if (!trimmed) {
      return "Could you share a bit more detail so I can help you out?";
    }

    if (!env.geminiApiKey || env.geminiApiKey === "your-gemini-api-key") {
      throw new HttpError(500, "GEMINI_API_KEY is not configured");
    }

    const systemPrompt = getSystemPrompt(agentName, customRole);

    console.log(`[AI] Gemini → "${trimmed.substring(0, 50)}..." agent=${agentName} history=${history.length}`);

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(env.geminiApiKey);
    const modelNames = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

    let lastErr: unknown = null;
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
          if (!text) throw new HttpError(502, "Gemini returned an empty response");
          if (modelName !== modelNames[0] || attempt > 0) {
            console.log(`[AI] Gemini recovered via ${modelName} (attempt ${attempt + 1})`);
          }
          return text;
        } catch (err) {
          lastErr = err;
          const msg = (err as Error).message ?? "";
          const transient = /\b(503|429|overloaded|high demand|temporarily|unavailable)\b/i.test(msg);
          console.warn(`[AI] ${modelName} attempt ${attempt + 1} failed: ${msg.slice(0, 160)}`);
          if (!transient) break;
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
    } catch (azureErr) {
      console.error(`[AI] Azure OpenAI fallback failed:`, (azureErr as Error).message);
    }

    console.error(`[AI] All providers failed:`, lastErr);
    if (lastErr instanceof HttpError) throw lastErr;
    throw new HttpError(502, `LLM request failed: ${(lastErr as Error)?.message ?? "unknown"}`);
  }

  private async callAzureOpenAi(
    systemPrompt: string,
    history: ChatHistoryEntry[],
    question: string,
  ): Promise<string | null> {
    const { azureOpenAiKey, azureOpenAiEndpoint, azureOpenAiDeployment, azureOpenAiApiVersion } = env;
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
    const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || null;
  }
}
