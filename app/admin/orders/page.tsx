import Link from "next/link";
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
  const currentStatus = sp.status?.toUpperCase();
  const filtered = await ordersService.listForAdmin(sp.status);

  const FILTERS = [
    { label: "Semua", value: undefined },
    { label: "PENDING", value: "PENDING" },
    { label: "PAID", value: "PAID" },
    { label: "EXPIRED", value: "EXPIRED" },
  ];

  return (
    <main className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E0D5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111113]">Orders & Transaksi</h1>
          <p className="text-xs text-stone-500 mt-1">
            Daftar pesanan pembeli, status verifikasi Mayar, dan sinkronisasi hak akses.
          </p>
        </div>
        <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D5] text-stone-700 self-start sm:self-auto">
          {filtered.length} transaksi
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Filter status pesanan">
        <span className="text-xs font-mono font-semibold text-stone-400 mr-2 shrink-0">Filter:</span>
        {FILTERS.map((f) => {
          const isActive = (!currentStatus && !f.value) || currentStatus === f.value;
          const href = f.value ? `/admin/orders?status=${f.value}` : "/admin/orders";

          return (
            <Link
              key={f.label}
              href={href}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors shrink-0 ${
                isActive
                  ? "bg-[#111113] text-[#FAF8F5] shadow-2xs"
                  : "bg-[#FAF8F5] text-stone-600 hover:text-[#111113] border border-[#E5E0D5]"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E0D5]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b border-[#E5E0D5] text-stone-600 font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 font-bold">No. Order</th>
              <th className="py-3 px-4 font-bold">Email</th>
              <th className="py-3 px-4 font-bold">Paket</th>
              <th className="py-3 px-4 font-bold">Total</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold">Waktu Bayar</th>
              <th className="py-3 px-4 font-bold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D5]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-500 font-mono">
                  Belum ada pesanan {currentStatus ? `dengan status ${currentStatus}` : ""}.
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const isPaid = o.paymentStatus === "PAID";
                const isPending = o.paymentStatus === "PENDING";

                return (
                  <tr key={o.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#111113]">{o.orderNumber}</td>
                    <td className="py-3 px-4 text-stone-700">{o.customerEmail}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px]">
                        {o.pricingTierId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#111113]">
                      Rp {o.amountIdr.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isPending
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-500">
                      {o.paidAt ? new Date(o.paidAt).toLocaleString("id-ID") : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isPaid && (
                        <form action={markPaid.bind(null, o.id)} className="inline-block">
                          <ConfirmSubmit
                            message="Tandai PAID dan sinkronkan hak akses user sekarang?"
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            Force Approve
                          </ConfirmSubmit>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
