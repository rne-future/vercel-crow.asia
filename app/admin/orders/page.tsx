import { authService } from "@/lib/modules/auth/auth.service";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { ordersService } from "@/lib/modules/orders/orders.service";
import { markPaid } from "./actions";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  await authService.requireAdmin();
  const sp = (await searchParams) ?? {};
  const filtered = await ordersService.listForAdmin(sp.status);

  return (
    <main>
      <h1>Orders</h1>
      <p>
        Filter: <a href="/admin/orders">semua</a> · <a href="/admin/orders?status=PENDING">PENDING</a> ·{" "}
        <a href="/admin/orders?status=PAID">PAID</a> · <a href="/admin/orders?status=EXPIRED">EXPIRED</a>
      </p>
      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>No. Order</th>
            <th>Email</th>
            <th>Paket</th>
            <th>Total</th>
            <th>Status</th>
            <th>Bayar</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id}>
              <td>{o.orderNumber}</td>
              <td>{o.customerEmail}</td>
              <td>{o.pricingTierId}</td>
              <td>Rp {o.amountIdr.toLocaleString("id-ID")}</td>
              <td>{o.paymentStatus}</td>
              <td>{o.paidAt ? new Date(o.paidAt).toLocaleString("id-ID") : "-"}</td>
              <td>
                {o.paymentStatus !== "PAID" && (
                  <form action={markPaid.bind(null, o.id)}>
                    <ConfirmSubmit message="Tandai PAID + sync entitlements?">
                      Force Approve
                    </ConfirmSubmit>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
