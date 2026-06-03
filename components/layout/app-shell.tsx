"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// Halaman yang tidak memerlukan sidebar & topbar
const AUTH_ROUTES = ["/login", "/"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  if (isAuthPage) {
    // Halaman login / root: render langsung tanpa shell
    return <>{children}</>;
  }

  // Halaman app: render dengan sidebar & topbar
  return (
    <>
      <Sidebar />
      <Topbar />
      <div className="min-h-screen bg-gray-50">
        <main className="pt-16 lg:pl-64">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl">{children}</div>
        </main>
      </div>
    </>
  );
}
