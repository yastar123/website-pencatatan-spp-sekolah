"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Student {
  id: string;
  nis: string;
  name: string;
  class?: { id?: string; name: string };
  classId?: string;
  status: string;
}

interface SPPRate {
  id: string;
  amount: number;
  classId: string;
}

export default function InputPembayaranPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [sppRates, setSppRates] = useState<SPPRate[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchStudent, setSearchStudent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    paymentType: "PMS",
    amount: "",
    paymentMethod: "Tunai",
    status: "BERHASIL",
    notes: "",
    proofFile: null as File | null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (loading) return; // wait for auth check to finish

    if (user?.role !== "BENDAHARA") {
      router.push("/dashboard");
    }

    const fetchSPPRates = async () => {
      try {
        const res = await fetch("/api/spp-rates");
        const data = await res.json();
        setSppRates(data.rates || []);
      } catch (error) {
        console.error("Failed to fetch SPP rates:", error);
      }
    };

    fetchSPPRates();
  }, [user, router]);

  const handleSearchStudent = async (query: string) => {
    setSearchStudent(query);
    if (query.length < 2) {
      setStudents([]);
      return;
    }

    try {
      const res = await fetch(`/api/students?search=${query}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Failed to search students:", error);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchStudent(student.name);
    setStudents([]);

    // Auto-fill amount based on SPP rate
    const rate = sppRates.find(
      (r) => r.classId === student.class?.id || r.classId === student.classId,
    );
    if (rate) {
      setFormData((prev) => ({ ...prev, amount: rate.amount.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError("Silakan pilih siswa terlebih dahulu");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      let response: Response;

      if (formData.proofFile) {
        const fd = new FormData();
        fd.append("studentId", selectedStudent.id);
        fd.append("paymentType", formData.paymentType);
        fd.append("amount", String(parseInt(formData.amount) || 0));
        fd.append("paymentMethod", formData.paymentMethod);
        fd.append("status", formData.status);
        fd.append("notes", formData.notes);
        fd.append("proofFile", formData.proofFile);

        response = await fetch("/api/payments", {
          method: "POST",
          body: fd,
        });
      } else {
        response = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudent.id,
            paymentType: formData.paymentType,
            amount: parseInt(formData.amount),
            paymentMethod: formData.paymentMethod,
            status: formData.status,
            notes: formData.notes,
          }),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to create payment");
      }

      // Reset form to current defaults
      setFormData({
        paymentType: "PMS",
        amount: "",
        paymentMethod: "Tunai",
        status: "BERHASIL",
        notes: "",
        proofFile: null,
      });
      setSelectedStudent(null);
      setSearchStudent("");

      alert("Pembayaran berhasil dicatat");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Input Pembayaran</h1>
        <p className="text-gray-600 mt-1">Catat pembayaran SPP siswa</p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg border border-gray-200 space-y-6"
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Student Search */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Pilih Siswa
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari Siswa (NIS/Nama)..."
              value={searchStudent}
              onChange={(e) => handleSearchStudent(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />

            {/* Dropdown Results */}
            {students.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {students.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleSelectStudent(student)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-600">
                      NIS: {student.nis} | Kelas: {student.class?.name ?? "-"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Student Info */}
          {selectedStudent && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600">Siswa Terpilih:</p>
              <p className="font-semibold text-gray-900">
                {selectedStudent.name}
              </p>
              <p className="text-sm text-gray-600">
                NIS: {selectedStudent.nis} | Kelas:{" "}
                {selectedStudent.class?.name ?? "-"}
              </p>
              <p
                className={`text-sm font-medium mt-2 ${selectedStudent.status === "LUNAS" ? "text-green-600" : "text-red-600"}`}
              >
                Status: {selectedStudent.status}
              </p>
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jenis Pembayaran *
            </label>
            <select
              value={formData.paymentType}
              onChange={(e) =>
                setFormData({ ...formData, paymentType: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option>PMS</option>
              <option>Sarpras</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nominal Bayar *
            </label>
            <Input
              type="number"
              placeholder="Masukkan nominal"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metode Pembayaran *
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData({ ...formData, paymentMethod: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option>Tunai</option>
              <option>Pip</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Pembayaran *
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option>BERHASIL</option>
              <option>GAGAL</option>
              <option>PENDING</option>
            </select>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bukti Transfer (opsional)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Klik untuk upload atau drag & drop file (opsional)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setFormData((prev) => ({ ...prev, proofFile: file }));
            }}
          />

          {formData.proofFile && (
            <div className="mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              <div className="truncate text-sm text-gray-800">
                {formData.proofFile.name}
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, proofFile: null }))
                }
                className="text-sm text-red-600 hover:underline ml-4"
              >
                Hapus
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Catatan
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            placeholder="Catatan tambahan (opsional)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            rows={4}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting || !selectedStudent}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
        </Button>
      </form>
    </div>
  );
}
