"use client";
import { useState } from "react";
import axios from "axios";

interface ConvertLeadModalProps {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertLeadModal({
  leadId,
  onClose,
  onSuccess,
}: ConvertLeadModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) < 1) {
      setError("Enter a valid sale amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `/api/v1/sale/convert-lead/${leadId}`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onSuccess();
      onClose();
      alert(res.data.message || "Lead converted successfully ✅");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.msg || "Error converting lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <h2 className="text-xl font-bold mb-4">Convert Lead to Sale</h2>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Sale Amount</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Convert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
