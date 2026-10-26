import { authService } from "@/lib/modules/auth/auth.service";
import { AdminSidebar } from "@/components/modules/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await authService.requireAdmin();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111113]">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <AdminSidebar />
          <div className="flex-1 w-full min-w-0 bg-[#FFFFFF] border border-[#E5E0D5] rounded-2xl p-6 sm:p-8 shadow-2xs">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
