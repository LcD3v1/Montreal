import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useLavagens, useDeleteLavagem, useDeleteLavagensLote } from '@/hooks/useLavagem'
import { useSelection } from '@/hooks/useSelection'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import LoadingHud from '@/components/ui/LoadingHud'
import { SelectAllCheckbox, RowCheckbox, BulkDeleteBar } from '@/components/ui/SelectionControls'
import { formatDate } from '@/lib/utils'
import { fmtMoney } from '@/lib/money'
import type { LavagemRegistro } from '@/types'

function calcLucro(lavagem: LavagemRegistro) {
  const taxa = lavagem.dinheiroSujo - lavagem.dinheiroLimpo
  return Math.round(taxa * ((lavagem.lucroFamiliaPorcentagem ?? 100) / 100))
}

export default function HistoricoLavagemPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const canEdit = canEditArea(user, 'historicoLavagem')

  const { data, isLoading } = useLavagens({})
  const deleteMut = useDeleteLavagem()
  const deleteLote = useDeleteLavagensLote()

  const [fFamilia, setFFamilia] = useState('')
  const [fDe, setFDe] = useState('')
  const [fAte, setFAte] = useState('')

  const lavagens = data?.lavagens ?? []
  const familias = useMemo(() => [...new Set(lavagens.map(l => l.familia))].sort(), [lavagens])

  const filtrados = useMemo(() => lavagens.filter(l => {
    if (fFamilia && l.familia !== fFamilia) return false
    if (fDe && l.data < fDe) return false
    if (fAte && l.data > fAte) return false
    return true
  }), [lavagens, fFamilia, fDe, fAte])

  const sel = useSelection(filtrados.map(l => l.id))

  const totSujo = filtrados.reduce((s, l) => s + l.dinheiroSujo, 0)
  const totLimpo = filtrados.reduce((s, l) => s + l.dinheiroLimpo, 0)
  const totLucro = filtrados.reduce((s, l) => s + calcLucro(l), 0)

  async function handleDelete(id: number) {
    if (!confirm('Apagar este registro de lavagem?')) return
    try { await deleteMut.mutateAsync(id); addToast('success', 'Registro removido.') }
    catch { addToast('error', 'Erro ao remover.') }
  }

  async function handleDeleteLote() {
    if (!confirm(`Apagar ${sel.count} registro(s) selecionado(s)?`)) return
    try {
      await deleteLote.mutateAsync(sel.ids)
      addToast('success', `${sel.count} registro(s) removido(s).`)
      sel.clear()
    } catch {
      addToast('error', 'Erro ao remover.')
    }
  }

  const colCount = 10 + (canEdit ? 1 : 0)

  if (isLoading) return <LoadingHud />

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <GlowCard><div className="p-4"><p className="font-mono text-[10px] text-txt2 tracking-wider">DINHEIRO SUJO (total)</p><p className="font-orbitron text-lg text-red mt-1">{fmtMoney(totSujo)}</p></div></GlowCard>
        <GlowCard><div className="p-4"><p className="font-mono text-[10px] text-txt2 tracking-wider">DINHEIRO LIMPO (total)</p><p className="font-orbitron text-lg text-txt mt-1">{fmtMoney(totLimpo)}</p></div></GlowCard>
        <GlowCard><div className="p-4"><p className="font-mono text-[10px] text-txt2 tracking-wider">LUCRO (total)</p><p className="font-orbitron text-lg text-gold mt-1">{fmtMoney(totLucro)}</p></div></GlowCard>
      </div>

      {/* Filtros */}
      <GlowCard>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <select value={fFamilia} onChange={e => setFFamilia(e.target.value)} className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt">
            <option value="">Todas as famílias</option>
            {familias.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <input type="date" value={fDe} onChange={e => setFDe(e.target.value)} title="De" className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt" />
          <input type="date" value={fAte} onChange={e => setFAte(e.target.value)} title="Até" className="bg-card2 border border-bdr2 rounded px-2 py-1.5 text-xs font-mono text-txt" />
          <span className="ml-auto font-mono text-xs text-txt2">{filtrados.length} registros</span>
        </div>
      </GlowCard>

      {canEdit && (
        <BulkDeleteBar count={sel.count} onDelete={handleDeleteLote} onClear={sel.clear} isDeleting={deleteLote.isPending} label="registro(s)" />
      )}

      {/* Tabela */}
      <GlowCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {canEdit && (
                  <th className="px-4 py-3 w-10">
                    <SelectAllCheckbox checked={sel.todosMarcados} indeterminate={sel.algunsMarcados} onChange={sel.toggleTodos} />
                  </th>
                )}
                {['Data', 'Família', 'Sujo', 'Limpo', '%', 'Lucro %', 'Lucro', 'Responsável', 'Obs', ''].map(h => (
                  <th key={h} className="text-left font-mono text-xs text-txt3 tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={colCount} className="text-center py-12 font-mono text-xs text-txt3">Nenhuma lavagem encontrada</td></tr>
                ) : filtrados.map(l => (
                  <motion.tr key={l.id} layout exit={{ opacity: 0, x: 200 }} transition={{ duration: 0.25 }}
                    className={`border-b border-bdr/50 hover:bg-bdr/40 transition-colors group ${sel.isSelected(l.id) ? 'bg-red/5' : ''}`}>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <RowCheckbox checked={sel.isSelected(l.id)} onChange={() => sel.toggle(l.id)} />
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-txt">{formatDate(l.data)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt">{l.familia}</td>
                    <td className="px-4 py-3 font-mono text-xs text-red">{fmtMoney(l.dinheiroSujo)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt">{fmtMoney(l.dinheiroLimpo)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gold">{l.porcentagem != null ? `${l.porcentagem}%${l.porcentagemNome ? ` (${l.porcentagemNome})` : ''}` : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-green">{l.lucroFamiliaPorcentagem != null ? `${l.lucroFamiliaPorcentagem}%` : '100%'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt2">{fmtMoney(calcLucro(l))}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt3">{l.responsavel ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-txt3">{l.observacoes || '—'}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button onClick={() => handleDelete(l.id)} className="opacity-0 group-hover:opacity-100 text-txt3 hover:text-red transition-all p-1">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  )
}
