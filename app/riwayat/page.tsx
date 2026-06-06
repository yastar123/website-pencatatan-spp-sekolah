"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/lib/utils";
import { Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import PaymentDetailModal from "@/components/modals/payment-detail-modal";
import PaymentEditModal from "@/components/modals/payment-edit-modal";

interface Payment {
  id: string;
  transactionNo: string;
  student: { name: string; nis: string; class?: { name: string } };
  paymentType: string;
  amount: number;
  paymentMethod: string;
  status: string;
  proofUrl?: string;
  createdAt: string;
  notes?: string;
  batch?: { month: number; year: number } | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case "BERHASIL":
      return "bg-green-100 text-green-800";
    case "MENUNGGAK":
      return "bg-red-100 text-red-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "BERHASIL":
      return "Berhasil";
    case "MENUNGGAK":
      return "Nunggak";
    default:
      return status;
  }
}

// ── PDF generator ─────────────────────────────────────────────────────────────
async function downloadPDF(payment: Payment) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a5" });

  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  // Helper: convert image URL to data URL
  const toDataUrl = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to load image:", url, e);
      return null;
    }
  };

  // Load kop surat images from public folder
  const [leftImg, rightImg] = await Promise.all([
    toDataUrl("/kopsurat-1.png"),
    toDataUrl("/kopsurat-2.png"),
  ]);

  // ── Letterhead (kop surat) ───────────────────────────────────────────
  const logoW = 16; // mm (slightly larger logos)
  const logoH = 16; // mm
  const logoTop = 6;
  if (leftImg) {
    try {
      doc.addImage(leftImg, "PNG", 6, logoTop, logoW, logoH);
    } catch (e) {
      // ignore image errors
    }
  }
  if (rightImg) {
    try {
      doc.addImage(rightImg, "PNG", W - 6 - logoW, logoTop, logoW, logoH);
    } catch (e) {}
  }

  // Centered organization text with wrapping
  doc.setTextColor(0, 0, 0);
  const centerWidth = W - (logoW + 8) * 2; // tighter padding around logos
  let headerY = 10;

  // Line 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  const line1 = doc.splitTextToSize(
    "YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI PUSAT",
    centerWidth,
  );
  doc.text(line1, W / 2, headerY, { align: "center" });
  headerY += (line1.length || 1) * 3.5;

  // Line 2
  doc.setFontSize(4);
  const line2 = doc.splitTextToSize(
    "PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN PGRI JAWA TIMUR",
    centerWidth,
  );
  doc.text(line2, W / 2, headerY, { align: "center" });
  headerY += (line2.length || 1) * 2.8;

  // Main title with dynamic sizing to avoid excessive wrapping
  doc.setFont("helvetica", "bold");
  let titleFont = 8;
  const title = "SMK PGRI - 4 KOTA PASURUAN";
  let titleLines = [] as string[];
  while (titleFont >= 7) {
    doc.setFontSize(titleFont);
    titleLines = doc.splitTextToSize(title, centerWidth) as string[];
    if (titleLines.length <= 2) break;
    titleFont -= 1;
  }
  doc.setFontSize(titleFont);
  doc.text(titleLines, W / 2, headerY, { align: "center" });
  headerY += (titleLines.length || 1) * (titleFont * 0.26 + 1);

  // Address and contact lines — compact
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  const line4 = doc.splitTextToSize(
    "Jl. KH. Mansyur Kelurahan Sekargadung Kecamatan Purworejo Kota Pasuruan",
    centerWidth,
  );
  doc.text(line4, W / 2, headerY, { align: "center" });
  headerY += (line4.length || 1) * 3;

  const line5 = doc.splitTextToSize(
    "Kode Pos 67127   Telp/Fax: 0343-6008008   E-mail: smkpgri4pasuruan@gmail.com   Website: www.smkpgri4-pas.sch.id",
    centerWidth,
  );
  doc.text(line5, W / 2, headerY, { align: "center" });
  headerY += (line5.length || 1) * 3;

  // separator lines
  const sepY1 = headerY + 1;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(6, sepY1, W - 6, sepY1);
  doc.setLineWidth(0.9);
  doc.line(6, sepY1 + 1, W - 6, sepY1 + 1);
  // add extra vertical gap between kop surat and transaction badge
  y = sepY1 + 20;

  // ── Transaction No badge ─────────────────────────────────────────────
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(10, y - 5, W - 20, 14, 2, 2, "FD");

  doc.setTextColor(30, 64, 175); // blue-800
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("No. Transaksi", W / 2, y + 1, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(payment.transactionNo, W / 2, y + 7, { align: "center" });

  y += 20;

  // ── Section helper ───────────────────────────────────────────────────
  const drawSection = (title: string) => {
    doc.setFillColor(249, 250, 251); // gray-50
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.rect(10, y, W - 20, 7, "FD");

    doc.setTextColor(55, 65, 81); // gray-700
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, y + 5);
    y += 10;
  };

  const drawRow = (label: string, value: string, valueBold = false) => {
    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(label, 14, y);

    doc.setTextColor(17, 24, 39); // gray-900
    doc.setFont("helvetica", valueBold ? "bold" : "normal");
    doc.text(value, W - 14, y, { align: "right" });
    y += 7;
  };

  const drawDivider = () => {
    doc.setDrawColor(243, 244, 246); // gray-100
    doc.line(10, y - 2, W - 10, y - 2);
    y += 2;
  };

  // ── Tanggal & Waktu ──────────────────────────────────────────────────
  drawSection("TANGGAL & WAKTU");

  const tgl = new Date(payment.createdAt);
  drawRow(
    "Tanggal",
    tgl.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );
  drawRow("Waktu", tgl.toLocaleTimeString("id-ID"));
  y += 3;

  // ── Data Siswa ───────────────────────────────────────────────────────
  drawSection("DATA SISWA");
  drawRow("Nama Siswa", payment.student.name);
  drawRow("NIS", payment.student.nis);
  drawRow("Kelas", payment.student.class?.name ?? "-");
  y += 3;

  // ── Detail Pembayaran ────────────────────────────────────────────────
  drawSection("DETAIL PEMBAYARAN");
  drawRow("Jenis Pembayaran", payment.paymentType);
  drawRow("Nominal", formatRupiah(payment.amount), true);
  drawRow("Metode Pembayaran", payment.paymentMethod);
  // Dibayar untuk bulan — prefer batch info if present
  const monthNames = [
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
  let paidFor = "-";
  if (payment.batch && payment.batch.month) {
    const m = payment.batch.month;
    const y = payment.batch.year;
    paidFor = `${monthNames[m - 1]} ${y}`;
  } else if (payment.notes) {
    // try to parse month/year from notes (basic)
    const match = payment.notes.match(/(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s*(\d{4})/i);
    if (match) paidFor = `${match[1]} ${match[2]}`;
  }
  drawRow("Dibayar untuk bulan", paidFor);

  // Status with colored text
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Status", 14, y);

  const isLunas = payment.status === "BERHASIL";
  doc.setTextColor(isLunas ? 22 : 185, isLunas ? 163 : 28, isLunas ? 74 : 28);
  doc.setFont("helvetica", "bold");
  doc.text(statusLabel(payment.status), W - 14, y, { align: "right" });
  y += 7;

  if (payment.notes) {
    drawDivider();
    drawRow("Catatan", payment.notes);
  }

  y += 6;

  // ── Footer ───────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235);
  doc.line(10, y, W - 10, y);
  y += 8;

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text("Dokumen ini dicetak secara otomatis oleh sistem.", W / 2, y, {
    align: "center",
  });
  y += 5;
  doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, W / 2, y, {
    align: "center",
  });

  // ── Save ─────────────────────────────────────────────────────────────
  doc.save(`kwitansi-${payment.transactionNo}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RiwayatPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);

  // fetchPayments is used in effect and after CRUD ops
  const fetchPayments = async (page = pagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search && { search }),
      });
      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      setPayments(data.payments || []);
      setPagination(
        data.pagination ?? {
          page: 1,
          limit: pagination.limit,
          total: 0,
          pages: 0,
        },
      );
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchPayments(pagination.page), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pagination.page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Riwayat Pembayaran</h1>
        <p className="text-gray-600 mt-1">Lihat semua pembayaran PMS</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <Input
              placeholder="Cari Siswa/NIS/Transaksi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Tidak ada data pembayaran</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    No. Transaksi
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Tanggal
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    NIS
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nama Siswa
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Jenis
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nominal
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Metode
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-gray-700 max-w-[140px] truncate">
                      {payment.transactionNo}
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {payment.batch &&
                      payment.batch.month &&
                      payment.batch.year
                        ? new Date(
                            payment.batch.year,
                            payment.batch.month - 1,
                            1,
                          ).toLocaleDateString("id-ID", {
                            month: "long",
                            year: "numeric",
                          })
                        : new Date(payment.createdAt).toLocaleDateString(
                            "id-ID",
                          )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {payment.student.nis}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {payment.student.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {payment.paymentType}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                      {formatRupiah(payment.amount)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {payment.paymentMethod}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}
                      >
                        {statusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {/* Detail */}
                        <button
                          onClick={() => setDetailPayment(payment)}
                          title="Lihat Detail"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        {/* Edit */}
                        <button
                          onClick={() => setEditPayment(payment)}
                          title="Edit"
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                        >
                          ✎
                        </button>
                        {/* Delete */}
                        <button
                          onClick={async () => {
                            if (!confirm("Hapus transaksi ini?")) return;
                            try {
                              const res = await fetch(
                                `/api/payments/${payment.id}`,
                                { method: "DELETE" },
                              );
                              if (!res.ok) throw new Error("Failed");
                              // refresh
                              fetchPayments(pagination.page);
                            } catch (e) {
                              console.error(e);
                              alert("Gagal menghapus transaksi");
                            }
                          }}
                          title="Hapus"
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          🗑
                        </button>
                        {/* Download PDF */}
                        <button
                          onClick={() => downloadPDF(payment)}
                          title="Download PDF"
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-3 rounded-lg border border-gray-200">
          {/* Info */}
          <p className="text-sm text-gray-600">
            Menampilkan{" "}
            <span className="font-semibold text-gray-900">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            –{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-gray-900">
              {pagination.total}
            </span>{" "}
            data
          </p>

          {/* Buttons */}
          {pagination.pages > 1 && (
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ‹ Prev
              </button>

              {/* Page numbers — sliding window of max 5 */}
              {(() => {
                const total = pagination.pages;
                const cur = pagination.page;
                let start = Math.max(1, cur - 2);
                let end = Math.min(total, start + 4);
                if (end - start < 4) start = Math.max(1, end - 4);
                return Array.from(
                  { length: end - start + 1 },
                  (_, i) => start + i,
                ).map((p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: p }))
                    }
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      p === cur
                        ? "bg-blue-600 text-white font-semibold"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}

              {/* Next */}
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(prev.pages, prev.page + 1),
                  }))
                }
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
          onDownload={(p) => {
            downloadPDF(p);
          }}
        />
      )}

      {editPayment && (
        <PaymentEditModal
          payment={editPayment}
          onClose={() => setEditPayment(null)}
          onSaved={() => {
            setEditPayment(null);
            fetchPayments(pagination.page);
          }}
        />
      )}
    </div>
  );
}
