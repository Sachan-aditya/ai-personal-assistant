export type VoiceProfileStatus = "draft" | "processing" | "ready" | "failed";

export interface VoiceSample {
  id: string;
  voiceProfileId: string;
  fileName: string;
  storedFileName?: string;
  fileUrl: string;
  mimeType?: string;
  durationSeconds?: number;
  transcript?: string;
  uploadedAt: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  status: VoiceProfileStatus;
  provider: string | null;
  providerVoiceId: string | null;
  language: string;
  sampleCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  clonedSampleFile?: string;
  cloneProfileId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: "user" | "assistant";
  content: string;
  audioUrl?: string;
  audioDurationSeconds?: number;
  llmProvider?: string;
  ttsProvider?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  voiceProfileId: string;
  channel: string;
  createdAt: string;
}
