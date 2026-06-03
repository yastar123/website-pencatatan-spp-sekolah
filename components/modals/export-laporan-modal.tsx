"use client";

import { useEffect, useState } from "react";
import {
  X,
  Download,
  Loader2,
  Search,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

interface AcademicYear {
  id: string;
  year: string;
}
interface ClassItem {
  id: string;
  name: string;
  academicYearId: string;
}
interface StudentItem {
  id: string;
  nis: string;
  name: string;
  class?: { name: string } | null;
}

const EXPORT_TYPES = [
  { value: "bulan-semua", label: "Per Bulan — Semua Kelas" },
  { value: "bulan-kelas", label: "Per Bulan — Kelas Tertentu" },
  { value: "bulan-siswa", label: "Per Bulan — Siswa Tertentu" },
  { value: "tahun-semua", label: "Per Tahun — Semua Kelas" },
  { value: "tahun-kelas", label: "Per Tahun — Kelas Tertentu" },
  { value: "tahun-siswa", label: "Per Tahun — Siswa Tertentu" },
  { value: "siswa-pendidikan", label: "Siswa Selama Pendidikan" },
] as const;
type ExportType = (typeof EXPORT_TYPES)[number]["value"];

const MONTHS_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const slbl = (s: string) =>
  s === "BERHASIL" ? "Lunas" : s === "MENUNGGAK" ? "Nunggak" : s;

interface Props {
  onClose: () => void;
  academicYears: AcademicYear[];
  classes: ClassItem[];
}

export default function ExportLaporanModal({
  onClose,
  academicYears,
  classes,
}: Props) {
  const [type, setType] = useState<ExportType>("bulan-semua");
  const [academicYearId, setAcademicYearId] = useState(
    academicYears[0]?.id ?? "",
  );
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [classId, setClassId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(
    null,
  );
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingXls, setLoadingXls] = useState(false);
  const [error, setError] = useState("");

  const isPerbulan = type.startsWith("bulan");
  const isPertahun = type.startsWith("tahun");
  const needsClass = type === "bulan-kelas" || type === "tahun-kelas";
  const needsStudent =
    type === "bulan-siswa" ||
    type === "tahun-siswa" ||
    type === "siswa-pendidikan";
  const filteredClasses = isPertahun
    ? classes.filter((c) => c.academicYearId === academicYearId)
    : classes;

  useEffect(() => {
    if (!needsStudent || studentSearch.length < 2) {
      setStudentResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/students?search=${encodeURIComponent(studentSearch)}`,
        );
        const data = await res.json();
        setStudentResults(data.students ?? []);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch, needsStudent]);

  const buildParams = () => {
    const p = new URLSearchParams({ type });
    if (isPerbulan) {
      p.set("calYear", String(calYear));
      p.set("month", String(month));
    }
    if (isPertahun && academicYearId) p.set("academicYearId", academicYearId);
    if (needsClass && classId) p.set("classId", classId);
    if (needsStudent && selectedStudent) p.set("studentId", selectedStudent.id);
    return p;
  };

  const validate = () => {
    if (needsClass && !classId) return "Pilih kelas terlebih dahulu.";
    if (needsStudent && !selectedStudent) return "Pilih siswa terlebih dahulu.";
    return "";
  };

  // ── shared metadata ─────────────────────────────────────────────────────────
  const buildMeta = () => {
    const typeLabel = EXPORT_TYPES.find((t) => t.value === type)?.label ?? type;
    const monthLabel = isPerbulan ? `${MONTHS_FULL[month - 1]} ${calYear}` : "";
    const yearLabel = isPertahun
      ? (academicYears.find((y) => y.id === academicYearId)?.year ?? "")
      : "";
    const classLabel = needsClass
      ? (classes.find((c) => c.id === classId)?.name ?? "")
      : "";
    const studentLabel = selectedStudent
      ? `${selectedStudent.name} (${selectedStudent.nis})`
      : "";
    let title = typeLabel;
    if (monthLabel) title += ` — ${monthLabel}`;
    if (yearLabel) title += ` — TA ${yearLabel}`;
    if (classLabel) title += ` — Kelas ${classLabel}`;
    if (studentLabel) title += ` — ${studentLabel}`;
    return {
      title,
      safeFilename: title.replace(/[/\\:*?"<>|—]/g, "-"),
      monthLabel,
    };
  };

  const fetchRows = async () => {
    const res = await fetch(`/api/reports/detail?${buildParams()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Gagal mengambil data");
    return data.rows ?? [];
  };

  // ── EXPORT EXCEL ─────────────────────────────────────────────────────────────
  const handleExcel = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoadingXls(true);
    try {
      const apiRows = await fetchRows();
      const XLSX = await import("xlsx");
      const { title, safeFilename, monthLabel } = buildMeta();
      const withKelas = !needsClass && !needsStudent;
      const fmtDate = (d: string) => new Date(d).toLocaleDateString("id-ID");
      const wb = XLSX.utils.book_new();
      const d: any[][] = [];
      d.push([title]);
      d.push([`Dicetak: ${new Date().toLocaleString("id-ID")}`]);
      d.push([]);

      if (needsStudent) {
        // Format A: transaksi siswa
        const s = apiRows[0];
        if (s) {
          d.push(["Data Siswa"]);
          d.push(["Nama", s.name]);
          d.push(["NIS", s.nis]);
          d.push(["NISN", s.nisn]);
          d.push(["Kelas", s.className]);
          d.push([]);
        }
        d.push([
          "No",
          "Tanggal",
          "No. Transaksi",
          "Jenis Pembayaran",
          "Nominal (Rp)",
          "Metode",
          "Status",
        ]);
        (s?.payments ?? []).forEach((p: any, i: number) =>
          d.push([
            i + 1,
            fmtDate(p.createdAt),
            p.transactionNo,
            p.paymentType,
            p.amount,
            p.paymentMethod,
            slbl(p.status),
          ]),
        );
        if (!s?.payments?.length)
          d.push(["-", "-", "-", "-", 0, "-", "Nunggak"]);
        d.push([]);
        d.push(["", "", "", "TOTAL BAYAR", s?.totalBayar ?? 0, "", ""]);
      } else if (isPertahun) {
        // Format B: grid bulan
        const hdr = ["No", "NIS", "NISN", "Nama Siswa"];
        if (withKelas) hdr.push("Kelas");
        hdr.push(...MONTHS_SHORT, "Total (Rp)", "Status");
        d.push(hdr);
        let grand = 0;
        apiRows.forEach((r: any, i: number) => {
          const mon = Array(12).fill(0);
          r.payments
            .filter((p: any) => p.status === "BERHASIL")
            .forEach((p: any) => {
              mon[new Date(p.createdAt).getMonth()] += p.amount;
            });
          const row: any[] = [i + 1, r.nis, r.nisn, r.name];
          if (withKelas) row.push(r.className);
          row.push(...mon, r.totalBayar, r.statusLabel);
          d.push(row);
          grand += r.totalBayar;
        });
        d.push([]);
        const lunas = apiRows.filter((r: any) => r.hasPaid).length;
        d.push(["Ringkasan"]);
        d.push(["Total Siswa", apiRows.length]);
        d.push(["Sudah Bayar", lunas]);
        d.push(["Belum Bayar", apiRows.length - lunas]);
        d.push(["Total Pemasukan", grand]);
      } else {
        // Format C: perbulan
        const hdr = ["No", "NIS", "NISN", "Nama Siswa"];
        if (withKelas) hdr.push("Kelas");
        hdr.push(
          "Status Pembayaran",
          `Nominal ${monthLabel} (Rp)`,
          "Jenis Pembayaran",
          "Tanggal Bayar",
        );
        d.push(hdr);
        let grand = 0;
        apiRows.forEach((r: any, i: number) => {
          const berhasil = r.payments.filter(
            (p: any) => p.status === "BERHASIL",
          );
          const jenis =
            [...new Set(berhasil.map((p: any) => p.paymentType))].join(", ") ||
            "-";
          const tgl =
            berhasil.length > 0 ? fmtDate(berhasil[0].createdAt) : "-";
          const row: any[] = [i + 1, r.nis, r.nisn, r.name];
          if (withKelas) row.push(r.className);
          row.push(r.statusLabel, r.totalBayar, jenis, tgl);
          d.push(row);
          grand += r.totalBayar;
        });
        d.push([]);
        const lunas = apiRows.filter((r: any) => r.hasPaid).length;
        d.push(["Ringkasan"]);
        d.push(["Total Siswa", apiRows.length]);
        d.push(["Sudah Bayar", lunas]);
        d.push(["Belum Bayar", apiRows.length - lunas]);
        d.push(["Total Pemasukan", grand]);
      }

      const ws = XLSX.utils.aoa_to_sheet(d);
      const cw = d.reduce((acc: number[], row) => {
        row.forEach((c, i) => {
          acc[i] = Math.max(acc[i] ?? 6, String(c ?? "").length + 2);
        });
        return acc;
      }, []);
      ws["!cols"] = cw.map((w) => ({ wch: Math.min(w, 45) }));
      XLSX.utils.book_append_sheet(wb, ws, "Laporan");
      XLSX.writeFile(wb, `${safeFilename}.xlsx`);
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan");
    } finally {
      setLoadingXls(false);
    }
  };

  // ── EXPORT PDF ───────────────────────────────────────────────────────────────
  const handlePDF = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setLoadingPdf(true);
    try {
      const apiRows = await fetchRows();
      const { default: jsPDF } = await import("jspdf");
      const { title, safeFilename } = buildMeta();
      const landscape = isPertahun;
      const doc = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: landscape ? "landscape" : "portrait",
      });
      const W = doc.internal.pageSize.getWidth();
      const withKelas = !needsClass && !needsStudent;
      const fmtDate = (d: string) => new Date(d).toLocaleDateString("id-ID");
      const fmtRp = (n: number) => n.toLocaleString("id-ID");
      let y = 0;

      // Header band
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, W, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, W / 2, 11, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, W / 2, 19, {
        align: "center",
      });
      y = 32;

      const rowH = 7;
      const x0 = 10;
      type Col = { label: string; w: number };
      type Cell = { text: string; w: number };

      const drawHeader = (cols: Col[]) => {
        doc.setFillColor(37, 99, 235);
        let cx = x0;
        cols.forEach((c) => {
          doc.rect(cx, y, c.w, rowH, "F");
          cx += c.w;
        });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        cx = x0;
        cols.forEach((c) => {
          doc.text(c.label, cx + c.w / 2, y + 4.5, { align: "center" });
          cx += c.w;
        });
        y += rowH;
      };
      const drawRow = (cells: Cell[], shade: boolean) => {
        const tw = cells.reduce((s, c) => s + c.w, 0);
        if (shade) {
          doc.setFillColor(249, 250, 251);
          doc.rect(x0, y, tw, rowH, "F");
        }
        doc.setDrawColor(229, 231, 235);
        doc.line(x0, y + rowH, x0 + tw, y + rowH);
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        let cx = x0;
        cells.forEach((c) => {
          doc.text(String(c.text ?? ""), cx + 1.5, y + 4.5);
          cx += c.w;
        });
        y += rowH;
      };

      if (needsStudent) {
        // FORMAT A
        const s = apiRows[0];
        if (s) {
          doc.setTextColor(55, 65, 81);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text("Data Siswa", x0, y);
          y += 5;
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          [
            ["Nama", s.name],
            ["NIS", s.nis],
            ["NISN", s.nisn],
            ["Kelas", s.className],
          ].forEach(([k, v]) => {
            doc.setTextColor(107, 114, 128);
            doc.text(k, x0, y);
            doc.setTextColor(17, 24, 39);
            doc.text(String(v), x0 + 18, y);
            y += 5;
          });
          y += 3;
        }
        const tW = W - 20;
        const cols: Col[] = [
          { label: "No", w: 8 },
          { label: "Tanggal", w: 22 },
          { label: "No. Transaksi", w: 48 },
          { label: "Jenis", w: 20 },
          { label: "Nominal (Rp)", w: 28 },
          { label: "Metode", w: 20 },
          { label: "Status", w: tW - 146 },
        ];
        drawHeader(cols);
        (s?.payments ?? []).forEach((p: any, i: number) => {
          drawRow(
            [
              { text: String(i + 1), w: 8 },
              { text: fmtDate(p.createdAt), w: 22 },
              { text: p.transactionNo, w: 48 },
              { text: p.paymentType, w: 20 },
              { text: fmtRp(p.amount), w: 28 },
              { text: p.paymentMethod, w: 20 },
              { text: slbl(p.status), w: cols[6].w },
            ],
            i % 2 === 0,
          );
        });
        if (!s?.payments?.length)
          drawRow(
            [
              { text: "-", w: 8 },
              { text: "-", w: 22 },
              { text: "-", w: 48 },
              { text: "-", w: 20 },
              { text: "0", w: 28 },
              { text: "-", w: 20 },
              { text: "Nunggak", w: cols[6].w },
            ],
            false,
          );
        y += 3;
        doc.setFillColor(37, 99, 235);
        doc.rect(x0, y, W - 20, rowH, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL BAYAR", x0 + 2, y + 4.5);
        doc.text(`Rp ${fmtRp(s?.totalBayar ?? 0)}`, W - 12, y + 4.5, {
          align: "right",
        });
      } else if (isPertahun) {
        // FORMAT B: landscape, 12 month columns
        const baseW = withKelas ? [8, 18, 16, 38, 16] : [8, 18, 16, 44];
        const baseSum = baseW.reduce((a, b) => a + b, 0);
        const monW = Math.max(9, Math.floor((W - 20 - baseSum - 20) / 12));
        const cols: Col[] = withKelas
          ? [
              { label: "No", w: 8 },
              { label: "NIS", w: 18 },
              { label: "NISN", w: 16 },
              { label: "Nama Siswa", w: 38 },
              { label: "Kelas", w: 16 },
            ]
          : [
              { label: "No", w: 8 },
              { label: "NIS", w: 18 },
              { label: "NISN", w: 16 },
              { label: "Nama Siswa", w: 44 },
            ];
        MONTHS_SHORT.forEach((m) => cols.push({ label: m, w: monW }));
        cols.push({ label: "Total", w: 22 }, { label: "Status", w: 14 });
        drawHeader(cols);
        let grand = 0;
        apiRows.forEach((r: any, i: number) => {
          const mon = Array(12).fill(0);
          r.payments
            .filter((p: any) => p.status === "BERHASIL")
            .forEach((p: any) => {
              mon[new Date(p.createdAt).getMonth()] += p.amount;
            });
          const cells: Cell[] = withKelas
            ? [
                { text: String(i + 1), w: 8 },
                { text: r.nis, w: 18 },
                { text: r.nisn, w: 16 },
                { text: r.name, w: 38 },
                { text: r.className, w: 16 },
              ]
            : [
                { text: String(i + 1), w: 8 },
                { text: r.nis, w: 18 },
                { text: r.nisn, w: 16 },
                { text: r.name, w: 44 },
              ];
          mon.forEach((v, mi) =>
            cells.push({ text: v > 0 ? fmtRp(v) : "-", w: monW }),
          );
          cells.push(
            { text: fmtRp(r.totalBayar), w: 22 },
            { text: r.statusLabel, w: 14 },
          );
          drawRow(cells, i % 2 === 0);
          grand += r.totalBayar;
        });
        y += 4;
        const lunas = apiRows.filter((r: any) => r.hasPaid).length;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(55, 65, 81);
        doc.text(
          `Total Siswa: ${apiRows.length}  |  Sudah Bayar: ${lunas}  |  Belum Bayar: ${apiRows.length - lunas}  |  Total Pemasukan: Rp ${fmtRp(grand)}`,
          x0,
          y,
        );
      } else {
        // FORMAT C: portrait, per bulan
        const cols: Col[] = withKelas
          ? [
              { label: "No", w: 8 },
              { label: "NIS", w: 22 },
              { label: "NISN", w: 22 },
              { label: "Nama Siswa", w: 55 },
              { label: "Kelas", w: 18 },
              { label: "Status", w: 16 },
              { label: "Nominal (Rp)", w: 28 },
              { label: "Jenis", w: W - 189 },
            ]
          : [
              { label: "No", w: 8 },
              { label: "NIS", w: 22 },
              { label: "NISN", w: 22 },
              { label: "Nama Siswa", w: 65 },
              { label: "Status", w: 18 },
              { label: "Nominal (Rp)", w: 28 },
              { label: "Jenis", w: W - 203 },
            ];
        drawHeader(cols);
        let grand = 0;
        apiRows.forEach((r: any, i: number) => {
          const berhasil = r.payments.filter(
            (p: any) => p.status === "BERHASIL",
          );
          const jenis =
            [...new Set(berhasil.map((p: any) => p.paymentType))].join(", ") ||
            "-";
          const cells: Cell[] = withKelas
            ? [
                { text: String(i + 1), w: 8 },
                { text: r.nis, w: 22 },
                { text: r.nisn, w: 22 },
                { text: r.name, w: 55 },
                { text: r.className, w: 18 },
                { text: r.statusLabel, w: 16 },
                { text: fmtRp(r.totalBayar), w: 28 },
                { text: jenis, w: cols[7].w },
              ]
            : [
                { text: String(i + 1), w: 8 },
                { text: r.nis, w: 22 },
                { text: r.nisn, w: 22 },
                { text: r.name, w: 65 },
                { text: r.statusLabel, w: 18 },
                { text: fmtRp(r.totalBayar), w: 28 },
                { text: jenis, w: cols[6].w },
              ];
          drawRow(cells, i % 2 === 0);
          grand += r.totalBayar;
        });
        y += 4;
        const lunas = apiRows.filter((r: any) => r.hasPaid).length;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(55, 65, 81);
        doc.text(
          `Total Siswa: ${apiRows.length}  |  Sudah Bayar: ${lunas}  |  Belum Bayar: ${apiRows.length - lunas}  |  Total Pemasukan: Rp ${fmtRp(grand)}`,
          x0,
          y,
        );
      }

      doc.save(`${safeFilename}.pdf`);
    } catch (e: any) {
      setError(e.message ?? "Terjadi kesalahan");
    } finally {
      setLoadingPdf(false);
    }
  };

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Export Laporan Detail
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Jenis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Laporan <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as ExportType);
                setClassId("");
                setSelectedStudent(null);
                setStudentSearch("");
                setError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              {EXPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Perbulan: tahun + bulan */}
          {isPerbulan && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tahun
                </label>
                <input
                  type="number"
                  value={calYear}
                  onChange={(e) => setCalYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min={2000}
                  max={2100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bulan
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                >
                  {MONTHS_FULL.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Pertahun: tahun ajaran */}
          {isPertahun && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahun Ajaran <span className="text-red-500">*</span>
              </label>
              <select
                value={academicYearId}
                onChange={(e) => {
                  setAcademicYearId(e.target.value);
                  setClassId("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="">Pilih Tahun Ajaran</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kelas */}
          {needsClass && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kelas <span className="text-red-500">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="">Pilih Kelas</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Siswa */}
          {needsStudent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Siswa <span className="text-red-500">*</span>
              </label>
              {selectedStudent ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedStudent.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      NIS: {selectedStudent.nis} |{" "}
                      {selectedStudent.class?.name ?? "-"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setStudentSearch("");
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Ganti
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search
                    className="absolute left-3 top-2.5 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Cari nama / NIS..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  {studentResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {studentResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentSearch("");
                            setStudentResults([]);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {s.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            NIS: {s.nis} | {s.class?.name ?? "-"}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer — dua tombol */}
        <div className="px-6 py-4 border-t border-gray-200 shrink-0 space-y-2">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
            >
              Batal
            </button>
            <button
              onClick={handlePDF}
              disabled={loadingPdf || loadingXls}
              style={{
                backgroundColor:
                  loadingPdf || loadingXls ? "#fca5a5" : "#dc2626",
                color: "#fff",
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 text-sm font-medium"
            >
              {loadingPdf ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <FileText size={15} />
                  Export PDF
                </>
              )}
            </button>
            <button
              onClick={handleExcel}
              disabled={loadingPdf || loadingXls}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {loadingXls ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={15} />
                  Export Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
