"use server";
import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { readerService } from "@/lib/modules/reader/reader.service";

export async function saveChapterTranslation(form: FormData) {
  await authService.requireAdmin();
  await readerService.saveChapterTranslation({ id: form.get("id"), title: form.get("title"), rawMarkdown: form.get("raw_markdown"), status: form.get("status"), updatedAt: form.get("updated_at") });
  revalidatePath("/admin/translations");
  revalidatePath("/read", "layout");
}
