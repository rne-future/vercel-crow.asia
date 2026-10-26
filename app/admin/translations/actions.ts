"use server";
import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { i18nService } from "@/lib/modules/i18n/i18n.service";
import type { MutationState } from "@/components/modules/admin/AdminMutationForm";

export async function saveTranslation(_previous: MutationState, form: FormData): Promise<MutationState> {
  await authService.requireAdmin();
  try {
    await i18nService.upsertTranslation({ localeCode: form.get("localeCode"), key: form.get("key"), group: form.get("group"), value: form.get("value"), valueType: form.get("valueType") });
    revalidatePath("/", "layout");
    return { success: "Terjemahan tersimpan dan cache diperbarui." };
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues.map((issue) => issue.message).join("; ") };
    return { error: "Terjemahan gagal disimpan. Periksa bahasa dan konflik key (induk/anak)." };
  }
}

export async function deleteTranslation(_previous: MutationState, form: FormData): Promise<MutationState> {
  await authService.requireAdmin();
  try {
    await i18nService.deleteTranslation({ localeCode: form.get("localeCode"), key: form.get("key") });
    revalidatePath("/", "layout");
    return { success: "Terjemahan dihapus. Nilai fallback akan digunakan." };
  } catch {
    return { error: "Terjemahan gagal dihapus." };
  }
}
