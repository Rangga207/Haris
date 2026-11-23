import { z } from "zod";
import { Channel, Priority, Role } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createTicketSchema = z.object({
  buildingId: z.string().uuid("Invalid building selection"),
  roomId: z.string().uuid("Invalid room selection"),
  categoryId: z.string().uuid("Invalid category selection"),
  description: z
    .string()
    .min(5, "Please provide a detailed description (at least 5 characters)"),
  isSafetyHazard: z.boolean().default(false),
  channel: z.nativeEnum(Channel).default(Channel.WEB),
  // Optional admin-on-behalf fields
  reporterId: z.string().uuid().optional(),
  reporterName: z.string().min(2).optional(),
  reporterPhone: z.string().min(6).optional(),
});

export const updatePrioritySchema = z.object({
  priority: z.nativeEnum(Priority),
  reason: z.string().optional(),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid("Invalid technician ID"),
  targetDate: z.string().datetime("Target date must be a valid ISO date string"),
  note: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.string(),
  note: z.string().optional(),
  reason: z.string().optional(),
});

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return { code, message, details };
}
