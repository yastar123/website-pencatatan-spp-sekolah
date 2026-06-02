"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah } from "@/lib/utils";
import { Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "BERHASIL":
        return "bg-green-100 text-green-800";
      case "GAGAL":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={20} />
            Export
          </button>
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
                    Jenis Pembayaran
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
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {payment.transactionNo}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
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
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {formatRupiah(payment.amount)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {payment.paymentMethod}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                        <Eye size={16} />
                      </button>
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.max(1, prev.page - 1),
              }))
            }
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Sebelumnya
          </button>
          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
            const pageNum = Math.max(1, pagination.page - 2) + i;
            if (pageNum > pagination.pages) return null;
            return (
              <button
                key={pageNum}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: pageNum }))
                }
                className={`px-3 py-2 rounded-lg ${
                  pagination.page === pageNum
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.min(prev.pages, prev.page + 1),
              }))
            }
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}
