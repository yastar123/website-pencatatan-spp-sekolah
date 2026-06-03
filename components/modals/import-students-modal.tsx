"use client";

import { useRef, useState } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ParsedRow {
  nis: string;
  nisn: string;
  name: string;
  gender: string;
  className: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; nis: string; reason: string }[];
}

interface ImportStudentsModalProps {
  onClose: () => void;
  onDone: () => void;
}

// Cari index kolom berdasarkan nama (case-insensitive)
function findCol(headers: string[], ...keys: string[]): number {
  return headers.findIndex((h) =>
    keys.some((k) => h.toLowerCase().trim() === k.toLowerCase()),
  );
}

export default function ImportStudentsModal({
  onClose,
  onDone,
}: ImportStudentsModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (file: File) => {
    setParseError("");
    setRows([]);
    setResult(null);
    setFileName(file.name);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });

      if (raw.length < 2) {
        setParseError("File kosong atau tidak punya data.");
        return;
      }

      // Cari baris header (baris pertama yang punya kolom NIS/NAMA)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(5, raw.length); i++) {
        const row = raw[i].map((c: any) => String(c));
        if (findCol(row, "nis") !== -1 && findCol(row, "nama") !== -1) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = raw[headerRowIdx].map((c: any) => String(c));
      const iNis = findCol(headers, "nis");
      const iNisn = findCol(headers, "nisn");
      const iNama = findCol(headers, "nama", "nama lengkap", "name");
      const iJk = findCol(headers, "jk", "jenis kelamin", "gender");
      const iKelas = findCol(headers, "kelas", "class", "nama kelas");

      if (iNis === -1 || iNama === -1) {
        setParseError(
          "Kolom NIS dan NAMA wajib ada. Pastikan baris header sesuai format.",
        );
        return;
      }

      const parsed: ParsedRow[] = [];
      for (let i = headerRowIdx + 1; i < raw.length; i++) {
        const r = raw[i];
        const nis = String(r[iNis] ?? "").trim();
        const name = String(r[iNama] ?? "").trim();
        if (!nis && !name) continue; // skip baris kosong
        parsed.push({
          nis,
          nisn: iNisn !== -1 ? String(r[iNisn] ?? "").trim() : "",
          name,
          gender:
            iJk !== -1
              ? String(r[iJk] ?? "")
                  .trim()
                  .toUpperCase()
              : "",
          className: iKelas !== -1 ? String(r[iKelas] ?? "").trim() : "",
        });
      }

      if (parsed.length === 0) {
        setParseError("Tidak ada baris data yang valid setelah header.");
        return;
      }

      setRows(parsed);
    } catch (e) {
      setParseError(
        "Gagal membaca file. Pastikan format Excel (.xlsx / .xls) benar.",
      );
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: rows }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setParseError("Terjadi kesalahan saat mengimpor data.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-green-600" size={22} />
            <h2 className="text-lg font-semibold text-gray-900">
              Import Siswa dari Excel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Format info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">Format kolom yang didukung:</p>
            <p className="font-mono text-xs bg-white border border-blue-100 rounded px-2 py-1 inline-block">
              NO &nbsp;|&nbsp; NIS &nbsp;|&nbsp; NISN &nbsp;|&nbsp; NAMA
              &nbsp;|&nbsp; JK &nbsp;|&nbsp; KELAS
            </p>
            <p className="mt-2 text-xs text-blue-600">
              • Status pembayaran otomatis diset <strong>Nunggak</strong>
              <br />
              • Nama kelas harus sesuai dengan kelas yang sudah dibuat di
              Pengaturan
              <br />• Baris yang NIS-nya sudah ada akan dilewati
            </p>
          </div>

          {/* File picker */}
          {!result && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 hover:bg-green-50 cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {fileName ? (
                  <p className="text-sm font-medium text-gray-700">
                    {fileName}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Klik untuk memilih file Excel (.xlsx / .xls)
                  </p>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {parseError}
            </div>
          )}

          {/* Info jumlah data siap import */}
          {rows.length > 0 && !result && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <CheckCircle size={16} className="shrink-0" />
              <span>
                <span className="font-semibold">{rows.length} data siswa</span>{" "}
                siap diimport
              </span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">
                    {result.success}
                  </p>
                  <p className="text-xs text-green-600">Berhasil diimport</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-600">
                    {result.failed}
                  </p>
                  <p className="text-xs text-red-500">Gagal</p>
                </div>
              </div>

              {/* Error detail */}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Detail error:
                  </p>
                  <div className="rounded-lg border border-red-200 overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="text-left py-2 px-3 text-red-700">
                            Baris
                          </th>
                          <th className="text-left py-2 px-3 text-red-700">
                            NIS
                          </th>
                          <th className="text-left py-2 px-3 text-red-700">
                            Alasan
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((e, i) => (
                          <tr key={i} className="border-t border-red-100">
                            <td className="py-1.5 px-3 text-gray-600">
                              {e.row}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-gray-700">
                              {e.nis}
                            </td>
                            <td className="py-1.5 px-3 text-red-600">
                              {e.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
          {!result ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleImport}
                disabled={rows.length === 0 || importing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {importing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Mengimpor...
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    Import {rows.length > 0 ? `${rows.length} Siswa` : ""}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setResult(null);
                  setRows([]);
                  setFileName("");
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Import Lagi
              </button>
              <button
                onClick={() => {
                  onDone();
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Selesai
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
