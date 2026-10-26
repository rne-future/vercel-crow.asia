import { z } from "zod";
import { resourceIdSchema } from "@/lib/modules/books/books.schema";
import { localeCodeSchema } from "@/lib/modules/i18n/i18n.schema";

export const toggleSchema = z.object({
  book_id: resourceIdSchema, chapter_slug: resourceIdSchema,
  item_id: z.string().regex(/^[0-9a-f]{8,16}$/), is_completed: z.boolean(),
}).strict();
export const searchSchema = z.object({
  q: z.string().trim().max(200).default(""), locale: localeCodeSchema.default("id"),
  register: z.enum(["casual", "standard"]).optional(), reg: z.enum(["casual", "standard"]).optional(),
}).strict();
export const chapterTranslationSchema = z.object({
  id: z.coerce.number().int().positive(), title: z.string().trim().min(1).max(255),
  rawMarkdown: z.string().min(1).max(500000), status: z.enum(["DRAFT", "REVIEW", "PUBLISHED"]),
  updatedAt: z.coerce.date(),
}).strict();
