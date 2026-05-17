"use client";

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro("");

    if (!email.includes("@")) {
      setErro("Digite o e-mail cadastrado no Firebase. Não use apenas admin.");
      return;
    }

    if (!senha) {
      setErro("Digite a senha.");
      return;
    }

    try {
      setCarregando(true);

      await signInWithEmailAndPassword(auth, email.trim(), senha);

      router.push("/admin/dashboard");
    } catch (error) {
      console.error("ERRO FIREBASE LOGIN:", error);
      setErro("E-mail ou senha do Firebase inválidos.");
    } finally {
      setCarregando(false);
    }
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
          Login Firebase Admin
        </h1>

        <p className="mt-2 text-center text-gray-500">
          Use o e-mail cadastrado em Authentication no Firebase.
        </p>

        <div className="mt-8 grid gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail do Firebase"
            className="w-full rounded-xl border border-gray-300 px-4 py-4 outline-none focus:border-[#166534]"
          />

          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha do Firebase"
            className="w-full rounded-xl border border-gray-300 px-4 py-4 outline-none focus:border-[#166534]"
          />

          {erro && (
            <p className="rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-700">
              {erro}
            </p>
          )}

          <button
            onClick={entrar}
            disabled={carregando}
            className="rounded-xl bg-[#166534] px-5 py-4 font-bold text-white disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar com Firebase"}
          </button>
        </div>
      </div>
    </main>
  );
}