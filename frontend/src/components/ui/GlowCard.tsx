import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function GlowCard({ children, className = '', onClick }: Props) {
  return (
    <div
      className={`glow-card ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Textura de mármore escuro com veios vermelhos (premium sóbrio) */}
      <div className="card-marble" />
      <div className="gc-content">{children}</div>
    </div>
  )
}
