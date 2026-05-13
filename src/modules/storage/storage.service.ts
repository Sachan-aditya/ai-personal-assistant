import fs from "node:fs";
import path from "node:path";

export const uploadsDir = path.resolve(__dirname, "../../../uploads");
export const generatedAudioDir = path.resolve(__dirname, "../../../generated-audio");

function ensureDirectory(targetPath: string) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

export class StorageService {
  constructor() {
    ensureDirectory(uploadsDir);
    ensureDirectory(generatedAudioDir);
  }

  public saveUpload(file: Express.Multer.File) {
    return {
      fileName: file.filename,
      fileUrl: `/uploads/${file.filename}`,
    };
  }

  public createGeneratedAudioPlaceholder(fileName: string) {
    const absolutePath = path.join(generatedAudioDir, fileName);

    if (!fs.existsSync(absolutePath)) {
      fs.writeFileSync(absolutePath, "Mock audio placeholder");
    }

    return {
      absolutePath,
      fileUrl: `/generated-audio/${fileName}`,
    };
  }
}
