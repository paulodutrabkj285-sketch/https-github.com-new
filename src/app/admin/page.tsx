"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const logado = localStorage.getItem("admin-logado");

    if (logado !== "true") {
      router.push("/admin");
    }
  }, [router]);

  return <>{children}</>;
}