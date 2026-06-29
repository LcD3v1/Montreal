import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'
import { MontrealData, Conta } from './types'
import { fullPermissoes, permissoesFromNivel, ensureAllAreas } from './permissions'

const DATA_PATH = process.env.DATA_PATH
  ? path.resolve(process.env.DATA_PATH)
  : path.resolve(__dirname, '..', 'data.json')

const DEFAULT_DATA: MontrealData = {
  membros: [],
  acoes: [],
  qrus: ['QRU-1', 'QRU-2', 'QRU-3'],
  recrutas: [],
  recCfg: {
    notaMinima: 7,
    categorias: [
      { id: 1, nome: 'Comunicação', peso: 1 },
      { id: 2, nome: 'Tiro', peso: 1 },
      { id: 3, nome: 'Táticas', peso: 1 },
      { id: 4, nome: 'Disciplina', peso: 1 },
    ],
  },
  patentes: ['Recruta', 'Soldado', 'Cabo', 'Sargento', 'Tenente', 'Capitão', 'Major', 'Coronel'],
  cargos: ['Operador', 'Sniper', 'Médico de Campo', 'Líder de Esquadrão', 'Comandante'],
  contas: [],
  bauItens: ['Munição', 'Colete', 'Kit Médico', 'Algema'],
  bauMovimentos: [],
  tabletMovimentos: [],
  ausencias: [],
  comunicados: [],
  lavagens: [],
  nextMemId: 200,
  nextAcId: 1,
  nextRecId: 1,
  nextContaId: 1,
  nextBauMovId: 1,
  nextTabletMovId: 1,
  nextAusenciaId: 1,
  nextComunicadoId: 1,
  nextLavagemId: 1,
  logo: '',
  membrosOrder: [],
}

export function readData(): MontrealData {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8')
    return JSON.parse(JSON.stringify(DEFAULT_DATA))
  }
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as MontrealData
    // Garante que campos novos existam em dados legados
    const merged = { ...DEFAULT_DATA, ...parsed }
    // Migração: ações sem tipo viram 'tiro'
    merged.acoes = (merged.acoes ?? []).map(a => ({ ...a, tipo: a.tipo ?? 'tiro' }))
    // Migração: contas com 'nivel' antigo → permissões por área
    merged.contas = (merged.contas ?? []).map(c => {
      const legado = c as Conta & { nivel?: string }
      const base = legado.permissoes ?? permissoesFromNivel(legado.nivel)
      const ehAdmin = !!base?.configuracoes?.editar
      return {
        id: c.id, username: c.username, password: c.password, ativo: c.ativo,
        permissoes: ensureAllAreas(base, ehAdmin),
      }
    })
    return merged
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA))
  }
}

export function writeData(data: MontrealData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Encerra ausências cujo período já terminou (dataFim < hoje) e devolve o
 * membro para "Ativo" — desde que ele ainda esteja "Ausência" e não haja outra
 * ausência ativa cobrindo a data de hoje. Retorna true se algo mudou.
 */
export function reconcileAusencias(data: MontrealData): boolean {
  const hoje = new Date().toISOString().slice(0, 10)
  let changed = false
  for (const a of data.ausencias) {
    if (a.status === 'ativa' && a.dataFim < hoje) {
      a.status = 'encerrada'
      changed = true
      const m = data.membros.find(mm => mm.id === a.membroId)
      if (m && m.status === 'Ausência') {
        const aindaAusente = data.ausencias.some(o =>
          o.id !== a.id && o.membroId === a.membroId && o.status === 'ativa' &&
          o.dataInicio <= hoje && o.dataFim >= hoje,
        )
        if (!aindaAusente) m.status = 'Ativo'
      }
    }
  }
  return changed
}

export async function ensureDefaultAdmin(): Promise<void> {
  const data = readData()
  if (data.contas.length === 0) {
    const hashed = await bcrypt.hash('admin123', 12)
    data.contas.push({
      id: 1,
      username: 'admin',
      password: hashed,
      ativo: true,
      permissoes: fullPermissoes(),
    })
    data.nextContaId = 2
    writeData(data)
    console.log('[MONTREAL] Conta admin padrão criada: admin / admin123')
  }
}
