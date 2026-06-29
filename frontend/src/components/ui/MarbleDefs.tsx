/**
 * Filtros SVG de mármore vermelho/branco/preto (feTurbulence) — usados como
 * textura de fundo nos cards, hero e sidebar. Renderizar uma única vez no shell.
 */
export default function MarbleDefs() {
  return (
    <svg className="svg-defs" style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id="mf-rwb" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.013 0.009" numOctaves={4} seed={12} result="turb" />
          <feColorMatrix
            type="matrix"
            in="turb"
            values="5  0  0  0 -1.2
                   -2  0  0  0  0.3
                   -2  0  0  0  0.3
                    0  0  0 20 -6"
            result="colored"
          />
        </filter>
        <filter id="mf-strip" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="turbulence" baseFrequency="0.03 0.018" numOctaves={3} seed={7} result="turb" />
          <feColorMatrix
            type="matrix"
            in="turb"
            values="4  0  0  0 -0.8
                   -1  0  0  0  0.2
                   -1  0  0  0  0.2
                    0  0  0 18 -5"
            result="colored"
          />
        </filter>
      </defs>
    </svg>
  )
}
