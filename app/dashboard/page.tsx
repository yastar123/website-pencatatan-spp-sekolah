"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Users, UserCheck, DollarSign } from "lucide-react";

interface DashboardStats {
  totalBalance: number;
  studentsLunas: number;
  studentsMenunggak: number;
  chartData: { month: string; revenue: number }[];
  recentTransactions: Array<{
    id: string;
    studentName: string;
    studentNis: string;
    amount: number;
    status: string;
    date: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Gagal memuat dashboard</p>
      </div>
    );
  }

  const studentChartData = [
    { name: "Lunas", value: stats.studentsLunas, fill: "#10b981" },
    { name: "Menunggak", value: stats.studentsMenunggak, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Selamat datang, {user?.name}!{" "}
          {user?.role === "BENDAHARA"
            ? "Kelola keuangan sekolah Anda"
            : "Lihat status pembayaran Anda"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Saldo</p>
              <h3 className="text-2xl font-bold mt-2">
                {formatRupiah(stats.totalBalance)}
              </h3>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        {/* Students Paid */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Siswa Lunas</p>
              <h3 className="text-2xl font-bold mt-2 text-gray-900">
                {stats.studentsLunas}
              </h3>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Students Outstanding */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Siswa Menunggak
              </p>
              <h3 className="text-2xl font-bold mt-2 text-gray-900">
                {stats.studentsMenunggak}
              </h3>
            </div>
            <Users className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Siswa</p>
              <h3 className="text-2xl font-bold mt-2 text-gray-900">
                {stats.studentsLunas + stats.studentsMenunggak}
              </h3>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Pendapatan Bulanan
            </h2>
            <select className="px-3 py-1 text-sm border border-gray-300 rounded-lg">
              <option>Bulan</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                }}
                formatter={(value) => formatRupiah(value as number)}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Student Status Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Status Siswa
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={studentChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {studentChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Transaksi Terakhir
          </h2>
          <a
            href="/riwayat"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Lihat semua
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  Siswa
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  NIS
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  Jumlah
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  Tanggal
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-4 text-gray-900">{tx.studentName}</td>
                  <td className="py-3 px-4 text-gray-600">{tx.studentNis}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {formatRupiah(tx.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        tx.status === "BERHASIL"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {tx.status === "BERHASIL"
                        ? "Berhasil"
                        : tx.status === "MENUNGGAK"
                          ? "Nunggak"
                          : tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(tx.date).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
