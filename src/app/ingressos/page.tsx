'x
"use client";

import { useRouter } from "next/navigation";

export default function IngressosPage() {
  const router = useRouter();

  const cards = [
    {
      titulo: "Ingresso Parque",
      descricao: "Entrada para visitar o parque, trilhas, cachoeiras e mirantes.",
      preco: "R$ 60,00",
      rota: "/ingressos/parque",
      imagem: "/fotos/ingresso-parque.jpg",
    },
    {
      titulo: "Meia Entrada Idoso",
      descricao: "Valor especial mediante documento comprobatório.",
      preco: "R$ 30,00",
      rota: "/ingressos/idoso",
      imagem: "/fotos/idoso-cachoeira.jpg",
    },
    {
  
   
git status


