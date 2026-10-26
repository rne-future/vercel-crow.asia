import { cookies } from "next/headers";
import { i18nService } from "./i18n.service";

export async function getRequestTranslations(requested?: string) {
  const preference = requested ?? (await cookies()).get("crow:locale")?.value;
  return i18nService.getPageTranslations(preference);
}
