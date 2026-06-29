export default function MapleLeaf({
  size = 28,
  color = '#CC0000',
  className = '',
}: {
  size?: number
  color?: string
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size * 1.08}
      viewBox="-60 -70 120 130"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 0,-60 L 11,-20 55,-34 28,0 50,10 20,26 32,58 0,42 L-32,58 -20,26 -50,10 -28,0 -55,-34 -11,-20 Z"
        fill={color}
      />
      <rect x="-9" y="42" width="18" height="28" fill={color} />
    </svg>
  )
}
