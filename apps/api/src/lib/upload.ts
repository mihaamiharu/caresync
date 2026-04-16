import multer from "multer";
import { createMiddleware } from "hono/factory";
import {
  validateFile,
  generateStoredFileName,
  saveFile,
  type UploadedFile,
} from "./file-storage";
import type { AppEnv } from "../app";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

export type FileUploadCtx = AppEnv & {
  Variables: {
    uploadedFile: UploadedFile;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runMulter(
  req: Request,
  uploadInst: any
): Promise<{ file: Express.Multer.File } | { error: string }> {
  return new Promise((resolve) => {
    uploadInst.single("file")(req as any, {} as any, (err: any) => {
      if (err) {
        resolve({ error: err.message || "Upload failed" });
      } else {
        const file = (req as any).file;
        if (!file) {
          resolve({ error: "No file provided" });
        } else {
          resolve({ file });
        }
      }
    });
  });
}

export const uploadMiddleware = createMiddleware<FileUploadCtx>(
  async (c, next) => {
    const result = await runMulter(c.req.raw, upload);

    if ("error" in result) {
      return c.json({ message: result.error }, 400);
    }

    const { file } = result;
    const validation = validateFile(file.mimetype, file.size);
    if (!validation.valid) {
      return c.json({ message: validation.error }, 400);
    }

    const storedName = generateStoredFileName(file.originalname);
    const url = await saveFile(file.buffer, storedName);

    const uploadedFile: UploadedFile = {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      url,
    };

    c.set("uploadedFile", uploadedFile);
    await next();
  }
);
