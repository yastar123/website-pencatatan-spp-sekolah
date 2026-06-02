"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Download, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface ClassItem {
  id: string;
  name: string;
  academicYearId: string;
}

export default function PengaturanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "tahun-ajaran" | "kelas" | "backup"
  >("tahun-ajaran");

  useEffect(() => {
    if (loading) return; // wait for auth check

    if (user?.role !== "BENDAHARA") {
      router.push("/dashboard");
      return;
    }

    const fetchData = async () => {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          fetch("/api/academic-years"),
          fetch("/api/classes"),
        ]);

        const yearsData = await yearsRes.json();
        const classesData = await classesRes.json();

        setAcademicYears(yearsData.years || []);
        setClasses(classesData.classes || []);
      } catch (error) {
        console.error("Failed to fetch settings data:", error);
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [user, loading, router]);

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Yakin ingin menghapus kelas ini?")) return;

    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClasses(classes.filter((c) => c.id !== id));
        return;
      }

      // If deletion blocked due to enrolled students, offer force-delete
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        const message = body?.error || "Kelas memiliki siswa terdaftar";
        // fetch blocking students count/details
        const studentsRes = await fetch(`/api/students?classId=${id}`);
        const studentsBody = await studentsRes.json().catch(() => ({}));
        const blocked = Array.isArray(studentsBody.students)
          ? studentsBody.students
          : [];

        const confirmMsg = `${message}. Jumlah siswa: ${blocked.length}. Hapus kelas beserta siswanya?`;
        if (confirm(confirmMsg)) {
          const forceRes = await fetch(`/api/classes/${id}?force=true`, {
            method: "DELETE",
          });
          if (forceRes.ok) {
            setClasses(classes.filter((c) => c.id !== id));
            return;
          }
          const err = await forceRes.json().catch(() => ({}));
          alert(err?.error || "Gagal menghapus kelas dengan force");
        }
        return;
      }

      // other errors
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Gagal menghapus kelas");
    } catch (error) {
      console.error("Failed to delete class:", error);
    }
  };

  const handleAddClass = async () => {
    const name = prompt("Nama kelas:");
    if (!name) return;
    if (academicYears.length === 0) {
      alert("Tidak ada tahun ajaran. Tambahkan tahun ajaran terlebih dahulu.");
      return;
    }
    const yearOptions = academicYears
      .map((y, i) => `${i + 1}. ${y.year}`)
      .join("\n");
    const sel = prompt(`Pilih tahun ajaran:\n${yearOptions}\nMasukkan nomor:`);
    const idx = parseInt(sel || "") - 1;
    const academicYearId = academicYears[idx]?.id || academicYears[0].id;

    try {
      const res = await fetch(`/api/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, academicYearId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Gagal menambah kelas");
        return;
      }
      const created = await res.json();
      setClasses((c) => [
        ...c,
        {
          id: created.id,
          name: created.name,
          academicYearId: created.academicYearId,
        },
      ]);
    } catch (error) {
      console.error("Failed to create class:", error);
    }
  };

  const handleEditClass = async (cls: ClassItem) => {
    const name = prompt("Nama kelas:", cls.name);
    if (!name) return;
    if (academicYears.length === 0) {
      alert("Tidak ada tahun ajaran.");
      return;
    }
    const yearOptions = academicYears
      .map((y, i) => `${i + 1}. ${y.year}`)
      .join("\n");
    const currentIdx = academicYears.findIndex(
      (y) => y.id === cls.academicYearId,
    );
    const sel = prompt(
      `Pilih tahun ajaran:\n${yearOptions}\nMasukkan nomor:`,
      String(currentIdx + 1),
    );
    const idx = parseInt(sel || "") - 1;
    const academicYearId = academicYears[idx]?.id || cls.academicYearId;

    try {
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, academicYearId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Gagal mengubah kelas");
        return;
      }
      const updated = await res.json();
      setClasses((c) =>
        c.map((x) =>
          x.id === updated.id
            ? {
                id: updated.id,
                name: updated.name,
                academicYearId: updated.academicYearId,
              }
            : x,
        ),
      );
    } catch (error) {
      console.error("Failed to update class:", error);
    }
  };

  const handleExportDatabase = async () => {
    try {
      const res = await fetch("/api/backup/export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString()}.db`;
      a.click();
    } catch (error) {
      console.error("Failed to export database:", error);
      alert("Gagal mengexport database");
    }
  };

  const handleAddYear = async () => {
    const year = prompt("Tahun (contoh: 2023/2024):");
    if (!year) return;
    const startDate = prompt("Tanggal mulai (YYYY-MM-DD):");
    const endDate = prompt("Tanggal akhir (YYYY-MM-DD):");
    const active = confirm("Set tahun ajaran ini sebagai aktif?");

    try {
      const res = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, startDate, endDate, active }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Gagal menambah tahun ajaran");
        return;
      }
      const created = await res.json();
      setAcademicYears((s) => [created, ...s]);
    } catch (error) {
      console.error("Failed to create academic year:", error);
    }
  };

  const handleEditYear = async (yearItem: AcademicYear) => {
    const year = prompt("Tahun (contoh: 2023/2024):", yearItem.year);
    if (!year) return;
    const startDate = prompt(
      "Tanggal mulai (YYYY-MM-DD):",
      yearItem.startDate.split("T")[0],
    );
    const endDate = prompt(
      "Tanggal akhir (YYYY-MM-DD):",
      yearItem.endDate.split("T")[0],
    );
    const active = confirm("Set tahun ajaran ini sebagai aktif?");

    try {
      const res = await fetch(`/api/academic-years/${yearItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, startDate, endDate, active }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Gagal mengubah tahun ajaran");
        return;
      }
      const updated = await res.json();
      setAcademicYears((s) =>
        s.map((y) => (y.id === updated.id ? updated : y)),
      );
    } catch (error) {
      console.error("Failed to update academic year:", error);
    }
  };

  const handleDeleteYear = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tahun ajaran ini?")) return;
    try {
      const res = await fetch(`/api/academic-years/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAcademicYears((s) => s.filter((y) => y.id !== id));
        return;
      }
      const body = await res.json().catch(() => ({}));
      alert(body?.error || "Gagal menghapus tahun ajaran");
    } catch (error) {
      console.error("Failed to delete academic year:", error);
    }
  };

  if (pageLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-600 mt-1">
          Kelola data master dan backup sistem
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("tahun-ajaran")}
            className={`px-4 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "tahun-ajaran"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Tahun Ajaran
          </button>
          <button
            onClick={() => setActiveTab("kelas")}
            className={`px-4 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "kelas"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Kelas
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`px-4 py-4 font-medium border-b-2 transition-colors ${
              activeTab === "backup"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Backup & Restore
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "tahun-ajaran" && (
        <div className="space-y-4">
          <Button
            onClick={handleAddYear}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Tambah Tahun Ajaran
          </Button>

          <div className="grid gap-4">
            {academicYears.map((year) => (
              <div
                key={year.id}
                className="bg-white p-6 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {year.year}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(year.startDate).toLocaleDateString("id-ID")} -{" "}
                      {new Date(year.endDate).toLocaleDateString("id-ID")}
                    </p>
                    {year.active && (
                      <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Aktif
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleEditYear(year)}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteYear(year.id)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "kelas" && (
        <div className="space-y-4">
          <Button
            onClick={handleAddClass}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Tambah Kelas
          </Button>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nama Kelas
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Tahun Ajaran
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr
                    key={cls.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {cls.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {academicYears.find((y) => y.id === cls.academicYearId)
                        ?.year || "-"}
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => handleEditClass(cls)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "backup" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              Backup Database
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Unduh file database SQLite untuk keamanan data Anda
            </p>
            <Button
              onClick={handleExportDatabase}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <Download size={20} />
              Export Database
            </Button>
          </div>

          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              Restore Database
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload file database untuk restore data
            </p>
            <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:border-green-500 cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Klik untuk upload atau drag & drop file
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
