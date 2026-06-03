"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  {
    icon: ArrowLeftRight,
    label: "Input Pembayaran",
    href: "/input-pembayaran",
    adminOnly: true,
  },
  { icon: Users, label: "Data Siswa", href: "/data-siswa" },
  { icon: FileText, label: "Riwayat", href: "/riwayat" },
  { icon: BarChart3, label: "Laporan", href: "/laporan" },
  // Baru: Cek Tagihan (tampilkan data di UI)
  { icon: FileText, label: "Cek Tagihan", href: "/laporan/detail" },
  {
    icon: FileText,
    label: "Set Nominal SPP",
    href: "/pengaturan/spp",
    adminOnly: true,
  },
  { icon: Settings, label: "Pengaturan", href: "/pengaturan", adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Untuk peran SISWA, sembunyikan beberapa menu yang tidak perlu
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && user?.role !== "BENDAHARA") return false;
    if (user?.role === "SISWA") {
      // Hide dashboard, data-siswa, riwayat, laporan for students
      const hideForSiswa = [
        "/dashboard",
        "/data-siswa",
        "/riwayat",
        "/laporan",
      ];
      if (hideForSiswa.includes(item.href)) return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-blue-600 text-white p-2 rounded-lg"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 lg:translate-x-0 z-40 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 font-bold text-xl text-gray-900"
          >
            <span className="hidden sm:inline">Schoboard</span>
          </Link>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  active
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
