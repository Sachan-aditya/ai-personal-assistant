"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversationRouter = createConversationRouter;
const express_1 = require("express");
const zod_1 = require("zod");
const http_1 = require("../../common/http");
const createConversationSchema = zod_1.z.object({
    voiceProfileId: zod_1.z.string().min(1),
});
const askQuestionSchema = zod_1.z.object({
    question: zod_1.z.string().min(2),
});
function createConversationRouter(conversationService) {
    const router = (0, express_1.Router)();
    router.get("/", (0, http_1.asyncHandler)(async (req, res) => {
        res.json({ data: conversationService.listConversations() });
    }));
    router.post("/", (0, http_1.asyncHandler)(async (req, res) => {
        const input = createConversationSchema.parse(req.body);
        const conversation = conversationService.createConversation(input.voiceProfileId);
        res.status(201).json({ data: conversation });
    }));
    router.get("/:id", (0, http_1.asyncHandler)(async (req, res) => {
        const conversation = conversationService.getConversation(req.params.id);
        res.json({ data: conversation });
    }));
    router.post("/:id/ask", (0, http_1.asyncHandler)(async (req, res) => {
        const input = askQuestionSchema.parse(req.body);
        const result = await conversationService.askQuestion(req.params.id, input.question);
        res.json(result);
    }));
    return router;
}
