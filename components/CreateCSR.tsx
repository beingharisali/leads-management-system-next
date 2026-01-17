"use client";
import { useState } from "react";
import { registerCSR } from "@/services/auth.api";

export default function CreateCSR() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await registerCSR(name, email, password);
            setMsg(`CSR "${res.user.name}" created successfully!`);
            setName(""); setEmail(""); setPassword("");
        } catch (err: any) {
            setMsg(err.response?.data?.msg || "Error creating CSR");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded shadow">
            <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required className="input" />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="input" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="input" />
            <button type="submit" className="btn w-full">Create CSR</button>
            {msg && <p className="text-green-500 mt-2">{msg}</p>}
        </form>
    );
}
