"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/lib/utils";
import { Download, FileDown } from "lucide-react";
import ExportLaporanModal from "@/components/modals/export-laporan-modal";
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

async function downloadLaporanExcel(
  reportData: ReportData,
  selectedYear: string,
) {
  const XLSX = await import("xlsx");

  const totalPendapatan = reportData.monthlyRevenue.reduce(
    (s, m) => s + m.amount,
    0,
  );

  // ── Sheet 1: Ringkasan ────────────────────────────────────────────────
  const ringkasanData = [
    ["LAPORAN REKAPITULASI PEMBAYARAN PMS"],
    [`Periode Tahun Ajaran: ${selectedYear}`],
    [],
    ["RINGKASAN STATISTIK"],
    ["Keterangan", "Jumlah"],
    ["Total Siswa Lunas", reportData.studentStats.lunas],
    ["Total Siswa Menunggak", reportData.studentStats.menunggak],
    ["Total Pendapatan (Rp)", totalPendapatan],
  ];

  // ── Sheet 2: Pendapatan Bulanan ───────────────────────────────────────
  const bulanData = [
    [`Pendapatan Bulanan - Tahun Ajaran ${selectedYear}`],
    [],
    ["Bulan", "Nominal Pendapatan (Rp)"],
    ...reportData.monthlyRevenue.map((r) => [r.month, r.amount]),
    [],
    ["TOTAL", totalPendapatan],
  ];

  // ── Sheet 3: Per Kelas ────────────────────────────────────────────────
  const kelasData = [
    [`Rekapitulasi Per Kelas - Tahun Ajaran ${selectedYear}`],
    [],
    ["Kelas", "Total Pendapatan (Rp)"],
    ...reportData.byClassData.map((r) => [r.className, r.total]),
  ];

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(ringkasanData),
    "Ringkasan",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(bulanData),
    "Pendapatan Bulanan",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(kelasData),
    "Per Kelas",
  );

  XLSX.writeFile(wb, `laporan-pms-${selectedYear.replace("/", "-")}.xlsx`);
}

