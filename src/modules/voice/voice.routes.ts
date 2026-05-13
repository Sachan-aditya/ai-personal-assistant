import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "../../common/http";
import { StorageService, uploadsDir } from "../storage/storage.service";
import { VoiceService } from "./voice.service";

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const createProfileSchema = z.object({
  name: z.string().min(2),
  language: z.string().default("en"),
  notes: z.string().optional(),
});

export function createVoiceRouter(
  voiceService: VoiceService,
  storageService: StorageService,
) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      res.json({ data: voiceService.listProfiles() });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const input = createProfileSchema.parse(req.body);
      const profile = voiceService.createProfile(input);
      res.status(201).json({ data: profile });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const profile = voiceService.getProfile(req.params.id as string);
      res.json({ data: profile });
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const schema = z.object({
        notes: z.string().optional(),
        name: z.string().min(2).optional(),
      });
      const input = schema.parse(req.body);
      const profile = voiceService.updateProfile(req.params.id as string, input);
      res.json({ data: profile });
    }),
  );

  router.post(
    "/:id/samples",
    upload.single("audio"),
    asyncHandler(async (req, res) => {
      if (!req.file) {
        res.status(400).json({ error: { message: "Audio file is required", statusCode: 400 } });
        return;
      }

      const saved = storageService.saveUpload(req.file);
      const sample = voiceService.addSample(req.params.id as string, {
        fileName: req.file.originalname,
        storedFileName: saved.fileName,
        fileUrl: saved.fileUrl,
        mimeType: req.file.mimetype,
      });

      res.status(201).json({ data: sample });
    }),
  );

  router.post(
    "/:id/submit",
    asyncHandler(async (req, res) => {
      const profile = await voiceService.submitProfile(req.params.id as string);
      res.json({ data: profile });
    }),
  );

  router.delete(
    "/samples/:sampleId",
    asyncHandler(async (req, res) => {
      const result = voiceService.deleteSample(req.params.sampleId as string);
      res.json(result);
    }),
  );

  return router;
}
