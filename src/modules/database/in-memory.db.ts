import { Conversation, Message, VoiceProfile, VoiceSample } from "../../common/types";

export const db = {
  voiceProfiles: [] as VoiceProfile[],
  voiceSamples: [] as VoiceSample[],
  conversations: [] as Conversation[],
  messages: [] as Message[],
};
