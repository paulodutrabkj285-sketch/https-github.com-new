'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { auth } from '@/lib/firebase';

type Resultado = { pedidoId: string; codigoIngresso: string; codigoIngressoParque?: string;
  codigoIngressoElevador?: string; emailEnviado: boolean; aviso?: string };

export default function EmitirCortesiaPage() {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const tentativa = useRef<{ dados: string; chave: string } | null>(null);

  async function emitir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ocupado || resultado) return;
    const form = new FormData(event.currentTarget);
    const dados = { nome: form.get('nome'), email: form.get('email'), dataVisita: form.get('dataVisita'),
      quantidade: Number(form.get('quantidade')), parque: form.has('parque'), elevador: form.has('elevador') };
    if (!dados.parque && !dados.elevador) { setErro('Selecione pelo menos uma atração.'); return; }
    const serializado = JSON.stringify(dados);
    if (tentativa.current?.dados !== serializado) tentativa.current = { dados: serializado, chave: crypto.randomUUID() };
    setOcupado(true); setErro('');
    try {
      const usuario = auth.currentUser;
      if (!usuario) throw new Error('Entre novamente no painel administrativo.');
      const resposta = await fetch('/api/admin/emitir-acessos', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await usuario.getIdToken()}` },
        body: JSON.stringify({ ...dados, chaveIdempotencia: tentativa.current.chave }) });
      const retorno = await resposta.json();
      if (!resposta.ok) throw new Error(retorno.erro || 'Falha ao emitir cortesia.');
      setResultado(retorno);
    } catch (error) { setErro(error instanceof Error ? error.message : 'Falha ao emitir.'); }
    finally { setOcupado(false); }
  }

  const campo = 'w-full rounded-xl border border-gray-300 p-3';
  return <main className="min-h-screen bg-[#eef3ed] px-4 py-8"><div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow">
    <Link href="/admin/dashboard" className="text-green-800 underline">Voltar ao painel</Link>
    <h1 className="mt-5 text-3xl font-bold text-green-800">Emitir cortesia</h1>
    <p className="my-4 text-gray-600">Emissão gratuita, sem cobrança. Cada atração terá seu próprio ingresso.</p>
    {resultado ? <div role="status" className="space-y-3">
      <p className="font-bold text-green-800">Cortesia emitida!</p><p>Pedido: {resultado.pedidoId}</p>
      <p>Parque: {resultado.codigoIngressoParque || 'Não selecionado'}</p>
      <p>Elevador: {resultado.codigoIngressoElevador || 'Não selecionado'}</p>
      <p>{resultado.emailEnviado ? 'Ingressos enviados por e-mail.' : 'E-mail não enviado.'}</p>
      {resultado.aviso && <p>{resultado.aviso}</p>}
      <p>Os PDFs também estão disponíveis em Envio de Ingressos no painel.</p>
      <button className="rounded-xl bg-green-800 p-3 text-white" onClick={() => { tentativa.current = null; setResultado(null); }}>Emitir outra cortesia</button>
    </div> : <form onSubmit={emitir} className="space-y-4">
      <fieldset disabled={ocupado} className="space-y-4 disabled:opacity-60">
        <label className="block">Nome do visitante<input name="nome" required maxLength={200} className={campo} /></label>
        <label className="block">E-mail (opcional)<input name="email" type="email" className={campo} /></label>
        <label className="block">Data da visita<input name="dataVisita" type="date" required className={campo} /></label>
        <label className="block">Quantidade de pessoas<input name="quantidade" type="number" min={1} max={1000} defaultValue={1} required className={campo} /></label>
        <label className="block"><input name="parque" type="checkbox" /> Parque</label>
        <label className="block"><input name="elevador" type="checkbox" /> Elevador Panorâmico</label>
        <button className="w-full rounded-xl bg-green-800 p-4 font-bold text-white">{ocupado ? 'Emitindo...' : 'Emitir cortesia'}</button>
      </fieldset>
      {erro && <p role="alert" className="text-red-700">{erro}</p>}
    </form>}
  </div></main>;
}
