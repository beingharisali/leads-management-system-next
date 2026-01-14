// components/ConvertLeadModal.tsx
"use client";
import { useState } from "react";
import axios from "../services/axios";

interface ConvertLeadModalProps {
    leadId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ConvertLeadModal({ leadId, onClose, onSuccess }: ConvertLeadModalProps) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || Number(amount) < 1) return alert("Enter valid amount");
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`/api/v1/sale/convert-lead/${leadId}`, { amount }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data.message);
            onSuccess();
        } catch (err: any) {
            alert(err.response?.data?.msg || "Error converting lead");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <h3>Convert Lead to Sale</h3>
                <form onSubmit={handleSubmit}>
                    <label>Sale Amount</label>
                    <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    <div className="modal-buttons">
                        <button type="submit" disabled={loading}>{loading ? "Processing..." : "Convert"}</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
