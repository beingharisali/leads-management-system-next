"use client";
import { useState } from "react";
import http from "@/services/http";

export default function ConvertLeadModal({ leadId, onClose }: { leadId: string; onClose: () => void }) {
    const [loading, setLoading] = useState(false);

    const handleConvert = async () => {
        setLoading(true);
        try {
            await http.post(`/leads/${leadId}/convert`);
            alert("Lead converted to client successfully!");
            onClose();
        } catch (err: any) {
            alert(err.message || "Conversion failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal">
            <p>Do you want to convert this lead?</p>
            <button onClick={handleConvert} disabled={loading}>
                {loading ? "Converting..." : "Convert"}
            </button>
            <button onClick={onClose}>Cancel</button>
        </div>
    );
}
