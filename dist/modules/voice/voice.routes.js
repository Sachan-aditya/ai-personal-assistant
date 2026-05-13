"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVoiceRouter = createVoiceRouter;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const http_1 = require("../../common/http");
const storage_service_1 = require("../storage/storage.service");
const upload = (0, multer_1.default)({
    dest: storage_service_1.uploadsDir,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});
const createProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    language: zod_1.z.string().default("en"),
    notes: zod_1.z.string().optional(),
});
function createVoiceRouter(voiceService, storageService) {
    const router = (0, express_1.Router)();
    router.get("/", (0, http_1.asyncHandler)(async (req, res) => {
        res.json({ data: voiceService.listProfiles() });
    }));
    router.post("/", (0, http_1.asyncHandler)(async (req, res) => {
        const input = createProfileSchema.parse(req.body);
        const profile = voiceService.createProfile(input);
        res.status(201).json({ data: profile });
    }));
    router.get("/:id", (0, http_1.asyncHandler)(async (req, res) => {
        const profile = voiceService.getProfile(req.params.id);
        res.json({ data: profile });
    }));
    router.patch("/:id", (0, http_1.asyncHandler)(async (req, res) => {
        const schema = zod_1.z.object({
            notes: zod_1.z.string().optional(),
            name: zod_1.z.string().min(2).optional(),
        });
        const input = schema.parse(req.body);
        const profile = voiceService.updateProfile(req.params.id, input);
        res.json({ data: profile });
    }));
    router.post("/:id/samples", upload.single("audio"), (0, http_1.asyncHandler)(async (req, res) => {
        if (!req.file) {
            res.status(400).json({ error: { message: "Audio file is required", statusCode: 400 } });
            return;
        }
        const saved = storageService.saveUpload(req.file);
        const sample = voiceService.addSample(req.params.id, {
            fileName: req.file.originalname,
            storedFileName: saved.fileName,
            fileUrl: saved.fileUrl,
            mimeType: req.file.mimetype,
        });
        res.status(201).json({ data: sample });
    }));
    router.post("/:id/submit", (0, http_1.asyncHandler)(async (req, res) => {
        const profile = await voiceService.submitProfile(req.params.id);
        res.json({ data: profile });
    }));
    router.delete("/samples/:sampleId", (0, http_1.asyncHandler)(async (req, res) => {
        const result = voiceService.deleteSample(req.params.sampleId);
        res.json(result);
    }));
    return router;
}
