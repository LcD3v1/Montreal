import { useState } from 'react'
import { Plus, Trash2, Check, X, Pencil, EyeOff, Eye } from 'lucide-react'
import {
  useMunicaoTipos, useCreateMunicaoTipo, useUpdateMunicaoTipo, useDeleteMunicaoTipo,
} from '@/hooks/useVendas'
import { useUIStore } from '@/store/uiStore'
import { fmtMoeda } from '@/lib/money'
import HudButton from '@/components/ui/HudButton'
import type { MunicaoTipo } from '@/types'
import { PALETTE } from '@/lib/theme'

/**
 * Catálogo de arma para venda: nome + dois preços (Real e Dólar), estoque único.
 * A moeda escolhida na tela de venda decide qual preço é usado — não existe
 * arma separada por moeda nem estoque separado.
 *
 * Reajustar o preço aqui NÃO altera vendas já registradas — cada venda guarda
 * uma cópia do preço da época.
 */
export default function MunicaoTiposEditor({ canEdit }: { canEdit: boolean }) {
  const { addToast } = useUIStore()
  const { data: tipos, isLoading } = useMunicaoTipos()
  const criar = useCreateMunicaoTipo()
  const atualizar = useUpdateMunicaoTipo()
  const remover = useDeleteMunicaoTipo()

  const [nome, setNome] = useState('')
  const [precoReal, setPrecoReal] = useState('')
  const [precoDolar, setPrecoDolar] = useState('')

  const [editId, setEditId] = useState<number | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editReal, setEditReal] = useState('')
  const [editDolar, setEditDolar] = useState('')

  function onErr(e: unknown, fb: string) {
    const d = (e as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data
    addToast('error', d?.details?.length ? d.details.join(' | ') : (d?.error ?? fb))
  }

  function adicionar() {
    const r = Number(precoReal)
    const dl = Number(precoDolar)
    if (!nome.trim()) { addToast('error', 'Informe o nome da arma.'); return }
    if (!isFinite(r) || r < 0 || !isFinite(dl) || dl < 0) { addToast('error', 'Preço inválido.'); return }

    criar.mutate({ nome: nome.trim(), precoReal: r, precoDolar: dl }, {
      onSuccess: () => { addToast('success', 'Arma cadastrada!'); setNome(''); setPrecoReal(''); setPrecoDolar('') },
      onError: e => onErr(e, 'Erro ao cadastrar.'),
    })
  }

  function abrirEdicao(t: MunicaoTipo) {
    setEditId(t.id)
    setEditNome(t.nome)
    setEditReal(String(t.precoReal))
    setEditDolar(String(t.precoDolar))
  }

  function salvarEdicao() {
    const r = Number(editReal)
    const dl = Number(editDolar)
    if (!editNome.trim()) { addToast('error', 'Informe o nome da arma.'); return }
    if (!isFinite(r) || r < 0 || !isFinite(dl) || dl < 0) { addToast('error', 'Preço inválido.'); return }

    atualizar.mutate({ id: editId!, nome: editNome.trim(), precoReal: r, precoDolar: dl }, {
      onSuccess: () => { addToast('success', 'Arma atualizada!'); setEditId(null) },
      onError: e => onErr(e, 'Erro ao atualizar.'),
    })
  }

  function alternarAtivo(t: MunicaoTipo) {
    atualizar.mutate({ id: t.id, ativo: !t.ativo }, {
      onSuccess: () => addToast('success', t.ativo ? `${t.nome} desativado.` : `${t.nome} reativado.`),
      onError: e => onErr(e, 'Erro ao alterar.'),
    })
  }

  function apagar(t: MunicaoTipo) {
    if (!confirm(`Apagar "${t.nome}"?`)) return
    remover.mutate(t.id, {
      onSuccess: () => addToast('success', 'Arma removida.'),
      onError: e => onErr(e, 'Erro ao remover.'),
    })
  }

  if (isLoading) return <p className="font-mono text-xs text-txt3">Carregando...</p>

  const lista = tipos ?? []
  const inputCls = 'bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt input-gold'

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="mt-nome" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">ARMA</label>
            <input
              id="mt-nome" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: MTAR" className={inputCls + ' w-full placeholder-txt3'}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
            />
          </div>
          <div className="w-40">
            <label htmlFor="mt-real" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">PREÇO EM REAL (R$)</label>
            <input
              id="mt-real" type="number" min={0} step="1" value={precoReal}
              onChange={e => setPrecoReal(e.target.value)} placeholder="0"
              className={inputCls + ' w-full placeholder-txt3'}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
            />
          </div>
          <div className="w-40">
            <label htmlFor="mt-dolar" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">PREÇO EM DÓLAR (US$)</label>
            <input
              id="mt-dolar" type="number" min={0} step="1" value={precoDolar}
              onChange={e => setPrecoDolar(e.target.value)} placeholder="0"
              className={inputCls + ' w-full placeholder-txt3'}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
            />
          </div>
          <HudButton onClick={adicionar} disabled={criar.isPending}>
            <Plus size={14} className="inline mr-1.5" />
            {criar.isPending ? 'Salvando...' : 'Adicionar'}
          </HudButton>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bdr">
            {['Arma', 'Preço em Real', 'Preço em Dólar', 'Status', ''].map(h => (
              <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-10 font-mono text-xs text-txt3">
                Nenhuma arma cadastrada.
              </td>
            </tr>
          ) : lista.map(t => (
            <tr key={t.id} className="border-b border-bdr/50 hover:bg-bdr/30 transition-colors">
              {editId === t.id ? (
                <>
                  <td className="px-3 py-2">
                    <input value={editNome} onChange={e => setEditNome(e.target.value)} className={inputCls + ' w-full'} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} value={editReal} onChange={e => setEditReal(e.target.value)} className={inputCls + ' w-32'} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} value={editDolar} onChange={e => setEditDolar(e.target.value)} className={inputCls + ' w-32'} />
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={salvarEdicao} disabled={atualizar.isPending}
                        aria-label="Salvar alterações" className="text-gold hover:text-gold2 transition-colors cursor-pointer"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        aria-label="Cancelar edição" className="text-txt3 hover:text-txt transition-colors cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-3 py-3 font-mono text-xs font-bold" style={{ color: t.ativo ? PALETTE.TEXT : PALETTE.DIM }}>
                    {t.nome}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-txt2">{fmtMoeda(t.precoReal, 'Real')}</td>
                  <td className="px-3 py-3 font-mono text-xs text-txt2">{fmtMoeda(t.precoDolar, 'Dólar')}</td>
                  <td className="px-3 py-3">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded border"
                      style={{
                        color: t.ativo ? PALETTE.POSITIVE : PALETTE.MUTED,
                        borderColor: (t.ativo ? PALETTE.POSITIVE : PALETTE.MUTED) + '40',
                        background: (t.ativo ? PALETTE.POSITIVE : PALETTE.MUTED) + '12',
                      }}
                    >
                      {t.ativo ? 'À venda' : 'Desativado'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {canEdit && (
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => abrirEdicao(t)}
                          aria-label={`Editar ${t.nome}`} className="text-txt3 hover:text-gold transition-colors cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => alternarAtivo(t)}
                          aria-label={t.ativo ? `Desativar ${t.nome}` : `Reativar ${t.nome}`}
                          className="text-txt3 hover:text-gold transition-colors cursor-pointer"
                        >
                          {t.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => apagar(t)}
                          aria-label={`Apagar ${t.nome}`} className="text-txt3 hover:text-danger transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 border-t border-bdr2 pt-3">
        <p className="font-mono text-[10px] text-txt3">
          Cada arma tem <strong className="text-txt2">um único estoque</strong> e dois preços. A moeda escolhida na venda decide qual preço é cobrado.
        </p>
        <p className="font-mono text-[10px] text-txt3">
          Reajustar o preço não altera vendas já registradas. Tipos com histórico não podem ser apagados — use <strong className="text-txt2">desativar</strong>.
        </p>
      </div>
    </div>
  )
}
