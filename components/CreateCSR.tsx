"use client";
import { useState } from "react";
import { createCSR } from "@/services/auth.api";

export default function CreateCSR() {
  const [csrData, setCSRData] = useState({
    name: "",
    email: "",
    password: "",
  });
  //   const [name, setName] = useState("");
  //   const [email, setEmail] = useState("");
  //   const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createCSR(csrData);
      setMsg(`CSR "${res.user.name}" created successfully!`);
      setCSRData({
        name: "",
        email: "",
        password: "",
      });
    } catch (err: any) {
      setMsg(err.response?.data?.msg || "Error creating CSR");
    }
  };
  function changeHandler(e: any) {
    const name = e.target.name;
    const value = e.target.value;
    setCSRData({ ...csrData, [name]: value });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-white rounded shadow"
    >
      <input
        type="text"
        placeholder="Name"
        value={csrData.name}
        onChange={changeHandler}
        required
        className="input"
      />
      <input
        type="email"
        placeholder="Email"
        value={csrData.email}
        onChange={changeHandler}
        required
        className="input"
      />
      <input
        type="password"
        placeholder="Password"
        value={csrData.password}
        onChange={changeHandler}
        required
        className="input"
      />
      <button type="submit" className="btn w-full">
        Create CSR
      </button>
      {msg && <p className="text-green-500 mt-2">{msg}</p>}
    </form>
  );
}
