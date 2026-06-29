import { useState } from 'react'
import { Send, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react'
import { useCreateTabletMovimento, useTabletSaldo } from '@/hooks/useTablet'
import { useMembros } from '@/hooks/useMembros'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import type { Membro, TipoMovimentoTablet } from '@/types'

export const fmtMoney = (n: number) => 'R$ ' + (n ?? 0).toLocaleString('pt-BR')

export default function TabletPage() {
  const { addToast } = useUIStore()
  const { user } = useAuthStore()
  const podeMovimentar = canEditArea(user, 'tablet')
  const { data: membros } = useMembros()
  const { data: saldo } = useTabletSaldo()
  const createMov = useCreateTabletMovimento()

  const [tipo, setTipo] = useState<TipoMovimentoTablet>('deposito')
  const [membroId, setMembroId] = useState<number | ''>('')
  const [valor, setValor] = useState<number | ''>('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [observacoes, setObservacoes] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!membroId) { addToast('error', 'Selecione um membro.'); return }
    if (!valor || valor < 1) { addToast('error', 'Informe o valor.'); return }
    try {
      await createMov.mutateAsync({ tipo, membroId: Number(membroId), valor: Number(valor), data, observacoes: observacoes.trim() })
      addToast('success', `${tipo === 'deposito' ? 'Depósito' : 'Saque'} registrado!`)
      setValor(''); setObservacoes('')
    } catch (err: any) {
      addToast('error', err?.response?.data?.error || 'Erro ao registrar movimentação.')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      {/* Saldo */}
      <GlowCard>
        <div className="p-5 flex items-center gap-4">
          <Wallet size={22} className="text-gold shrink-0" />
          <div>
            <p className="font-mono text-[10px] text-txt2 tracking-wider">SALDO DO TABLET</p>
            <p className="font-orbitron text-2xl font-bold text-txt">{fmtMoney(saldo?.saldo ?? 0)}</p>
          </div>
          <div className="ml-auto text-right font-mono text-[10px] text-txt3 leading-relaxed">
            <div>Depósitos: <span className="text-green">{fmtMoney(saldo?.depositos ?? 0)}</span></div>
            <div>Saques: <span className="text-red">{fmtMoney(saldo?.saques ?? 0)}</span></div>
          </div>
        </div>
      </GlowCard>

      {!podeMovimentar ? (
        <GlowCard>
          <div className="p-8 text-center">
            <p className="font-orbitron text-sm text-gold tracking-widest mb-2">SOMENTE LEITURA</p>
            <p className="font-mono text-xs text-txt2">Sua conta não tem permissão para movimentar o tablet.</p>
          </div>
        </GlowCard>
      ) : (
        <GlowCard>
          <div className="p-6">
            <h2 className="font-orbitron text-sm font-bold text-gold tracking-wider mb-5">REGISTRAR MOVIMENTAÇÃO</h2>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="flex gap-3">
                <button type="button" onClick={() => setTipo('deposito')}
                  className={`flex-1 py-3 border rounded font-orbitron text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
                    tipo === 'deposito' ? 'border-green text-green bg-green/10' : 'border-bdr text-txt3'}`}>
                  <ArrowDownCircle size={15} /> DEPÓSITO
                </button>
                <button type="button" onClick={() => setTipo('saque')}
                  className={`flex-1 py-3 border rounded font-orbitron text-xs tracking-wider flex items-center justify-center gap-2 transition-all ${
                    tipo === 'saque' ? 'border-red text-red bg-red/10' : 'border-bdr text-txt3'}`}>
                  <ArrowUpCircle size={15} /> SAQUE
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">MEMBRO</label>
                  <select value={membroId} onChange={e => setMembroId(e.target.value ? Number(e.target.value) : '')}
                    className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt">
                    <option value="">Selecione...</option>
                    {(membros ?? []).map((m: Membro) => <option key={m.id} value={m.id}>{m.policial}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">VALOR (R$)</label>
                  <input type="number" min={1} value={valor}
                    onChange={e => setValor(e.target.value ? Number(e.target.value) : '')}
                    className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
                </div>
                <div>
                  <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">DATA</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)}
                    className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
                </div>
                <div>
                  <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">OBSERVAÇÃO</label>
                  <input value={observacoes} onChange={e => setObservacoes(e.target.value)}
                    placeholder="opcional"
                    className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt placeholder-txt3" />
                </div>
              </div>

              <HudButton type="submit" loading={createMov.isPending} size="lg" className="w-full justify-center">
                <Send size={16} className="inline mr-2" /> REGISTRAR
              </HudButton>
            </form>
          </div>
        </GlowCard>
      )}
    </div>
  )
}
