import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
