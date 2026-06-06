"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Search, AlertCircle, CheckCircle2 } from "lucide-react";
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

interface Debt {
  id: string;
  paymentType: string;
  amount: number;
  createdAt: string;
  notes?: string;
  batch?: { month: number; year: number } | null;
}

interface SPPRate {
  id: string;
  amount: number;
  classId: string;
}

/** Hitung alokasi FIFO dari daftar tunggakan + nominal bayar */
function computeAllocation(debts: Debt[], payAmount: number) {
  let remaining = payAmount;
  return debts.map((debt) => {
    if (remaining <= 0)
      return { ...debt, coveredAmount: 0, status: "belum" as const };
    if (remaining >= debt.amount) {
      remaining -= debt.amount;
      return { ...debt, coveredAmount: debt.amount, status: "lunas" as const };
    }
    const partial = remaining;
    remaining = 0;
    return { ...debt, coveredAmount: partial, status: "sebagian" as const };
  });
}

export default function InputPembayaranPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [sppRates, setSppRates] = useState<SPPRate[]>([]);
  const [activeAcademicYear, setActiveAcademicYear] = useState<{
    id?: string;
    year?: string;
    startDate?: string;
    endDate?: string;
  } | null>(null);
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paidMonths, setPaidMonths] = useState<
    { month: number; year: number }[]
  >([]);
  const [monthStatusList, setMonthStatusList] = useState<
    {
      month: number;
      year: number;
      status: "paid" | "debt" | "none";
    }[]
  >([]);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [searchStudent, setSearchStudent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const currentDate = new Date();
  const [formData, setFormData] = useState({
    paymentType: "PMS",
    amount: "",
    paymentMethod: "Tunai",
    status: "BERHASIL",
    notes: "",
    // month/year intentionally omitted: payments allocate automatically (FIFO)
  });

  useEffect(() => {
    if (loading) return;
    if (user?.role !== "BENDAHARA") router.push("/dashboard");

    fetch("/api/spp-rates")
      .then((r) => r.json())
      .then((d) => setSppRates(d.rates || []))
      .catch(console.error);

    // fetch active academic year to limit year options
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((d) => {
        const ay = d.activeYear || null;
        setActiveAcademicYear(ay);
        if (ay && ay.startDate && ay.endDate) {
          const start = new Date(ay.startDate).getFullYear();
          const end = new Date(ay.endDate).getFullYear();
          const opts: number[] = [];
          for (let y = start; y <= end; y++) opts.push(y);
          setYearOptions(opts);
        } else {
          // fallback: last 5 years
          const currentDate = new Date();
          setYearOptions(
            Array.from(
              { length: 5 },
              (_, i) => currentDate.getFullYear() - 2 + i,
            ),
          );
        }
      })
      .catch((e) => {
        console.error("Failed to fetch academic years", e);
      });
  }, [user, router, loading]);

  // Fetch payments (paid + tunggakan) when a student is selected
  const fetchDebts = async (studentId: string) => {
    setLoadingDebts(true);
    try {
      // Map UI payment types to stored paymentType values (PMS -> SPP)
      const paymentTypeQuery =
        formData.paymentType === "PMS" ? "SPP" : formData.paymentType;
      const res = await fetch(
        `/api/payments?studentId=${studentId}&paymentType=${encodeURIComponent(
          paymentTypeQuery,
        )}&page=1&limit=1000`,
      );
      const data = await res.json();

      const all: any[] = data.payments || [];

      // Separate tunggakan (MENUNGGAK)
      const tunggakan = all
        .filter((p) => p.status === "MENUNGGAK")
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      // build maps for paid and debt by year-month key
      const paidMap = new Map<string, { month: number; year: number }>();
      const debtMap = new Map<string, { month: number; year: number }>();

      all.forEach((p) => {
        let month: number;
        let year: number;
        if (p.batch && p.batch.month && p.batch.year) {
          month = p.batch.month;
          year = p.batch.year;
        } else {
          const dt = new Date(p.createdAt);
          month = dt.getMonth() + 1;
          year = dt.getFullYear();
        }
        const key = `${year}-${String(month).padStart(2, "0")}`;
        if (p.status === "BERHASIL") {
          if (!paidMap.has(key)) paidMap.set(key, { month, year });
        }
        if (p.status === "MENUNGGAK") {
          if (!debtMap.has(key)) debtMap.set(key, { month, year });
        }
      });

      setDebts(tunggakan);
      setPaidMonths(Array.from(paidMap.values()));

      // Build monthStatusList using active academic year range if available
      const ayRes = await fetch(`/api/academic-years`);
      const ayData = await ayRes.json();
      const active = ayData.activeYear;
      const monthsList: {
        month: number;
        year: number;
        status: "paid" | "debt" | "none";
      }[] = [];
      if (active && active.startDate && active.endDate) {
        const start = new Date(active.startDate);
        const end = new Date(active.endDate);
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur <= end) {
          const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
          const isPaid = paidMap.has(key);
          const isDebt = debtMap.has(key);
          monthsList.push({
            month: cur.getMonth() + 1,
            year: cur.getFullYear(),
            status: isPaid ? "paid" : isDebt ? "debt" : "none",
          });
          cur.setMonth(cur.getMonth() + 1);
        }
      }
      setMonthStatusList(monthsList);
    } catch (e) {
      console.error("Failed to fetch debts/payments", e);
    } finally {
      setLoadingDebts(false);
    }
  };

  // Refetch debts when selected student or payment type changes
  useEffect(() => {
    if (selectedStudent) fetchDebts(selectedStudent.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, formData.paymentType]);

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
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchStudent(student.name);
    setStudents([]);
    setDebts([]);
    setSuccessMsg("");

    // Auto-fill nominal berdasarkan PMS rate
    const rate = sppRates.find(
      (r) => r.classId === student.class?.id || r.classId === student.classId,
    );
    if (rate)
      setFormData((prev) => ({ ...prev, amount: rate.amount.toString() }));

    fetchDebts(student.id);
  };

  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
  const parsedAmount = parseInt(formData.amount) || 0;
  const allocation =
    formData.status === "BERHASIL" && debts.length > 0
      ? computeAllocation(debts, parsedAmount)
      : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError("Silakan pilih siswa terlebih dahulu");
      return;
    }
    if (!formData.amount || parsedAmount <= 0) {
      setError("Nominal pembayaran harus diisi dan lebih dari 0");
      return;
    }

    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          paymentType: formData.paymentType,
          amount: parsedAmount,
          paymentMethod: formData.paymentMethod,
          status: formData.status,
          notes: formData.notes,
          // month/year intentionally omitted so server allocates FIFO
        }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan pembayaran");
      const result = await res.json();

      const closedCount = result.closedDebts?.length ?? 0;
      setSuccessMsg(
        closedCount > 0
          ? `Pembayaran berhasil dicatat. ${closedCount} tunggakan terlama otomatis dilunasi.`
          : "Pembayaran berhasil dicatat.",
      );

      // Reset form
      setFormData({
        paymentType: "PMS",
        amount: "",
        paymentMethod: "Tunai",
        status: "BERHASIL",
        notes: "",
        // month/year omitted
      });
      setSelectedStudent(null);
      setSearchStudent("");
      setDebts([]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
  const fmtTgl = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Input Pembayaran</h1>
        <p className="text-gray-600 mt-1">Catat pembayaran PMS siswa</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg border border-gray-200 space-y-6"
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="flex gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            {successMsg}
          </div>
        )}

        {/* -- Pilih Siswa -- */}
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
            {students.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                {students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStudent(s)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-sm text-gray-600">
                      NIS: {s.nis} | Kelas: {s.class?.name ?? "-"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info siswa terpilih */}
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
                className={`text-sm font-medium mt-1 ${selectedStudent.status === "LUNAS" ? "text-green-600" : "text-red-600"}`}
              >
                Status:{" "}
                {selectedStudent.status === "LUNAS" ? "Lunas" : "Nunggak"}
              </p>
            </div>
          )}

          {/* -- Daftar Tunggakan -- */}
          {selectedStudent && loadingDebts && (
            <div className="mt-3 text-sm text-gray-500">
              Memuat tunggakan...
            </div>
          )}

          {selectedStudent &&
            !loadingDebts &&
            (debts.length > 0 ||
              paidMonths.length > 0 ||
              monthStatusList.length > 0) && (
              <>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Status per bulan untuk tahun ajaran aktif:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {monthStatusList.length === 0 ? (
                      <span className="text-xs text-gray-500">
                        Tidak ada data bulan
                      </span>
                    ) : (
                      monthStatusList.map((m) => (
                        <span
                          key={`${m.year}-${m.month}`}
                          className={`text-xs px-2 py-1 rounded ${
                            m.status === "paid"
                              ? "bg-green-50 text-green-700"
                              : m.status === "debt"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {new Date(m.year, m.month - 1, 1).toLocaleString(
                            "id-ID",
                            {
                              month: "short",
                              year: "numeric",
                            },
                          )}
                          {m.status === "paid" && " ✓"}
                          {m.status === "debt" && " •"}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="mt-4 border border-orange-200 rounded-lg overflow-hidden">
                  <div className="bg-orange-50 px-4 py-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-orange-500" />
                    <span className="text-sm font-semibold text-orange-800">
                      Ada {debts.length} tunggakan · Total {fmtRp(totalDebt)}
                    </span>
                  </div>
                  <div className="divide-y divide-orange-100">
                    {debts.map((debt, idx) => {
                      const alloc = allocation[idx];
                      return (
                        <div
                          key={debt.id}
                          className="px-4 py-2.5 flex items-center justify-between bg-white text-sm"
                        >
                          <div>
                            <span className="text-gray-700 font-medium">
                              {debt.paymentType}
                            </span>
                            <span className="text-gray-400 ml-2 text-xs">
                              {fmtTgl(debt.createdAt)}
                            </span>
                            {debt.notes && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {debt.notes}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-red-600">
                              {fmtRp(debt.amount)}
                            </p>
                            {/* Preview alokasi */}
                            {alloc && parsedAmount > 0 && (
                              <p
                                className={`text-xs font-medium mt-0.5 ${
                                  alloc.status === "lunas"
                                    ? "text-green-600"
                                    : alloc.status === "sebagian"
                                      ? "text-yellow-600"
                                      : "text-gray-400"
                                }`}
                              >
                                {alloc.status === "lunas" && "✓ Akan dilunasi"}
                                {alloc.status === "sebagian" &&
                                  `≈ Dibayar ${fmtRp(alloc.coveredAmount)}`}
                                {alloc.status === "belum" && "○ Belum tertutup"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Tombol bantu: isi nominal sesuai total tunggakan */}
                  <div className="bg-orange-50 px-4 py-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((f) => ({
                          ...f,
                          amount: totalDebt.toString(),
                        }))
                      }
                      className="text-xs text-orange-700 hover:underline font-medium"
                    >
                      Isi nominal = total tunggakan ({fmtRp(totalDebt)})
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>

        {/* -- Detail Pembayaran -- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Month/year removed: payments will auto-close oldest debts (FIFO) */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nominal Bayar *
            </label>
            <Input
              type="text"
              placeholder="Masukkan nominal"
              value={
                formData.amount
                  ? new Intl.NumberFormat("id-ID").format(
                      parseInt(formData.amount),
                    )
                  : ""
              }
              onChange={(e) => {
                // keep only digits in state, display formatted
                const raw = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, amount: raw });
              }}
              required
            />
          </div>

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
              <option>Beasiswa</option>
              <option>Prestasi</option>
            </select>
          </div>

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
              <option value="BERHASIL">Berhasil</option>
              <option value="MENUNGGAK">Nunggak</option>
            </select>
          </div>
        </div>

        {/* Info alokasi total */}
        {formData.status === "BERHASIL" &&
          debts.length > 0 &&
          parsedAmount > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              💡 Pembayaran {fmtRp(parsedAmount)} akan otomatis menutup
              tunggakan paling lama terlebih dahulu.
              {parsedAmount >= totalDebt ? (
                <span className="font-semibold">
                  {" "}
                  Semua tunggakan akan lunas!
                </span>
              ) : (
                <span>
                  {" "}
                  Sisa tunggakan setelah pembayaran:{" "}
                  <strong>{fmtRp(totalDebt - parsedAmount)}</strong>
                </span>
              )}
            </div>
          )}

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
            rows={3}
          />
        </div>

        <Button
          type="submit"
          disabled={submitting || !selectedStudent}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg"
        >
          {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
        </Button>
      </form>
    </div>
  );
}
