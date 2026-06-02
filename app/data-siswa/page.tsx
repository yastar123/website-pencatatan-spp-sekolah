"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StudentModal from "@/components/modals/student-modal";

interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  classId: string;
  class?: { name: string } | null;
  gender?: string; // 'L' or 'P'
  address?: string;
  phoneOrangTua?: string;
  status?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function DataSiswaPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch classes
  useEffect(() => {
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

  // Fetch students (debounced)
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          ...(search && { search }),
          ...(selectedClass && { classId: selectedClass }),
        } as Record<string, string>);

        const res = await fetch(`/api/students?${params}`);
        const data = await res.json();
        setStudents(data.students || []);
        const paginationData: PaginationData = data.pagination ?? {
          page: 1,
          limit: pagination.limit,
          total: 0,
          pages: 0,
        };
        setPagination(paginationData);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedClass, pagination.page]);

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus siswa ini?")) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete student:", error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedStudent(null);
  };

  const handleStudentSaved = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    handleModalClose();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-600 mt-1">Kelola data siswa sekolah</p>
        </div>
        {user?.role === "BENDAHARA" && (
          <Button
            onClick={() => {
              setSelectedStudent(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus size={20} />
            Tambah Siswa
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <Input
            placeholder="Cari Nama/NIS..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="pl-10"
          />
        </div>
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
        >
          <option value="">Filter Kelas</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Tidak ada data siswa</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    No
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    NIS
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    NISN
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nama Lengkap
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    JK
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Kelas
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Alamat
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Status Pembayaran
                  </th>
                  {user?.role === "BENDAHARA" && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const rowNo =
                    (pagination.page - 1) * pagination.limit + idx + 1;
                  return (
                    <tr
                      key={student.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {rowNo}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {student.nis}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {student.nisn || "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {student.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {student.gender || "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {student.class?.name || "-"}
                      </td>
                      <td
                        className="py-3 px-4 text-gray-600 max-w-[180px] truncate"
                        title={student.address || "-"}
                      >
                        {student.address || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            student.status === "LUNAS"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {student.status === "LUNAS"
                            ? "Lunas"
                            : student.status === "MENUNGGAK"
                              ? "Nunggak"
                              : student.status || "-"}
                        </span>
                      </td>
                      {user?.role === "BENDAHARA" && (
                        <td className="py-3 px-4 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setModalOpen(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
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

      {/* Modal */}
      {modalOpen && (
        <StudentModal
          student={selectedStudent}
          classes={classes}
          onClose={handleModalClose}
          onSave={handleStudentSaved}
        />
      )}
    </div>
  );
}
