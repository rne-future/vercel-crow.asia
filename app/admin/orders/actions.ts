"use server";
import { authService } from "@/lib/modules/auth/auth.service";
import { revalidatePath } from "next/cache";
import { ordersService } from "@/lib/modules/orders/orders.service";

export async function markPaid(orderId: string) {
  await authService.requireAdmin();
  await ordersService.markPaidForAdmin(orderId);
  revalidatePath("/admin/orders");
  revalidatePath("/dashboard");
  revalidatePath("/read", "layout");
}
