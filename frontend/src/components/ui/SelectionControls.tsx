import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, X } from 'lucide-react'

const CHECKBOX_CLS =
  'relative h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-bdr2 bg-card2 transition-colors ' +
  'checked:border-red checked:bg-red indeterminate:border-red indeterminate:bg-red ' +
  'after:absolute after:inset-0 after:flex after:items-center after:justify-center ' +
  'after:text-[10px] after:leading-none after:font-bold after:text-white ' +
  'checked:after:content-["✓"] indeterminate:after:content-["–"]'

/** Checkbox de cabeçalho com suporte a estado indeterminado. */
export function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
  title,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
  title?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      title={title ?? 'Selecionar todos'}
      className={CHECKBOX_CLS}
    />
  )
}

/** Checkbox de linha. Impede que o clique dispare handlers da linha. */
export function RowCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={e => e.stopPropagation()}
      className={CHECKBOX_CLS}
    />
  )
}

/** Barra flutuante de ações em lote — aparece quando há itens selecionados. */
export function BulkDeleteBar({
  count,
  onDelete,
  onClear,
  isDeleting,
  label = 'selecionado(s)',
}: {
  count: number
  onDelete: () => void
  onClear: () => void
  isDeleting: boolean
  label?: string
}) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-3 rounded border border-red/40 bg-red/10 px-4 py-2.5"
        >
          <span className="font-mono text-xs text-txt">
            <span className="text-red font-orbitron">{count}</span> {label}
          </span>
          <button
            onClick={onClear}
            className="ml-auto flex items-center gap-1 font-mono text-xs text-txt3 hover:text-txt transition-colors"
          >
            <X size={13} /> Limpar
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded border border-red px-3 py-1.5 font-orbitron text-xs tracking-widest text-red hover:bg-red hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={13} /> {isDeleting ? 'APAGANDO…' : 'APAGAR'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
