"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils";

export default function LaporanDetailPage() {
  const { user } = useAuth();
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [ay, cl] = await Promise.all([
          fetch("/api/academic-years").then((r) => r.json()),
          fetch("/api/classes").then((r) => r.json()),
        ]);
        setAcademicYears(ay.years || []);
        setClasses(cl.classes || []);
        if ((ay.years || []).length > 0)
          setSelectedAcademicYearId(ay.years[0].id);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMeta();
  }, []);

  // Auto-fetch rows when academic year, class, or month changes (unless a manual student filter is used)
  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAcademicYearId, selectedClassId, selectedMonth]);

  const searchStudent = async (q: string) => {
    if (!q || q.length < 2) return;
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.students && data.students.length > 0)
        setStudentId(data.students[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAcademicYearId)
        params.set("academicYearId", selectedAcademicYearId);
      if (selectedClassId && selectedClassId !== "all")
        params.set("classId", selectedClassId);
      if (selectedMonth && selectedMonth !== "all")
        params.set("month", selectedMonth);
      if (studentId) params.set("studentId", studentId);

      const res = await fetch(`/api/reports/detail?${params.toString()}`);
      const data = await res.json();
      setRows(data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cek Tagihan</h1>
        <p className="text-gray-600 mt-1">
          Tampilkan data siswa & status pembayaran pada UI
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tahun Ajaran
            </label>
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
            <label className="block text-sm font-medium text-gray-700">
              Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cari Siswa
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Nama atau NIS..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                onBlur={() => searchStudent(studentQuery)}
              />
              <Button onClick={fetchRows}>Tampilkan</Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Biarkan kosong untuk semua siswa
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        {loading ? (
          <div className="text-center py-8">Memuat...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">NIS</th>
                  <th className="text-left py-2 px-3">Nama</th>
                  <th className="text-left py-2 px-3">Kelas</th>
                  <th className="text-right py-2 px-3">Total Bayar</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentId} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3">{r.nis}</td>
                    <td className="py-2 px-3">{r.name}</td>
                    <td className="py-2 px-3">{r.className}</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {formatRupiah(r.totalBayar)}
                    </td>
                    <td className="py-2 px-3">{r.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="text-sm text-gray-500 mt-4">
                Tidak ada data untuk filter yang dipilih.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
