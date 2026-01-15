"use client";

import { useState } from "react";
import Modal from "./modal";
import axios from "@/services/axios";

interface ConvertLeadModalProps {
    leadId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ConvertLeadModal({ leadId, onClose, onSuccess }: ConvertLeadModalProps) {
    const [amount, setAmount] = useState<number | "">(""); // ✅ number or empty string
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");

    const handleConvert = async () => {
        if (!amount && amount !== 0) {
            setError("Amount is required");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `/api/v1/sales/convert/${leadId}`,
                { amount: Number(amount) }, // ✅ ensure number type sent
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onSuccess();
            onClose(); // ✅ close modal after success
        } catch (err: any) {
            console.error("Conversion error:", err);
            setError(err.response?.data?.message || "Conversion failed"); // ✅ show API error
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Convert Lead to Sale">
            {error && <p className="text-red-500 mb-2">{error}</p>}

            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Enter sale amount"
                className="border p-2 rounded w-full mb-4"
            />

            <button
                onClick={handleConvert}
                disabled={loading}
                className="px-4 py-2 bg-black text-white rounded w-full hover:bg-gray-800 disabled:opacity-50"
            >
                {loading ? "Converting..." : "Convert"}
            </button>
        </Modal>
    );
}
