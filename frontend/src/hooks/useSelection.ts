import { useCallback, useMemo, useState } from 'react'

/**
 * Seleção múltipla de linhas por ID.
 * `ids` deve ser a lista de IDs atualmente exibidos (já filtrados).
 * A seleção é automaticamente reduzida aos IDs ainda visíveis.
 */
export function useSelection(ids: number[]) {
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())

  const toggle = useCallback((id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clear = useCallback(() => setSelecionados(new Set()), [])

  // Apenas IDs que ainda estão visíveis contam como selecionados de fato
  const visiveis = useMemo(() => ids.filter(id => selecionados.has(id)), [ids, selecionados])

  const todosMarcados = ids.length > 0 && visiveis.length === ids.length
  const algunsMarcados = visiveis.length > 0 && !todosMarcados

  const toggleTodos = useCallback(() => {
    setSelecionados(prev => {
      const marcadosTodos = ids.length > 0 && ids.every(id => prev.has(id))
      return marcadosTodos ? new Set() : new Set(ids)
    })
  }, [ids])

  const isSelected = useCallback((id: number) => selecionados.has(id), [selecionados])

  return {
    count: visiveis.length,
    ids: visiveis,
    isSelected,
    toggle,
    toggleTodos,
    todosMarcados,
    algunsMarcados,
    clear,
  }
}
