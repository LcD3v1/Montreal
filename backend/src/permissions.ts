import { Permissoes } from './types'

// Áreas do sistema (correspondem aos itens da sidebar)
export const AREA_IDS = [
  'dashboard',
  'comunicados',
  'registrar',
  'historico',
  'estatisticas',
  'membros',
  'ausencias',
  'bau',
  'historicoBau',
  'estoque',
  'tablet',
  'historicoTablet',
  'lavagem',
  'historicoLavagem',
  'configuracoes',
] as const

export type AreaId = typeof AREA_IDS[number]

export function fullPermissoes(): Permissoes {
  const p: Permissoes = {}
  for (const a of AREA_IDS) p[a] = { ver: true, editar: true }
  return p
}

export function emptyPermissoes(): Permissoes {
  const p: Permissoes = {}
  for (const a of AREA_IDS) p[a] = { ver: false, editar: false }
  return p
}

// Normaliza um objeto de permissões recebido (garante todas as áreas e booleanos)
export function normalizePermissoes(input: unknown): Permissoes {
  const base = emptyPermissoes()
  if (input && typeof input === 'object') {
    for (const a of AREA_IDS) {
      const v = (input as Record<string, { ver?: unknown; editar?: unknown }>)[a]
      if (v && typeof v === 'object') {
        base[a] = { ver: !!v.ver || !!v.editar, editar: !!v.editar }
      }
    }
  }
  return base
}

// Migração de contas antigas (nivel) para permissões por área
export function permissoesFromNivel(nivel?: string): Permissoes {
  if (nivel === 'admin') return fullPermissoes()
  const p = emptyPermissoes()
  if (nivel === 'view_only') {
    for (const a of AREA_IDS) if (a !== 'configuracoes') p[a].ver = true
    return p
  }
  // moderador / membro / desconhecido → vê e edita tudo, menos Configurações
  for (const a of AREA_IDS) {
    if (a === 'configuracoes') continue
    p[a] = { ver: true, editar: nivel !== undefined }
  }
  return p
}

// Garante que todas as áreas existam na conta. Áreas novas (ainda não presentes)
// recebem acesso total se a conta for admin de Configurações; senão, ficam bloqueadas.
export function ensureAllAreas(p: Permissoes | undefined, grantNew: boolean): Permissoes {
  const base = p ?? {}
  const out: Permissoes = {}
  for (const a of AREA_IDS) {
    out[a] = base[a] ?? (grantNew ? { ver: true, editar: true } : { ver: false, editar: false })
  }
  return out
}

// Quantas contas ativas podem gerenciar Configurações (trava anti-lockout)
export function countConfigAdmins(contas: { ativo: boolean; permissoes?: Permissoes }[]): number {
  return contas.filter(c => c.ativo && c.permissoes?.configuracoes?.editar).length
}
