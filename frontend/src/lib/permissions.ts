import type { Permissoes, AuthUser } from '@/types'

export interface AreaDef { id: string; label: string }

// Áreas do sistema (ordem usada na tela de contas)
export const AREAS: AreaDef[] = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'comunicados',  label: 'Comunicados' },
  { id: 'registrar',    label: 'Registrar Ação' },
  { id: 'historico',    label: 'Histórico' },
  { id: 'estatisticas', label: 'Estatísticas' },
  { id: 'membros',      label: 'Membros' },
  { id: 'ausencias',    label: 'Ausências' },
  { id: 'bau',          label: 'Baú' },
  { id: 'historicoBau', label: 'Histórico Baú' },
  { id: 'estoque',      label: 'Estoque' },
  { id: 'tablet',         label: 'Tablet (Saque/Depósito)' },
  { id: 'historicoTablet', label: 'Histórico Tablet' },
  { id: 'lavagem',          label: 'Lavagem' },
  { id: 'historicoLavagem', label: 'Histórico Lavagem' },
  { id: 'configuracoes', label: 'Configurações' },
]

export function emptyPermissoes(): Permissoes {
  const p: Permissoes = {}
  for (const a of AREAS) p[a.id] = { ver: false, editar: false }
  return p
}

export function canView(user: AuthUser | null | undefined, area: string): boolean {
  return !!user?.permissoes?.[area]?.ver
}

export function canEdit(user: AuthUser | null | undefined, area: string): boolean {
  return !!user?.permissoes?.[area]?.editar
}

// Primeira área visível (pra redirecionar o usuário ao logar)
export function firstVisibleArea(user: AuthUser | null | undefined): string | null {
  for (const a of AREAS) if (canView(user, a.id)) return a.id
  return null
}

// Mapa área → rota
export const AREA_ROUTE: Record<string, string> = {
  dashboard: '/dashboard',
  comunicados: '/comunicados',
  registrar: '/acoes/nova',
  historico: '/acoes/historico',
  estatisticas: '/estatisticas',
  membros: '/membros',
  ausencias: '/ausencias',
  bau: '/bau',
  historicoBau: '/bau/historico',
  estoque: '/estoque',
  tablet: '/tablet',
  historicoTablet: '/tablet/historico',
  lavagem: '/lavagem',
  historicoLavagem: '/lavagem/historico',
  configuracoes: '/configuracoes',
}
