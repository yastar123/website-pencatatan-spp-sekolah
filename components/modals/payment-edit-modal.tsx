"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaymentEditModalProps {
  payment: any;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PaymentEditModal({
  payment,
  onClose,
  onSaved,
}: PaymentEditModalProps) {
  const [amount, setAmount] = useState(String(payment.amount || ""));
  const [paymentMethod, setPaymentMethod] = useState(
    payment.paymentMethod || "Tunai",
  );
  const [status, setStatus] = useState(payment.status || "BERHASIL");
  const [notes, setNotes] = useState(payment.notes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(amount || "0"),
          paymentMethod,
          status,
          notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved && onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Hapus pembayaran ini?")) return;
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onSaved && onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus pembayaran");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Pembayaran</h3>
        <div className="space-y-3">
          <label className="text-sm font-medium">Nominal</label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          />

          <label className="text-sm font-medium">Metode</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option>Tunai</option>
            <option>Transfer Bank</option>
            <option>Pip</option>
            <option>Beasiswa</option>
            <option>Prestasi</option>
          </select>

          <label className="text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="BERHASIL">Berhasil</option>
            <option value="MENUNGGAK">Nunggak</option>
            <option value="PENDING">Pending</option>
          </select>

          <label className="text-sm font-medium">Catatan</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            rows={3}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={remove}
            className="px-4 py-2 bg-red-50 text-red-600 rounded"
          >
            Hapus
          </button>
          <Button onClick={onClose} variant="secondary">
            Batal
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
