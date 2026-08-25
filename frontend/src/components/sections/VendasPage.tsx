import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Trash2, Package } from 'lucide-react'
import { useMembros } from '@/hooks/useMembros'
import { useMunicaoEstoque, useCreateVenda } from '@/hooks/useVendas'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { canEdit as canEditArea } from '@/lib/permissions'
import { fmtMoeda } from '@/lib/money'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import LoadingHud from '@/components/ui/LoadingHud'
import type { Membro, MunicaoEstoque, Moeda, PagamentoVenda } from '@/types'
import { PALETTE } from '@/lib/theme'

/** Carrinho guarda só arma + quantidade. Preço/subtotal vêm da moeda selecionada. */
interface ItemCarrinho {
  municaoId: number
  nome: string
  quantidade: number
}

const hoje = () => new Date().toISOString().slice(0, 10)

export default function VendasPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const canEdit = canEditArea(user, 'vendas')

  const { data: membros, isLoading: loadingMembros } = useMembros()
  const { data: estoque, isLoading: loadingEstoque } = useMunicaoEstoque()
  const criarVenda = useCreateVenda()

  const [membroId, setMembroId] = useState('')
  const [municaoId, setMunicaoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [familia, setFamilia] = useState('')
  const [pagamento, setPagamento] = useState<PagamentoVenda>('dinheiro')
  const [moeda, setMoeda] = useState<Moeda>('Real')
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])

  // Todo tipo ATIVO aparece na lista, mesmo sem saldo (aparece desabilitado).
  const vendaveis = useMemo(() => (estoque ?? []).filter(e => e.ativo), [estoque])
  const comEstoque = vendaveis.filter(e => e.quantidade > 0)

  /** Preço da arma na moeda selecionada. */
  function precoDe(id: number): number {
    const e = vendaveis.find(v => v.municaoId === id)
    if (!e) return 0
    return moeda === 'Dólar' ? e.precoDolar : e.precoReal
  }

  /** Saldo ainda livre (estoque total menos o que já está no carrinho). Independe da moeda. */
  function disponivelPara(id: number, base: MunicaoEstoque[] = vendaveis): number {
    const total = base.find(e => e.municaoId === id)?.quantidade ?? 0
    const noCarrinho = carrinho.filter(c => c.municaoId === id).reduce((s, c) => s + c.quantidade, 0)
    return total - noCarrinho
  }

  const totalCarrinho = carrinho.reduce((s, i) => s + precoDe(i.municaoId) * i.quantidade, 0)

  function adicionarAoCarrinho() {
    const id = Number(municaoId)
    const qtd = Number(quantidade)
    const tipo = vendaveis.find(e => e.municaoId === id)

    if (!tipo) { addToast('error', 'Selecione a arma.'); return }
    if (!Number.isInteger(qtd) || qtd <= 0) { addToast('error', 'Quantidade inválida.'); return }

    const livre = disponivelPara(id)
    if (qtd > livre) {
      addToast('error', `Só há ${livre} de ${tipo.nome} em estoque${carrinho.length > 0 ? ' (já contando o carrinho)' : ''}.`)
      return
    }

    setCarrinho(prev => {
      // Mesmo item duas vezes vira uma linha só
      const existente = prev.find(c => c.municaoId === id)
      if (existente) {
        return prev.map(c => c.municaoId === id ? { ...c, quantidade: c.quantidade + qtd } : c)
      }
      return [...prev, { municaoId: id, nome: tipo.nome, quantidade: qtd }]
    })
    setQuantidade('')
  }

  function removerDoCarrinho(id: number) {
    setCarrinho(prev => prev.filter(c => c.municaoId !== id))
  }

  function registrar() {
    if (!membroId) { addToast('error', 'Selecione quem fez a venda.'); return }
    if (carrinho.length === 0) { addToast('error', 'O carrinho está vazio.'); return }
    if (!familia.trim()) { addToast('error', 'Informe a família compradora.'); return }

    criarVenda.mutate({
      data: hoje(),
      membroId: Number(membroId),
      familia: familia.trim(),
      pagamento,
      moeda,
      itens: carrinho.map(c => ({ municaoId: c.municaoId, quantidade: c.quantidade })),
    }, {
      onSuccess: () => {
        addToast('success', 'Venda registrada como pendente!')
        setCarrinho([]); setQuantidade(''); setMunicaoId(''); setFamilia('')
      },
      onError: (e: unknown) => {
        const d = (e as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data
        addToast('error', d?.details?.length ? d.details.join(' | ') : (d?.error ?? 'Erro ao registrar a venda.'))
      },
    })
  }

  if (loadingMembros || loadingEstoque) return <LoadingHud />

  const selectCls = 'w-full bg-card2 border border-bdr2 rounded px-3 py-2.5 text-sm font-mono text-txt input-gold'

  return (
    <div className="p-6 max-w-xl mx-auto">
      <GlowCard>
        <div className="p-6 space-y-4">
          <h2 className="font-orbitron text-xl text-gold text-center tracking-wide">Nova Venda</h2>

          {!canEdit && (
            <p className="font-mono text-xs text-txt3 text-center">
              Você não tem permissão para registrar vendas.
            </p>
          )}

          {/* 1. Vendedor */}
          <div>
            <label htmlFor="v-membro" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">VENDEDOR</label>
            <select id="v-membro" value={membroId} onChange={e => setMembroId(e.target.value)} disabled={!canEdit} className={selectCls}>
              <option value="">Selecione o membro</option>
              {(membros ?? []).map((m: Membro) => (
                <option key={m.id} value={m.id}>{m.policial}</option>
              ))}
            </select>
          </div>

          {/* 2. Arma (nome + estoque; o preço aparece no carrinho conforme a moeda) */}
          <div>
            <label htmlFor="v-municao" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">ARMA</label>
            <select id="v-municao" value={municaoId} onChange={e => setMunicaoId(e.target.value)} disabled={!canEdit} className={selectCls}>
              <option value="">Selecione a arma</option>
              {vendaveis.map(e => {
                const livre = disponivelPara(e.municaoId)
                return (
                  <option key={e.municaoId} value={e.municaoId} disabled={livre <= 0}>
                    {e.nome} — {livre} em estoque{livre <= 0 && ' (sem estoque)'}
                  </option>
                )
              })}
            </select>
            {vendaveis.length === 0 ? (
              <p className="font-mono text-[10px] text-txt3 mt-1">
                Nenhuma arma cadastrada. Cadastre em Configurações → Armas p/ Venda.
              </p>
            ) : comEstoque.length === 0 && (
              <p className="font-mono text-[10px] text-txt3 mt-1">
                As armas cadastradas estão sem estoque. Dê entrada em Vendas → Estoque de Armas.
              </p>
            )}
          </div>

          {/* 3. Quantidade */}
          <div>
            <label htmlFor="v-qtd" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">QUANTIDADE</label>
            <input
              id="v-qtd" type="number" min={1} value={quantidade} disabled={!canEdit}
              onChange={e => setQuantidade(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarAoCarrinho() } }}
              placeholder="Quantidade"
              className={selectCls + ' placeholder-txt3'}
            />
          </div>

          {/* 4. Moeda — toggle que decide qual preço cadastrado usar */}
          <div>
            <label className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">MOEDA</label>
            <div className="moeda-toggle" role="group" aria-label="Moeda da venda">
              <button
                type="button" disabled={!canEdit}
                className={`moeda-opt${moeda === 'Real' ? ' active' : ''}`}
                onClick={() => setMoeda('Real')}
                aria-pressed={moeda === 'Real'}
              >
                R$ REAL
              </button>
              <button
                type="button" disabled={!canEdit}
                className={`moeda-opt${moeda === 'Dólar' ? ' active' : ''}`}
                onClick={() => setMoeda('Dólar')}
                aria-pressed={moeda === 'Dólar'}
              >
                US$ DÓLAR
              </button>
            </div>
          </div>

          <HudButton onClick={adicionarAoCarrinho} disabled={!canEdit} className="w-full">
            <Plus size={14} className="inline mr-1.5" /> Adicionar ao Carrinho
          </HudButton>

          {/* Carrinho — preços recalculam ao vivo pela moeda */}
          <div>
            {carrinho.length === 0 ? (
              <p className="font-mono text-xs text-txt2">Carrinho vazio.</p>
            ) : (
              <div className="space-y-1">
                <AnimatePresence>
                  {carrinho.map(item => {
                    const unit = precoDe(item.municaoId)
                    return (
                      <motion.div
                        key={item.municaoId}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        className="flex items-center gap-2 bg-card2 border border-bdr2 rounded px-3 py-2"
                      >
                        <Package size={13} className="text-gold shrink-0" />
                        <span className="font-mono text-xs text-txt flex-1">
                          {item.quantidade}x {item.nome}
                          <span className="text-txt3"> · {fmtMoeda(unit, moeda)}/un</span>
                        </span>
                        <span className="font-mono text-xs text-txt2">
                          {fmtMoeda(unit * item.quantidade, moeda)}
                        </span>
                        <button
                          onClick={() => removerDoCarrinho(item.municaoId)}
                          aria-label={`Remover ${item.nome} do carrinho`}
                          className="text-txt3 hover:text-danger transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                <div className="flex justify-between px-3 pt-2 border-t border-bdr2">
                  <span className="font-mono text-xs text-txt2 tracking-wider">TOTAL</span>
                  <span className="font-orbitron text-sm" style={{ color: PALETTE.ACCENT_BRIGHT }}>
                    {fmtMoeda(totalCarrinho, moeda)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Família */}
          <div>
            <label htmlFor="v-familia" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">FAMÍLIA</label>
            <input
              id="v-familia" value={familia} onChange={e => setFamilia(e.target.value)} disabled={!canEdit}
              placeholder="Família compradora" className={selectCls + ' placeholder-txt3'}
            />
          </div>

          {/* 6. Pagamento */}
          <div>
            <label htmlFor="v-pag" className="block font-mono text-[10px] text-txt3 tracking-wider mb-1">PAGAMENTO</label>
            <select
              id="v-pag" value={pagamento} disabled={!canEdit}
              onChange={e => setPagamento(e.target.value as PagamentoVenda)}
              className={selectCls}
            >
              <option value="dinheiro">Pagamento: Dinheiro</option>
              <option value="troca">Pagamento: Troca de produto</option>
            </select>
          </div>

          <HudButton
            onClick={registrar}
            disabled={!canEdit || criarVenda.isPending || carrinho.length === 0}
            className="w-full"
          >
            <ShoppingCart size={14} className="inline mr-1.5" />
            {criarVenda.isPending ? 'Registrando...' : 'Registrar Pendente'}
          </HudButton>
        </div>
      </GlowCard>
    </div>
  )
}
