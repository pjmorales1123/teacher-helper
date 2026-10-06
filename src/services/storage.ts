// Stores uploaded images as files under DATA_DIR/uploads. The database only
// keeps the file name, so the database stays small and backups are simple.
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { bad } from "../lib/http.ts";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface Storage {
  saveImageDataUrl(dataUrl: string, baseName: string): string;
  pathFor(fileName: string): string;
  remove(fileName: string): void;
}

export function createStorage(uploadsDir: string): Storage {
  mkdirSync(uploadsDir, { recursive: true });
  return {
    saveImageDataUrl(dataUrl, baseName) {
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!match) bad("Image must be a JPEG, PNG or WebP data URL.");
      const ext = match[1] === "jpeg" ? "jpg" : match[1]!;
      const bytes = Buffer.from(match[2]!, "base64");
      if (bytes.length === 0) bad("Image is empty.");
      if (bytes.length > MAX_IMAGE_BYTES) bad("Image is larger than 8 MB.");
      const fileName = `${baseName}-${Date.now()}.${ext}`;
      writeFileSync(join(uploadsDir, fileName), bytes);
      return fileName;
    },
    pathFor(fileName) {
      if (!/^[A-Za-z0-9._-]+$/.test(fileName)) bad("Bad file name.");
      return join(uploadsDir, fileName);
    },
    remove(fileName) {
      const p = join(uploadsDir, fileName);
      if (existsSync(p)) unlinkSync(p);
    },
  };
}
