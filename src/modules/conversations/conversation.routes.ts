import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../common/http";
import { ConversationService } from "./conversation.service";

const createConversationSchema = z.object({
  voiceProfileId: z.string().min(1),
});

const askQuestionSchema = z.object({
  question: z.string().min(2),
});

export function createConversationRouter(conversationService: ConversationService) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      res.json({ data: conversationService.listConversations() });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const input = createConversationSchema.parse(req.body);
      const conversation = conversationService.createConversation(input.voiceProfileId);
      res.status(201).json({ data: conversation });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const conversation = conversationService.getConversation(req.params.id as string);
      res.json({ data: conversation });
    }),
  );

  router.post(
    "/:id/ask",
    asyncHandler(async (req, res) => {
      const input = askQuestionSchema.parse(req.body);
      const result = await conversationService.askQuestion(req.params.id as string, input.question);
      res.json(result);
    }),
  );

  return router;
}
