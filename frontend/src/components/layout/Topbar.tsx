import { LogOut, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useLogo } from '@/hooks/useConfig'
import MapleLeaf from '@/components/ui/MapleLeaf'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':        'DASHBOARD',
  '/acoes/nova':       'REGISTRAR AÇÃO',
  '/acoes/historico':  'HISTÓRICO',
  '/estatisticas':     'ESTATÍSTICAS',
  '/recrutamento':     'RECRUTAMENTO',
  '/membros':          'MEMBROS',
  '/configuracoes':    'CONFIGURAÇÕES',
}

// Renderiza o título com uma parte em vermelho (igual ao mockup: DASH<em>BOARD</em>)
function renderTitle(title: string) {
  const words = title.split(' ')
  if (words.length > 1) {
    const last = words.pop()!
    return <>{words.join(' ')} <em>{last}</em></>
  }
  const mid = Math.ceil(title.length / 2)
  return <>{title.slice(0, mid)}<em>{title.slice(mid)}</em></>
}

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] || 'MONTREAL'
  const { data: logoData } = useLogo()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="mtl-topbar">
      <Menu size={16} className="topbar-icon" />

      {/* Mini logo */}
      <div
        className="logo-ring"
        style={{ width: 28, height: 28, border: '1.5px solid var(--red)', boxShadow: '0 0 10px rgba(204,0,0,0.4)' }}
      >
        {logoData?.logo ? (
          <img src={logoData.logo} alt="Logo Montreal" className="logo-circle" />
        ) : (
          <MapleLeaf size={16} />
        )}
      </div>

      <div className="topbar-sep" />

      <h1 className="page-title">{renderTitle(title)}</h1>

      {user && (
        <>
          <span className="topbar-user">{user.username}</span>
          <LogOut size={16} className="topbar-icon" onClick={handleLogout} aria-label="Sair" />
        </>
      )}
    </header>
  )
}
