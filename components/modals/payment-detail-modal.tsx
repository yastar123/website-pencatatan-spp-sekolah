"use client";

import { X, Download } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface Payment {
  id: string;
  transactionNo: string;
  student: { name: string; nis: string };
  paymentType: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  notes?: string;
}

interface PaymentDetailModalProps {
  payment: Payment;
  onClose: () => void;
  onDownload: (payment: Payment) => void;
}

function getStatusStyle(status: string) {
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
    case "PENDING":
      return "Pending";
    default:
      return status;
  }
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-gray-500 shrink-0 w-40">{label}</span>
      <span
        className={`text-sm text-right ${bold ? "font-bold text-gray-900" : "text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function PaymentDetailModal({
  payment,
  onClose,
  onDownload,
}: PaymentDetailModalProps) {
  const tanggal = new Date(payment.createdAt).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const waktu = new Date(payment.createdAt).toLocaleTimeString("id-ID");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Detail Pembayaran
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Transaction badge */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">No. Transaksi</p>
            <p className="font-mono font-bold text-blue-700 text-sm tracking-wide">
              {payment.transactionNo}
            </p>
          </div>

          {/* Date & time */}
          <div className="space-y-2">
            <Row label="Tanggal" value={tanggal} />
            <Row label="Waktu" value={waktu} />
          </div>

          <hr className="border-gray-100" />

          {/* Student */}
          <div className="space-y-2">
            <Row label="Nama Siswa" value={payment.student.name} />
            <Row label="NIS" value={payment.student.nis} />
          </div>

          <hr className="border-gray-100" />

          {/* Payment */}
          <div className="space-y-2">
            <Row label="Jenis Pembayaran" value={payment.paymentType} />
            <Row
              label="Nominal"
              value={formatRupiah(payment.amount)}
              bold
            />
            <Row label="Metode Pembayaran" value={payment.paymentMethod} />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 w-40 shrink-0">
                Status
              </span>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(payment.status)}`}
              >
                {statusLabel(payment.status)}
              </span>
            </div>
          </div>

          {payment.notes && (
            <>
              <hr className="border-gray-100" />
              <Row label="Catatan" value={payment.notes} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => onDownload(payment)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            <Download size={15} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
