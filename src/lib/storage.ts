import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { put } from "@vercel/blob";

export interface StoredFile {
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface StorageAdapter {
  saveImage(buffer: Buffer, originalName: string): Promise<StoredFile>;
}

class AdaptiveStorageAdapter implements StorageAdapter {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  async saveImage(buffer: Buffer, _originalName: string): Promise<StoredFile> {
    const id = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const filename = `${id}.webp`;

    // 1. Production cloud storage via Vercel Blob (recommended on Vercel)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const processed = await sharp(buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });

      const blob = await put(`uploads/${filename}`, processed.data, {
        access: "public",
        contentType: "image/webp",
      });

      return {
        url: blob.url,
        width: processed.info.width,
        height: processed.info.height,
        sizeBytes: processed.info.size,
      };
    }

    // 2. Fallback on Vercel if Blob storage is not yet attached: compact WebP data URL
    if (process.env.VERCEL === "1") {
      const compact = await sharp(buffer)
        .rotate()
        .resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72 })
        .toBuffer({ resolveWithObject: true });

      return {
        url: `data:image/webp;base64,${compact.data.toString("base64")}`,
        width: compact.info.width,
        height: compact.info.height,
        sizeBytes: compact.info.size,
      };
    }

    // 3. Local disk storage for local development
    await fs.mkdir(this.uploadDir, { recursive: true });
    const filePath = path.join(this.uploadDir, filename);

    const processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    await fs.writeFile(filePath, processed.data);

    return {
      url: `/api/uploads/${filename}`,
      width: processed.info.width,
      height: processed.info.height,
      sizeBytes: processed.info.size,
    };
  }
}

export const storageAdapter: StorageAdapter = new AdaptiveStorageAdapter();
