"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/lib/utils";
import { Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import PaymentDetailModal from "@/components/modals/payment-detail-modal";

interface Payment {
  id: string;
  transactionNo: string;
  student: { name: string; nis: string };
  paymentType: string;
  amount: number;
  paymentMethod: string;
  status: string;
  proofUrl?: string;
  createdAt: string;
  notes?: string;
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

  // ── Header band ──────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, W, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("KWITANSI PEMBAYARAN", W / 2, 11, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sistem Informasi Pembayaran Sekolah", W / 2, 18, {
    align: "center",
  });

  y = 36;

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
  y += 3;

  // ── Detail Pembayaran ────────────────────────────────────────────────
  drawSection("DETAIL PEMBAYARAN");
  drawRow("Jenis Pembayaran", payment.paymentType);
  drawRow("Nominal", formatRupiah(payment.amount), true);
  drawRow("Metode Pembayaran", payment.paymentMethod);

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

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
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

    const debounceTimer = setTimeout(fetchPayments, 300);
    return () => clearTimeout(debounceTimer);
  }, [search, pagination.page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Riwayat Pembayaran</h1>
        <p className="text-gray-600 mt-1">Lihat semua pembayaran SPP</p>
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
                      {new Date(payment.createdAt).toLocaleDateString("id-ID")}
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
    </div>
  );
}
