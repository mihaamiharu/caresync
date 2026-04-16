import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface UploadedFile {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(mimeType: string, size: number): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

export function generateStoredFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = uuidv4();
  return `${uuid}${ext}`;
}

export function getFileUrl(storedName: string): string {
  return `/uploads/attachments/${storedName}`;
}

export async function saveFile(
  buffer: Buffer,
  storedName: string
): Promise<string> {
  const attachmentsDir = path.join(UPLOAD_DIR, "attachments");

  // Ensure directory exists
  if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  }

  const filePath = path.join(attachmentsDir, storedName);
  await fs.promises.writeFile(filePath, buffer);

  return getFileUrl(storedName);
}

export async function deleteFile(storedName: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, "attachments", storedName);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath);
  }
}
