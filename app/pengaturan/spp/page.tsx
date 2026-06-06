"use client";

import { useEffect, useState } from "react";

export default function SPPSettingsPage() {
  const [years, setYears] = useState([]);
  const [yearId, setYearId] = useState("");
  const [amount, setAmount] = useState(0);
  const [displayAmount, setDisplayAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then((d) => setYears(d.years || []))
      .catch(console.error);

    fetchRates();
  }, []);

  const fetchRates = () => {
    fetch("/api/spp-rates")
      .then((r) => r.json())
      .then((d) => setRates(d.rates || []))
      .catch(console.error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/spp-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearId,
          amount: parseInt(String(amount), 10),
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      // refresh list instead of navigating away so user sees history
      fetchRates();
      alert("Berhasil menyimpan nominal PMS");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan nominal PMS");
    } finally {
      setLoading(false);
    }
  };

  function formatCurrency(value: number) {
    if (!value) return "";
    return value.toLocaleString("id-ID");
  }

  function parseNumericInput(input: string) {
    const digits = input.replace(/\D/g, "");
    return digits === "" ? 0 : parseInt(digits, 10);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Set Nominal PMS</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <p className="text-sm text-gray-600">
            Nominal akan berlaku untuk <strong>semua kelas</strong> pada tahun
            ajaran yang dipilih.
          </p>
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
            type="text"
            inputMode="numeric"
            value={displayAmount || formatCurrency(amount)}
            onChange={(e) => {
              const raw = e.target.value;
              const num = parseNumericInput(raw);
              setAmount(num);
              setDisplayAmount(raw === "" ? "" : formatCurrency(num));
            }}
            onFocus={(e) => {
              // show unformatted digits while editing
              if (amount) e.currentTarget.value = String(amount);
              setDisplayAmount("");
            }}
            onBlur={(e) => {
              setDisplayAmount(formatCurrency(amount));
            }}
            className="mt-1 block w-full border rounded p-2"
            placeholder="0"
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

      <div className="mt-8">
        <h2 className="font-semibold mb-2">Riwayat Simpan Nominal</h2>
        <div className="p-4 bg-gray-50">
          {rates.length === 0 ? (
            <p className="text-sm text-gray-600">
              Belum ada nominal yang disimpan.
            </p>
          ) : (
            (() => {
              const sorted = [...rates].sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              );
              const totalPages = Math.max(
                1,
                Math.ceil(sorted.length / pageSize),
              );
              const start = (page - 1) * pageSize;
              const paged = sorted.slice(start, start + pageSize);
              return (
                <div>
                  <ul className="space-y-2">
                    {paged.map((it: any) => (
                      <li key={it.id} className="text-sm text-gray-700">
                        <div className="font-medium">
                          {it.academicYear?.year || "-"}
                        </div>
                        <div>
                          {it.amount.toLocaleString("id-ID")} -{" "}
                          {it.class?.name || "(semua kelas)"}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>
                    <div className="text-sm text-gray-600">
                      Halaman {page} dari {totalPages}
                    </div>
                    <button
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
