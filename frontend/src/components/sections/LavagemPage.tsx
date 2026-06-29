import { useState } from 'react'
import { Send, Droplets } from 'lucide-react'
import { useCreateLavagem } from '@/hooks/useLavagem'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import { fmtMoney } from './TabletPage'

export default function LavagemPage() {
  const { addToast } = useUIStore()
  const { user } = useAuthStore()
  const podeLavar = canEditArea(user, 'lavagem')
  const createMut = useCreateLavagem()

  const [familia, setFamilia] = useState('')
  const [sujo, setSujo] = useState<number | ''>('')
  const [limpo, setLimpo] = useState<number | ''>('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [observacoes, setObservacoes] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!familia.trim()) { addToast('error', 'Informe a família.'); return }
    if (sujo === '' || Number(sujo) < 0) { addToast('error', 'Informe o dinheiro sujo.'); return }
    if (limpo === '' || Number(limpo) < 0) { addToast('error', 'Informe o dinheiro limpo.'); return }
    try {
      await createMut.mutateAsync({ data, familia: familia.trim(), dinheiroSujo: Number(sujo), dinheiroLimpo: Number(limpo), observacoes: observacoes.trim() })
      addToast('success', 'Lavagem registrada!')
      setSujo(''); setLimpo(''); setObservacoes('')
    } catch (err: any) {
      addToast('error', err?.response?.data?.error || 'Erro ao registrar lavagem.')
    }
  }

  const taxa = sujo !== '' && limpo !== '' ? Number(sujo) - Number(limpo) : null

  if (!podeLavar) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <GlowCard><div className="p-8 text-center">
          <p className="font-orbitron text-sm text-gold tracking-widest mb-2">SOMENTE LEITURA</p>
          <p className="font-mono text-xs text-txt2">Sua conta não tem permissão para registrar lavagens.</p>
        </div></GlowCard>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <GlowCard>
        <div className="p-6">
          <h2 className="font-orbitron text-sm font-bold text-gold tracking-wider mb-5 flex items-center gap-2">
            <Droplets size={16} /> REGISTRAR LAVAGEM
          </h2>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">FAMÍLIA</label>
              <input value={familia} onChange={e => setFamilia(e.target.value)} placeholder="Nome da família"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt placeholder-txt3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">DINHEIRO SUJO (R$)</label>
                <input type="number" min={0} value={sujo} onChange={e => setSujo(e.target.value ? Number(e.target.value) : '')}
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
              </div>
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">DINHEIRO LIMPO (R$)</label>
                <input type="number" min={0} value={limpo} onChange={e => setLimpo(e.target.value ? Number(e.target.value) : '')}
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
              </div>
            </div>

            {taxa !== null && (
              <p className="font-mono text-xs text-txt3">
                Diferença (taxa): <span className="text-gold">{fmtMoney(taxa)}</span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">DATA</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)}
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt" />
              </div>
              <div>
                <label className="font-mono text-xs text-txt2 tracking-wider block mb-1.5">OBSERVAÇÃO</label>
                <input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="opcional"
                  className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt placeholder-txt3" />
              </div>
            </div>

            <HudButton type="submit" loading={createMut.isPending} size="lg" className="w-full justify-center">
              <Send size={16} className="inline mr-2" /> REGISTRAR
            </HudButton>
          </form>
        </div>
      </GlowCard>
    </div>
  )
}
