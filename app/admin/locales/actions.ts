"use server";
import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { i18nService } from "@/lib/modules/i18n/i18n.service";
import type { MutationState } from "@/components/modules/admin/AdminMutationForm";

export async function saveLocale(_previous: MutationState, form: FormData): Promise<MutationState> {
  await authService.requireAdmin();
  try {
    await i18nService.saveLocale({ code: form.get("code"), label: form.get("label"), name: form.get("name"),
      flagEmoji: form.get("flagEmoji"), hasDualRegister: form.get("hasDualRegister") === "on",
      isActive: form.get("isActive") === "on", isDefault: form.get("isDefault") === "on" });
    revalidatePath("/", "layout");
    return { success: "Bahasa tersimpan." };
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues.map((issue) => issue.message).join("; ") };
    return { error: "Bahasa gagal disimpan. Bahasa default harus tetap aktif; pilih default baru sebelum menonaktifkannya." };
  }
}

export async function setLocaleActive(_previous: MutationState, form: FormData): Promise<MutationState> {
  await authService.requireAdmin();
  try {
    await i18nService.setLocaleActive({ code: form.get("code"), isActive: form.get("isActive") === "true" });
    revalidatePath("/", "layout");
    return { success: "Status bahasa diperbarui." };
  } catch {
    return { error: "Status gagal diperbarui. Bahasa default harus tetap aktif." };
  }
}
