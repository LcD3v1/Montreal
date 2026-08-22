/**
 * Paleta MONTREAL — vermelho da marca + branco/neutro sobre base escura.
 *
 * Espelha as CSS vars de `index.css`. Existe para os casos em que a cor
 * precisa ir para JS (estilos inline, gráficos, PDF), onde `var(--gold)` não
 * é resolvido.
 *
 * ACCENT identifica a marca; DANGER comunica saída/falha/exclusão; POSITIVE
 * comunica entrada/pagamento/sucesso. Não use ACCENT para estado negativo.
 */
export const PALETTE = {
  /** Acento da marca — vermelho Montreal. */
  ACCENT: '#CC0000',
  /** Vermelho vivo, para texto/realce sobre fundo escuro. */
  ACCENT_BRIGHT: '#FF2222',
  /** Vermelho claro. */
  ACCENT_SOFT: '#ff6666',

  /** Neutro claro — filetes e detalhes sutis. */
  TRIM: '#c8c8c8',

  /** Positivo: entrada, depósito, venda paga. */
  POSITIVE: '#22C55E',
  /** Negativo: saída, falha, exclusão. */
  DANGER: '#EF4444',

  /** Texto/estado neutro. */
  MUTED: '#8a8a8a',
  /** Texto/estado desativado. */
  DIM: '#6f6f6f',

  /** Superfícies. */
  BG: '#0D0D0D',
  CARD: '#141414',
  BORDER: '#221010',
  TEXT: '#ffffff',
} as const
