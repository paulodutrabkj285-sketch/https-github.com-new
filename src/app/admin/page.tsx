"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  function entrar() {
    if (usuario === "admin" && senha === "parquemundonovo123") {
      localStorage.setItem("admin-logado", "true");
      router.push("/admin/dashboard");
      return;
    }

    setErro("Usuário ou senha inválidos.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef3ed] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <img
          src="/logo-final.png"
          alt="Parque Mundo Novo"
          className="mx-auto mb-5 w-28 rounded-2xl"
        />

        <h1 className="text-center text-3xl font-bold text-[#166534]">
          Área Administrativa
        </h1>

        <div className="mt-8 grid gap-4">
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuário"
            className="w-full rounded-xl border border-gray-300 px-4 py-4"
          />

          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-xl border border-gray-300 px-4 py-4"
          />

          {erro && (
            <p className="rounded-xl bg-red-100 p-3 text-red-700">{erro}</p>
          )}

          <button
            onClick={entrar}
            className="rounded-xl bg-[#166534] px-5 py-4 font-bold text-white"
          >
            Entrar
          </button>
        </div>
      </div>
    </main>
  );
}