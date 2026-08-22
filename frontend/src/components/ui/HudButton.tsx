import { motion } from 'framer-motion'
import { ReactNode, ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const VARIANTS = {
  primary: 'border border-transparent bg-gold text-white shadow-[0_6px_18px_rgba(224,27,43,0.28)] hover:bg-gold2',
  danger:  'border border-danger/40 text-danger bg-danger/5 hover:bg-danger/15',
  ghost:   'border border-bdr2 text-txt2 hover:border-bdrg hover:text-txt hover:bg-white/[0.03]',
}

const SIZES = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
}

export default function HudButton({
  children, variant = 'primary', size = 'md',
  loading, className = '', disabled, ...rest
}: Props) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={`
        font-semibold tracking-wide rounded-lg transition-colors duration-200 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...(rest as object)}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          Aguarde...
        </span>
      ) : children}
    </motion.button>
  )
}
