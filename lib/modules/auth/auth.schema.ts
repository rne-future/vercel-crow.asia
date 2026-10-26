import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(1024),
}).strict();
export const updateRoleSchema = z.object({ email: emailSchema, role: z.enum(["reader", "editor", "admin"]) }).strict();
