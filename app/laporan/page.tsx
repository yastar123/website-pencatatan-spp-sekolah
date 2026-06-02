"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Download, Download as FileDownloadIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ReportData {
  monthlyRevenue: { month: string; amount: number }[];
  byClassData: { className: string; total: number }[];
  studentStats: { lunas: number; menunggak: number };
}

export default function LaporanPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("2023/2024");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");

  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const res = await fetch("/api/academic-years");
        const data = await res.json();
        setAcademicYears(data.years || []);
      } catch (error) {
        console.error("Failed to fetch academic years:", error);
      }
    };

    fetchAcademicYears();
    // fetch classes for filter
    const fetchClasses = async () => {
      try {
        const res = await fetch("/api/classes");
        const data = await res.json();
        setClasses(data.classes || []);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports?year=${selectedYear}`);
        const data = await res.json();
        setReportData(data);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Laporan & Rekapitulasi
        </h1>
        <p className="text-gray-600 mt-1">Analisis data pembayaran SPP</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Periode
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            {academicYears.map((year) => (
              <option key={year.id} value={year.year}>
                {year.year}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bulan
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Semua Bulan</option>
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kelas
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download size={20} />
          Cetak PDF
        </button>
        <button
          onClick={async () => {
            try {
              const params = new URLSearchParams({ year: selectedYear });
              if (selectedMonth) params.set("month", selectedMonth);
              if (selectedClass && selectedClass !== "all")
                params.set("classId", selectedClass);
              const res = await fetch(
                `/api/reports/export?${params.toString()}`,
              );
              if (!res.ok) throw new Error("Export failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              const disp = res.headers.get("Content-Disposition") || "";
              let filename = "laporan.csv";
              const m = disp.match(/filename="?(.*?)"?$/);
              if (m) filename = m[1];
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error(error);
              alert("Gagal mengekspor laporan");
            }
          }}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <FileDownloadIcon size={20} />
          Export CSV
        </button>
      </div>

      {reportData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">
                Total Siswa Lunas
              </p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {reportData.studentStats.lunas}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">
                Total Siswa Menunggak
              </p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {reportData.studentStats.menunggak}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm font-medium">
                Total Pendapatan
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                Rp{" "}
                {reportData.monthlyRevenue.reduce(
                  (sum, m) => sum + m.amount,
                  0,
                ) / 1000000}
                M
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Tren Pendapatan Tahunan
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    formatter={(value) =>
                      `Rp ${((value as number) / 1000000).toFixed(1)}M`
                    }
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By Class Chart */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Pendapatan per Kelas
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.byClassData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="className" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    formatter={(value) =>
                      `Rp ${((value as number) / 1000000).toFixed(1)}M`
                    }
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Table */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Rekapitulasi per Kelas
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                      Kelas
                    </th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">
                      Total Pendapatan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.byClassData.map((item) => (
                    <tr
                      key={item.className}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 px-4 text-gray-900">
                        {item.className}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">
                        Rp {item.total.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
