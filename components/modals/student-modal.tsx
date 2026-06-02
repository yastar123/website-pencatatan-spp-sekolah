"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  gender?: string;
  classId: string;
  address?: string;
  phoneOrangTua?: string;
}

interface StudentModalProps {
  student: Student | null;
  classes: any[];
  onClose: () => void;
  onSave: () => void;
}

export default function StudentModal({
  student,
  classes,
  onClose,
  onSave,
}: StudentModalProps) {
  const [formData, setFormData] = useState({
    nis: "",
    nisn: "",
    name: "",
    gender: "",
    classId: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [academicYear, setAcademicYear] = useState<any>(null);

  useEffect(() => {
    const fetchAcademicYear = async () => {
      try {
        const res = await fetch("/api/academic-years");
        const data = await res.json();
        if (data.activeYear) {
          setAcademicYear(data.activeYear);
        }
      } catch (error) {
        console.error("Failed to fetch academic year:", error);
      }
    };

    fetchAcademicYear();

    if (student) {
      setFormData({
        nis: student.nis,
        nisn: student.nisn || "",
        name: student.name,
        gender: student.gender || "",
        classId: student.classId,
        address: student.address || "",
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = student ? `/api/students/${student.id}` : "/api/students";
      const method = student ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal menyimpan data siswa");
      }

      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = academicYear
    ? classes.filter((c) => c.academicYearId === academicYear.id)
    : classes;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {student ? "Edit Siswa" : "Tambah Siswa"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* NIS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIS <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nis}
              onChange={(e) =>
                setFormData({ ...formData, nis: e.target.value })
              }
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>

          {/* NISN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NISN
            </label>
            <input
              type="text"
              value={formData.nisn}
              onChange={(e) =>
                setFormData({ ...formData, nisn: e.target.value })
              }
              disabled={loading}
              placeholder="Opsional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>

          {/* Jenis Kelamin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jenis Kelamin <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 bg-white"
            >
              <option value="">Pilih Jenis Kelamin</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          {/* Kelas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kelas <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.classId}
              onChange={(e) =>
                setFormData({ ...formData, classId: e.target.value })
              }
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 bg-white"
            >
              <option value="">Pilih Kelas</option>
              {filteredClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 resize-none"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
