import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'
import { MontrealData, Conta } from './types'
import { AREA_IDS, ensureAllAreas, fullPermissoes, normalizePermissoes, permissoesFromNivel } from './permissions'

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
      { id: 1, nome: 'Comunicacao', peso: 1 },
      { id: 2, nome: 'Tiro', peso: 1 },
      { id: 3, nome: 'Taticas', peso: 1 },
      { id: 4, nome: 'Disciplina', peso: 1 },
    ],
  },
  patentes: ['Recruta', 'Soldado', 'Cabo', 'Sargento', 'Tenente', 'Capitao', 'Major', 'Coronel'],
  cargos: ['Operador', 'Sniper', 'Medico de Campo', 'Lider de Esquadrao', 'Comandante'],
  cargosPermissao: [],
  contas: [],
  bauItens: ['Municao', 'Colete', 'Kit Medico', 'Algema'],
  bauMovimentos: [],
  bauGerenciaItens: ['Municao', 'Colete', 'Kit Medico', 'Algema'],
  bauGerenciaMovimentos: [],
  tabletMovimentos: [],
  ausencias: [],
  comunicados: [],
  municaoTipos: [],
  municaoMovimentos: [],
  vendas: [],
  nextMemId: 200,
  nextAcId: 1,
  nextRecId: 1,
  nextContaId: 1,
  nextCargoPermissaoId: 1,
  nextBauMovId: 1,
  nextBauGerenciaMovId: 1,
  nextTabletMovId: 1,
  nextAusenciaId: 1,
  nextComunicadoId: 1,
  nextMunicaoTipoId: 1,
  nextMunicaoMovId: 1,
  nextVendaId: 1,
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
    const merged = { ...DEFAULT_DATA, ...parsed }

    merged.acoes = (merged.acoes ?? []).map(a => ({ ...a, tipo: a.tipo ?? 'tiro', moeda: a.moeda ?? 'Real' }))
    merged.tabletMovimentos = (merged.tabletMovimentos ?? []).map(m => ({ ...m, moeda: m.moeda ?? 'Real' }))

    // Migra tipos de arma do modelo antigo (preço único + moeda) para dois preços
    // (precoReal/precoDolar) com estoque único. O preço conhecido vai para a moeda
    // em que foi cadastrado; a outra começa em 0 para ser ajustada em Configurações.
    merged.municaoTipos = (merged.municaoTipos ?? []).map(t => {
      const legado = t as typeof t & { precoUnitario?: number; moeda?: string }
      if (legado.precoReal === undefined && legado.precoDolar === undefined && legado.precoUnitario !== undefined) {
        return {
          id: t.id, nome: t.nome, ativo: t.ativo,
          precoReal:  legado.moeda === 'Dólar' ? 0 : legado.precoUnitario,
          precoDolar: legado.moeda === 'Dólar' ? legado.precoUnitario : 0,
        }
      }
      return { id: t.id, nome: t.nome, ativo: t.ativo, precoReal: t.precoReal ?? 0, precoDolar: t.precoDolar ?? 0 }
    })
    // Cargos: áreas novas (que ainda não existem no JSON salvo) são liberadas para
    // cargos administrativos, espelhando o que ensureAllAreas já faz nas contas.
    // Sem isso, normalizePermissoes materializa toda área nova como {ver:false} e
    // nem o admin enxerga o módulo recém-adicionado (ex: Vendas) numa base antiga.
    merged.cargosPermissao = (merged.cargosPermissao ?? []).map(c => {
      const raw = (c.permissoes ?? {}) as Record<string, { ver?: unknown; editar?: unknown }>
      const ehAdmin = !!raw.configuracoes?.editar
      const permissoes = normalizePermissoes(raw)
      if (ehAdmin) {
        for (const area of AREA_IDS) {
          if (!(area in raw)) permissoes[area] = { ver: true, editar: true }
        }
      }
      return { id: c.id, nome: c.nome, permissoes }
    })
    merged.contas = (merged.contas ?? []).map(c => {
      const legado = c as Conta & { nivel?: string }
      const base = legado.permissoes ?? permissoesFromNivel(legado.nivel)
      const ehAdmin = !!base?.configuracoes?.editar
      return {
        id: c.id,
        username: c.username,
        password: c.password,
        ativo: c.ativo,
        cargoPermissaoId: c.cargoPermissaoId,
        permissoes: ensureAllAreas(base, ehAdmin),
      }
    })

    if (merged.cargosPermissao.length === 0 && merged.contas.length > 0) {
      const seen = new Map<string, number>()
      merged.nextCargoPermissaoId = 1
      merged.contas = merged.contas.map(conta => {
        const key = JSON.stringify(conta.permissoes)
        let cargoId = seen.get(key)
        if (!cargoId) {
          cargoId = merged.nextCargoPermissaoId++
          seen.set(key, cargoId)
          merged.cargosPermissao.push({
            id: cargoId,
            nome: conta.permissoes.configuracoes?.editar ? 'Administrador' : `Cargo ${cargoId}`,
            permissoes: conta.permissoes,
          })
        }
        return { ...conta, cargoPermissaoId: cargoId }
      })
    } else {
      const highest = Math.max(0, ...merged.cargosPermissao.map(c => c.id))
      merged.nextCargoPermissaoId = Math.max(merged.nextCargoPermissaoId ?? 1, highest + 1)
    }

    const cargoIds = new Set(merged.cargosPermissao.map(c => c.id))
    merged.contas = merged.contas.map(conta => ({
      ...conta,
      cargoPermissaoId: conta.cargoPermissaoId && cargoIds.has(conta.cargoPermissaoId) ? conta.cargoPermissaoId : undefined,
    }))

    return merged
  } catch (err) {
    /**
     * Arquivo EXISTE mas não pôde ser lido/parseado. NÃO podemos devolver
     * DEFAULT_DATA: o próximo writeData gravaria os padrões por cima da base
     * boa, e um erro transitório de leitura viraria perda de dados definitiva.
     * Regra: ausente → cria padrão; presente e ilegível → estoura e o servidor
     * não sobe. Melhor derrubar do que apagar.
     */
    throw new Error(
      `[MONTREAL] Falha ao ler ${DATA_PATH}. Servidor interrompido de propósito para ` +
      `não sobrescrever a base com dados vazios. Verifique o arquivo (JSON válido?) ou ` +
      `restaure um backup. Causa: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/**
 * Escrita ATÔMICA da base, com permissões restritas (dados sensíveis em repouso).
 * 1) grava num arquivo temporário no MESMO diretório e faz fsync (flush ao disco);
 * 2) renomeia por cima do final — operação atômica no SO: se o processo cair no
 *    meio, a base original permanece intacta (nunca fica um JSON truncado);
 * 3) aplica modo 0600 (só o dono lê/escreve).
 */
export function writeData(data: MontrealData): void {
  const json = JSON.stringify(data, null, 2)
  const tmp = `${DATA_PATH}.${process.pid}.${Date.now()}.tmp`
  const fd = fs.openSync(tmp, 'w', 0o600)
  try {
    fs.writeSync(fd, json, null, 'utf-8')
    fs.fsyncSync(fd)
  } finally {
    fs.closeSync(fd)
  }
  fs.renameSync(tmp, DATA_PATH)
  try { fs.chmodSync(DATA_PATH, 0o600) } catch { /* chmod é no-op em alguns FS (ex: Windows) */ }
}

export function reconcileAusencias(data: MontrealData): boolean {
  const hoje = new Date().toISOString().slice(0, 10)
  let changed = false
  for (const a of data.ausencias) {
    if (a.status === 'ativa' && a.dataFim < hoje) {
      a.status = 'encerrada'
      changed = true
      const m = data.membros.find(mm => mm.id === a.membroId)
      if (m && String(m.status) === 'Ausência') {
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
    data.cargosPermissao = [{ id: 1, nome: 'Administrador', permissoes: fullPermissoes() }]
    data.contas.push({
      id: 1,
      username: 'admin',
      password: hashed,
      ativo: true,
      cargoPermissaoId: 1,
      permissoes: fullPermissoes(),
    })
    data.nextContaId = 2
    data.nextCargoPermissaoId = 2
    writeData(data)
    console.log('[MONTREAL] Conta admin padrao criada: admin / admin123')
  }
}
