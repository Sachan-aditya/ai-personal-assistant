"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = exports.generatedAudioDir = exports.uploadsDir = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
exports.uploadsDir = node_path_1.default.resolve(__dirname, "../../../uploads");
exports.generatedAudioDir = node_path_1.default.resolve(__dirname, "../../../generated-audio");
function ensureDirectory(targetPath) {
    if (!node_fs_1.default.existsSync(targetPath)) {
        node_fs_1.default.mkdirSync(targetPath, { recursive: true });
    }
}
class StorageService {
    constructor() {
        ensureDirectory(exports.uploadsDir);
        ensureDirectory(exports.generatedAudioDir);
    }
    saveUpload(file) {
        return {
            fileName: file.filename,
            fileUrl: `/uploads/${file.filename}`,
        };
    }
    createGeneratedAudioPlaceholder(fileName) {
        const absolutePath = node_path_1.default.join(exports.generatedAudioDir, fileName);
        if (!node_fs_1.default.existsSync(absolutePath)) {
            node_fs_1.default.writeFileSync(absolutePath, "Mock audio placeholder");
        }
        return {
            absolutePath,
            fileUrl: `/generated-audio/${fileName}`,
        };
    }
}
exports.StorageService = StorageService;
