import { notFound, redirect } from "next/navigation";
import { ordersService } from "@/lib/modules/orders/orders.service";
import { isMockMode } from "@/lib/integrations/mayar";

export default async function MockPayPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  if (!isMockMode()) notFound();
  const { orderNumber } = await params;

  async function confirmAction() {
    "use server";
    if (!isMockMode()) notFound();
    await ordersService.confirmMockPayment(orderNumber);
    redirect("/dashboard");
  }

  return (
    <main style={{ maxWidth: 480, margin: "64px auto", padding: 16 }}>
      <h1>Simulasi Pembayaran (dev only)</h1>
      <p>Order: {orderNumber}</p>
      <form action={confirmAction}>
        <button type="submit" style={{ padding: 12, fontWeight: 700 }}>
          Tandai Lunas & Masuk Dashboard
        </button>
      </form>
    </main>
  );
}
