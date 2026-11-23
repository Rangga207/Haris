import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "./env";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];

export interface UploadResult {
  url: string;
  publicId?: string;
  size: number;
}

export async function saveUploadedFile(file: File): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds maximum allowed size of 5 MB.");
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid file format. Only JPG and PNG images are allowed.");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Check if Cloudinary credentials are fully provided
  if (
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  ) {
    try {
      const cloudinary = await import("cloudinary");
      cloudinary.v2.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          { folder: "campusfix" },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error("Cloudinary upload failed"));
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                size: result.bytes,
              });
            }
          }
        );
        uploadStream.end(buffer);
      });
    } catch (cloudErr) {
      console.warn("Cloudinary upload failed, falling back to local disk storage:", cloudErr);
    }
  }

  // Local filesystem fallback in /public/uploads
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = file.type === "image/png" ? "png" : "jpg";
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const filePath = path.join(uploadDir, uniqueName);

  await fs.writeFile(filePath, buffer);

  return {
    url: `/uploads/${uniqueName}`,
    size: file.size,
  };
}
