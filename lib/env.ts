import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  APP_VERSION: z.string().default("1.0.0"),
  EMERGENCY_PHONE: z.string().default("+62 21 555-0911"),
  NEXT_PUBLIC_EMERGENCY_PHONE: z.string().default("+62 21 555-0911"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error(
      `Invalid environment configuration: ${result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
    );
  }
  return result.data;
}

export const env = validateEnv();
