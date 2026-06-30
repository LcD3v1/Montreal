import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, PlusCircle, History, BarChart2,
  Users, Settings, Archive, Package, ClipboardList, CalendarOff,
  Wallet, Receipt, Megaphone, Droplets, FileText,
  Crown,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogo } from '@/hooks/useConfig'
import { canView } from '@/lib/permissions'
import MapleLeaf from '@/components/ui/MapleLeaf'

type NavItem = {
  to: string
  icon: React.ElementType
  label: string
  area: string
}

const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'OPERAÇÕES',
    items: [
      { to: '/dashboard',       icon: LayoutDashboard, label: 'DASHBOARD',        area: 'dashboard' },
      { to: '/comunicados',     icon: Megaphone,       label: 'COMUNICADOS',      area: 'comunicados' },
      { to: '/acoes/nova',      icon: PlusCircle,      label: 'REGISTRAR AÇÃO',   area: 'registrar' },
      { to: '/acoes/historico', icon: History,         label: 'HISTÓRICO',        area: 'historico' },
      { to: '/estatisticas',    icon: BarChart2,       label: 'ESTATÍSTICAS',     area: 'estatisticas' },
    ],
  },
  {
    section: 'PESSOAL',
    items: [
      { to: '/membros',       icon: Users,         label: 'MEMBROS',       area: 'membros' },
      { to: '/ausencias',     icon: CalendarOff,   label: 'AUSÊNCIAS',     area: 'ausencias' },
      { to: '/bau',           icon: Archive,       label: 'BAÚ',           area: 'bau' },
      { to: '/bau/historico', icon: ClipboardList, label: 'HISTÓRICO BAÚ', area: 'historicoBau' },
      { to: '/estoque',       icon: Package,       label: 'ESTOQUE',       area: 'estoque' },
    ],
  },
  {
    section: 'GERÊNCIA',
    items: [
      { to: '/gerencia/bau',       icon: Crown,         label: 'BAÚ GERÊNCIA',       area: 'bauGerencia' },
      { to: '/gerencia/historico', icon: ClipboardList, label: 'HISTÓRICO GERÊNCIA',  area: 'historicoBauGerencia' },
      { to: '/gerencia/estoque',   icon: Package,       label: 'ESTOQUE GERÊNCIA',   area: 'estoqueGerencia' },
    ],
  },
  {
    section: 'TABLET',
    items: [
      { to: '/tablet',           icon: Wallet,  label: 'SAQUE / DEPÓSITO', area: 'tablet' },
      { to: '/tablet/historico', icon: Receipt, label: 'HISTÓRICO TABLET', area: 'historicoTablet' },
    ],
  },
  {
    section: 'LAVAGEM',
    items: [
      { to: '/lavagem',           icon: Droplets, label: 'LAVAGEM',           area: 'lavagem' },
      { to: '/lavagem/historico', icon: FileText, label: 'HISTÓRICO LAVAGEM', area: 'historicoLavagem' },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { to: '/configuracoes', icon: Settings, label: 'CONFIGURAÇÕES', area: 'configuracoes' },
    ],
  },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const { data: logoData } = useLogo()

  const canSee = (item: NavItem) => canView(user, item.area)

  return (
    <aside className="mtl-sidebar">
      {/* Mármore no topo */}
      <div className="sidebar-marble">
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="100%" height="100%" filter="url(#mf-rwb)" />
        </svg>
      </div>

      {/* Header: logo + nome */}
      <div className="sidebar-header">
        <div className="logo-ring" style={{ width: 68, height: 68, position: 'relative' }}>
          <div className="ring-outer" />
          {logoData?.logo ? (
            <img src={logoData.logo} alt="Logo" className="logo-circle" />
          ) : (
            <MapleLeaf size={40} />
          )}
        </div>
        <div className="white-rule" />
        <p className="org-name">MONTREAL</p>
        <p className="org-sub">SISTEMA INTERNO</p>
      </div>

      {/* Navegação */}
      <nav className="mtl-nav">
        {NAV_SECTIONS.map(({ section, items }) => {
          const visible = items.filter(canSee)
          if (visible.length === 0) return null
          return (
            <div key={section}>
              <div className="nav-section">{section}</div>
              {visible.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <item.icon className="nav-icon" size={14} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="status-dot" />
        <span className="footer-txt">ONLINE</span>
        <span className="footer-ver">v2.0</span>
      </div>
    </aside>
  )
}
