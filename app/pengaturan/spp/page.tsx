"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SPPSettingsPage() {
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [classId, setClassId] = useState("");
  const [yearId, setYearId] = useState("");
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(console.error);

    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((d) => {
        setYears(d.years || []);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/spp-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          academicYearId: yearId,
          amount: parseInt(String(amount), 10),
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      // redirect back to pengaturan
      router.push("/pengaturan");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan SPP rate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Set Nominal SPP</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium">Kelas</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            required
          >
            <option value="">Pilih kelas</option>
            {classes.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Tahun Ajaran</label>
          <select
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            required
          >
            <option value="">Pilih tahun ajaran</option>
            {years.map((y: any) => (
              <option key={y.id} value={y.id}>
                {y.year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Nominal per bulan (Rp)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
            className="mt-1 block w-full border rounded p-2"
            min={0}
            required
          />
        </div>

        <div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? "Menyimpan..." : "Simpan Nominal"}
          </button>
        </div>
      </form>
    </div>
  );
}