async function downloadLaporanPDF(
  reportData: ReportData,
  selectedYear: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  // ── Header band ──────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LAPORAN REKAPITULASI PEMBAYARAN PMS", W / 2, 13, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode Tahun Ajaran: ${selectedYear}`, W / 2, 22, {
    align: "center",
  });

  y = 42;

  // ── Ringkasan Statistik ───────────────────────────────────────────────
  const totalPendapatan = reportData.monthlyRevenue.reduce(
    (s, m) => s + m.amount,
    0,
  );

  const drawStatBox = (
    x: number,
    label: string,
    value: string,
    r: number,
    g: number,
    b: number,
  ) => {
    doc.setFillColor(r, g, b);
    doc.setDrawColor(r - 20, g - 20, b - 20);
    doc.roundedRect(x, y, 58, 22, 3, 3, "FD");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 29, y + 8, { align: "center" });
    doc.setTextColor(r - 60, g - 60, b - 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + 29, y + 17, { align: "center" });
  };

  drawStatBox(
    14,
    "Total Siswa Lunas",
    String(reportData.studentStats.lunas),
    220,
    252,
    231,
  );
  drawStatBox(
    76,
    "Total Siswa Menunggak",
    String(reportData.studentStats.menunggak),
    254,
    226,
    226,
  );
  drawStatBox(
    138,
    "Total Pendapatan",
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(totalPendapatan),
    219,
    234,
    254,
  );

  y += 30;

  // ── Section helper ────────────────────────────────────────────────────
  const drawSectionTitle = (title: string) => {
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(209, 213, 219);
    doc.rect(14, y, W - 28, 8, "FD");
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(title, 18, y + 5.5);
    y += 11;
  };

  const drawTableHeader = (
    cols: { label: string; x: number; align?: "left" | "right" }[],
  ) => {
    doc.setFillColor(37, 99, 235);
    doc.rect(14, y, W - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    cols.forEach((col) => {
      doc.text(col.label, col.x, y + 5.5, { align: col.align ?? "left" });
    });
    y += 10;
  };

  const drawTableRow = (
    cols: {
      value: string;
      x: number;
      align?: "left" | "right";
      bold?: boolean;
    }[],
    shaded: boolean,
  ) => {
    if (shaded) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 3, W - 28, 8, "F");
    }
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(8.5);
    cols.forEach((col) => {
      doc.setFont("helvetica", col.bold ? "bold" : "normal");
      doc.text(col.value, col.x, y + 2, { align: col.align ?? "left" });
    });
    doc.setDrawColor(229, 231, 235);
    doc.line(14, y + 5, W - 14, y + 5);
    y += 8;
  };

  // ── Tabel Pendapatan Bulanan ──────────────────────────────────────────
  drawSectionTitle("PENDAPATAN BULANAN");
  drawTableHeader([
    { label: "Bulan", x: 18 },
    { label: "Nominal Pendapatan", x: W - 16, align: "right" },
  ]);

  reportData.monthlyRevenue.forEach((row, idx) => {
    drawTableRow(
      [
        { value: row.month, x: 18 },
        {
          value: new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(row.amount),
          x: W - 16,
          align: "right",
          bold: row.amount > 0,
        },
      ],
      idx % 2 === 0,
    );
  });

  // Total row
  doc.setFillColor(37, 99, 235);
  doc.rect(14, y - 3, W - 28, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 18, y + 3);
  doc.text(
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(totalPendapatan),
    W - 16,
    y + 3,
    { align: "right" },
  );
  y += 14;

  // ── Tabel Pendapatan per Kelas ────────────────────────────────────────
  drawSectionTitle("REKAPITULASI PER KELAS");
  drawTableHeader([
    { label: "Kelas", x: 18 },
    { label: "Total Pendapatan", x: W - 16, align: "right" },
  ]);

  reportData.byClassData.forEach((row, idx) => {
    drawTableRow(
      [
        { value: row.className, x: 18 },
        {
          value: new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
          }).format(row.total),
          x: W - 16,
          align: "right",
          bold: true,
        },
      ],
      idx % 2 === 0,
    );
  });

  y += 6;

  // ── Footer ────────────────────────────────────────────────────────────
  doc.setDrawColor(209, 213, 219);
  doc.line(14, y, W - 14, y);
  y += 6;
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Dicetak pada: ${new Date().toLocaleString("id-ID")}  |  Sistem Informasi Pembayaran Sekolah`,
    W / 2,
    y,
    { align: "center" },
  );

  doc.save(`laporan-pms-${selectedYear.replace("/", "-")}.pdf`);
}

export default function LaporanPage() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("");
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Load academic years, then set selectedYear to the active year (or first year)
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        const res = await fetch("/api/academic-years");
        const data = await res.json();
        const years: any[] = data.years || [];
        setAcademicYears(years);
        if (years.length > 0) {
          const active = data.activeYear ?? years[0];
          setSelectedYear(active.year);
        }
      } catch (error) {
        console.error("Failed to fetch academic years:", error);
      }
    };

    fetchAcademicYears();

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

  // Fetch report data only when a year is selected
  useEffect(() => {
    if (!selectedYear) return;

    const fetchReportData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ year: selectedYear });
        if (selectedMonth && selectedMonth !== "all") params.set("month", selectedMonth);
        if (selectedClass && selectedClass !== "all") params.set("classId", selectedClass);
        const res = await fetch(`/api/reports?${params.toString()}`);
        const data = await res.json();
        setReportData(data);
      } catch (error) {
        console.error("Failed to fetch report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [selectedYear, selectedMonth, selectedClass]);

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
        <p className="text-gray-600 mt-1">Analisis data pembayaran PMS</p>
      </div>

      {/* Export Laporan Detail — tombol utama */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">Export Laporan Detail</p>
          <p className="text-gray-500 text-sm mt-0.5">
            Export data siswa &amp; status pembayaran per bulan, per tahun, per
            kelas, atau per siswa
          </p>
        </div>
        <button
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm whitespace-nowrap shrink-0"
        >
          <FileDown size={16} />
          Export Laporan
        </button>
      </div>

      {/* Filters — ringkasan grafik */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">
          Ringkasan Grafik
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
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
        </div>
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
                {formatRupiah(
                  reportData.monthlyRevenue.reduce(
                    (sum, m) => sum + m.amount,
                    0,
                  ),
                )}
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

      {/* Export Laporan Modal */}
      {exportModalOpen && (
        <ExportLaporanModal
          onClose={() => setExportModalOpen(false)}
          academicYears={academicYears}
          classes={classes}
        />
      )}
    </div>
  );
}
