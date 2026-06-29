import { useState } from 'react'
import {
  Image, List, Radio, Users,
  Plus, Trash2, Archive, KeyRound,
} from 'lucide-react'
import {
  useQrus, useAddQru, useDeleteQru,
  usePatentes, useAddPatente, useDeletePatente,
  useBauItens, useAddBauItem, useDeleteBauItem,
  useLogo,
} from '@/hooks/useConfig'
import { useContas, useCreateConta, useUpdateConta, useDeleteConta } from '@/hooks/useContas'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { AREAS, emptyPermissoes, canEdit as canEditArea } from '@/lib/permissions'
import GlowCard from '@/components/ui/GlowCard'
import HudButton from '@/components/ui/HudButton'
import ModalOverlay from '@/components/ui/ModalOverlay'
import LogoUploader from '@/components/ui/LogoUploader'
import type { Conta, Permissoes } from '@/types'

const TABS = [
  { id: 'logo',     label: 'Logo',         icon: Image },
  { id: 'patentes', label: 'Hierarquia',   icon: List },
  { id: 'qrus',     label: 'Ações',        icon: Radio },
  { id: 'bau',      label: 'Itens do Baú', icon: Archive },
  { id: 'contas',   label: 'Contas',       icon: Users },
] as const

function ListEditor({
  items, onAdd, onDelete, placeholder, canEdit,
}: {
  items: string[]; onAdd: (v: string) => void; onDelete: (v: string) => void
  placeholder: string; canEdit: boolean
}) {
  const [val, setVal] = useState('')
  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex gap-2">
          <input
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') } }}
            placeholder={placeholder}
            className="input-gold flex-1 bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt"
          />
          <HudButton size="sm" onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') } }}>
            <Plus size={14} />
          </HudButton>
        </div>
      )}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {items.map(item => (
          <div key={item} className="flex items-center justify-between px-3 py-2 bg-card2 border border-bdr rounded group">
            <span className="font-mono text-xs text-txt">{item}</span>
            {canEdit && (
              <button onClick={() => onDelete(item)} className="opacity-0 group-hover:opacity-100 text-txt3 hover:text-red transition-all">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="font-mono text-xs text-txt3 text-center py-4">Nenhum item cadastrado</p>
        )}
      </div>
    </div>
  )
}

function PermissoesEditor({ value, onChange, disabled }: {
  value: Permissoes; onChange: (p: Permissoes) => void; disabled?: boolean
}) {
  function set(area: string, campo: 'ver' | 'editar', v: boolean) {
    const cur = value[area] ?? { ver: false, editar: false }
    const next = { ...cur, [campo]: v }
    if (campo === 'editar' && v) next.ver = true   // editar implica ver
    if (campo === 'ver' && !v) next.editar = false // sem ver, sem editar
    onChange({ ...value, [area]: next })
  }
  return (
    <div className="border border-bdr rounded overflow-hidden">
      <div className="grid grid-cols-[1fr_56px_56px] items-center px-3 py-2 bg-card2 font-mono text-[10px] text-txt3 tracking-wider">
        <span>ÁREA</span>
        <span className="text-center">VER</span>
        <span className="text-center">EDITAR</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {AREAS.map(a => {
          const perm = value[a.id] ?? { ver: false, editar: false }
          return (
            <div key={a.id} className="grid grid-cols-[1fr_56px_56px] items-center px-3 py-1.5 border-t border-bdr/60">
              <span className="font-mono text-xs text-txt">{a.label}</span>
              <input type="checkbox" disabled={disabled} checked={perm.ver}
                onChange={e => set(a.id, 'ver', e.target.checked)}
                className="accent-gold w-4 h-4 justify-self-center" />
              <input type="checkbox" disabled={disabled} checked={perm.editar}
                onChange={e => set(a.id, 'editar', e.target.checked)}
                className="accent-gold w-4 h-4 justify-self-center" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const [activeTab, setActiveTab] = useState('logo')

  const canEditConfig = canEditArea(user, 'configuracoes')

  const { data: qrus = [] } = useQrus()
  const addQru = useAddQru()
  const deleteQru = useDeleteQru()

  const { data: patentes = [] } = usePatentes()
  const addPatente = useAddPatente()
  const deletePatente = useDeletePatente()

  const { data: bauItens = [] } = useBauItens()
  const addBauItem = useAddBauItem()
  const deleteBauItem = useDeleteBauItem()

  const { data: logoData } = useLogo()

  const { data: contas = [] } = useContas()
  const createConta = useCreateConta()
  const updateConta = useUpdateConta()
  const deleteConta = useDeleteConta()

  // Nova conta
  const [novaContaModal, setNovaContaModal] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [novaPerm, setNovaPerm] = useState<Permissoes>(emptyPermissoes())

  // Editar permissões de conta existente
  const [editConta, setEditConta] = useState<Conta | null>(null)
  const [editPerm, setEditPerm] = useState<Permissoes>(emptyPermissoes())

  function abrirEdit(conta: Conta) {
    setEditConta(conta)
    setEditPerm({ ...emptyPermissoes(), ...conta.permissoes })
  }

  function onError(err: unknown, fallback: string) {
    const data = (err as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data
    addToast('error', data?.details?.length ? data.details.join(' | ') : (data?.error ?? fallback))
  }

  return (
    <div className="p-6 space-y-4">
      {/* Tabs */}
      <GlowCard>
        <div className="p-3 flex gap-1 flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono transition-all ${
                  activeTab === tab.id
                    ? 'bg-bdrg text-gold border border-gold/30'
                    : 'text-txt2 hover:bg-bdr hover:text-txt border border-transparent'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </GlowCard>

      {/* Conteúdo */}
      <GlowCard>
        <div className="p-6">
          {!canEditConfig && (
            <p className="font-mono text-[10px] text-txt3 mb-4">Modo somente leitura — você não tem permissão de editar Configurações.</p>
          )}

          {activeTab === 'logo' && <LogoUploader currentLogo={logoData?.logo ?? ''} />}

          {activeTab === 'patentes' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">HIERARQUIA</h3>
              <ListEditor items={patentes} onAdd={v => addPatente.mutate(v)} onDelete={v => deletePatente.mutate(v)} placeholder="Nova hierarquia..." canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'qrus' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">GERENCIAR AÇÕES</h3>
              <ListEditor items={qrus} onAdd={v => addQru.mutate(v)} onDelete={v => deleteQru.mutate(v)} placeholder="Nova ação..." canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'bau' && (
            <div>
              <h3 className="font-orbitron text-xs text-gold tracking-wider mb-4">ITENS DO BAÚ</h3>
              <ListEditor items={bauItens} onAdd={v => addBauItem.mutate(v)} onDelete={v => deleteBauItem.mutate(v)} placeholder="Novo item..." canEdit={canEditConfig} />
            </div>
          )}

          {activeTab === 'contas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron text-xs text-gold tracking-wider">CONTAS DE ACESSO</h3>
                {canEditConfig && (
                  <HudButton size="sm" onClick={() => { setForm({ username: '', password: '' }); setNovaPerm(emptyPermissoes()); setNovaContaModal(true) }}>
                    <Plus size={14} className="inline mr-1.5" /> Nova Conta
                  </HudButton>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bdr">
                    {['Usuário', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left font-mono text-xs text-txt3 px-3 py-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contas.map(conta => (
                    <tr key={conta.id} className="border-b border-bdr/50 hover:bg-bdr/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-txt">{conta.username}</td>
                      <td className="px-3 py-2.5">
                        <button
                          disabled={!canEditConfig}
                          onClick={() => updateConta.mutate({ id: conta.id, ativo: !conta.ativo }, { onError: e => onError(e, 'Erro ao alterar status.') })}
                          className={`font-mono text-xs px-2 py-0.5 rounded border disabled:opacity-50 disabled:cursor-default ${
                            conta.ativo ? 'border-green/40 text-green bg-green/10' : 'border-red/40 text-red bg-red/10'
                          }`}
                        >
                          {conta.ativo ? '● Ativo' : '○ Inativo'}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        {canEditConfig && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => abrirEdit(conta)} title="Permissões"
                              className="text-txt3 hover:text-gold transition-colors flex items-center gap-1 font-mono text-xs">
                              <KeyRound size={14} /> Permissões
                            </button>
                            {conta.id !== user?.contaId && (
                              <button onClick={() => { if (confirm('Excluir esta conta?')) deleteConta.mutate(conta.id, { onError: e => onError(e, 'Erro ao excluir.') }) }}
                                className="text-txt3 hover:text-red transition-colors">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </GlowCard>

      {/* Modal Nova Conta */}
      <ModalOverlay open={novaContaModal} onClose={() => setNovaContaModal(false)} title="NOVA CONTA" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">USUÁRIO</label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="min. 2 — letras, números, _ . -"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt placeholder:text-txt3" />
            </div>
            <div>
              <label className="font-mono text-xs text-txt2 block mb-1">SENHA</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="min. 4 caracteres"
                className="input-gold w-full bg-card2 border border-bdr2 rounded px-3 py-2 text-sm font-mono text-txt placeholder:text-txt3" />
            </div>
          </div>
          <div>
            <label className="font-mono text-xs text-txt2 block mb-2">PERMISSÕES</label>
            <PermissoesEditor value={novaPerm} onChange={setNovaPerm} />
          </div>
          <div className="flex gap-3 pt-2">
            <HudButton
              loading={createConta.isPending}
              onClick={() => {
                if (!form.username || !form.password) { addToast('error', 'Preencha usuário e senha.'); return }
                createConta.mutate({ username: form.username, password: form.password, permissoes: novaPerm }, {
                  onSuccess: () => { addToast('success', 'Conta criada!'); setNovaContaModal(false) },
                  onError: e => onError(e, 'Erro ao criar conta.'),
                })
              }}
              className="flex-1"
            >
              CRIAR CONTA
            </HudButton>
            <HudButton variant="ghost" onClick={() => setNovaContaModal(false)} className="flex-1">CANCELAR</HudButton>
          </div>
        </div>
      </ModalOverlay>

      {/* Modal Editar Permissões */}
      <ModalOverlay open={!!editConta} onClose={() => setEditConta(null)} title={`PERMISSÕES — ${editConta?.username ?? ''}`} maxWidth="max-w-lg">
        <div className="space-y-4">
          <PermissoesEditor value={editPerm} onChange={setEditPerm} />
          <div className="flex gap-3 pt-2">
            <HudButton
              loading={updateConta.isPending}
              onClick={() => {
                if (!editConta) return
                updateConta.mutate({ id: editConta.id, permissoes: editPerm }, {
                  onSuccess: () => { addToast('success', 'Permissões atualizadas!'); setEditConta(null) },
                  onError: e => onError(e, 'Erro ao salvar permissões.'),
                })
              }}
              className="flex-1"
            >
              SALVAR
            </HudButton>
            <HudButton variant="ghost" onClick={() => setEditConta(null)} className="flex-1">CANCELAR</HudButton>
          </div>
        </div>
      </ModalOverlay>
    </div>
  )
}
