import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { requireAuth } from '../middleware/auth'
import { requireView, requireEdit } from '../middleware/roles'
import { criticalLimiter } from '../middleware/rateLimiter'
import {
  validateBody,
  qruSchema, patenteSchema, cargoSchema,
  createContaSchema, updateContaSchema,
  logoSchema, recCfgSchema,
  reorderPatenteSchema, bauItemSchema,
} from '../middleware/validate'
import { audit, readAuditLog } from '../security/audit'
import { readData, writeData } from '../data'
import { normalizePermissoes, countConfigAdmins } from '../permissions'
import { Conta, MontrealData } from '../types'

const router = Router()

// Atalho: edição de Configurações
const canEditConfig = requireEdit('configuracoes')
const canViewConfig = requireView('configuracoes')

// ── QRUs ──────────────────────────────────────────────────────────────────────

router.get('/qrus', requireAuth, (_req, res) => res.json(readData().qrus))

router.post('/qrus', requireAuth, canEditConfig, validateBody(qruSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  if (data.qrus.includes(nome)) { res.status(409).json({ error: 'Ação já existe' }); return }
  data.qrus.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Ação criada: ${nome}`)
  res.status(201).json(data.qrus)
})

router.delete('/qrus/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.qrus = data.qrus.filter(q => q !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Ação removida: ${nome}`)
  res.json(data.qrus)
})

// ── Hierarquia (patentes) ──────────────────────────────────────────────────────

router.get('/patentes', requireAuth, (_req, res) => res.json(readData().patentes))

router.post('/patentes', requireAuth, canEditConfig, validateBody(patenteSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  data.patentes.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Hierarquia criada: ${nome}`)
  res.status(201).json(data.patentes)
})

router.put('/patentes/reorder', requireAuth, canEditConfig, validateBody(reorderPatenteSchema), (req: Request, res: Response): void => {
  const { patentes } = req.body as { patentes: string[] }
  const data = readData()
  data.patentes = patentes.map(p => String(p).slice(0, 50))
  writeData(data)
  res.json(data.patentes)
})

router.delete('/patentes/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.patentes = data.patentes.filter(p => p !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Hierarquia removida: ${nome}`)
  res.json(data.patentes)
})

// ── Cargos ────────────────────────────────────────────────────────────────────

router.get('/cargos', requireAuth, (_req, res) => res.json(readData().cargos))

router.post('/cargos', requireAuth, canEditConfig, validateBody(cargoSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  data.cargos.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Cargo criado: ${nome}`)
  res.status(201).json(data.cargos)
})

router.delete('/cargos/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.cargos = data.cargos.filter(c => c !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Cargo removido: ${nome}`)
  res.json(data.cargos)
})

// ── Baú: itens ──────────────────────────────────────────────────────────────

router.get('/bau-itens', requireAuth, (_req, res) => res.json(readData().bauItens))

router.post('/bau-itens', requireAuth, canEditConfig, validateBody(bauItemSchema), (req: Request, res: Response): void => {
  const { nome } = req.body as { nome: string }
  const data = readData()
  if (data.bauItens.includes(nome)) { res.status(409).json({ error: 'Item já existe' }); return }
  data.bauItens.push(nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Item de baú criado: ${nome}`)
  res.status(201).json(data.bauItens)
})

router.delete('/bau-itens/:nome', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const nome = String(req.params.nome).slice(0, 50)
  const data = readData()
  data.bauItens = data.bauItens.filter(i => i !== nome)
  writeData(data)
  audit('CONFIG_UPDATED', req, `Item de baú removido: ${nome}`)
  res.json(data.bauItens)
})

// ── Contas ────────────────────────────────────────────────────────────────────

router.get('/contas', requireAuth, canViewConfig, (_req, res) => {
  const data = readData()
  res.json(data.contas.map(({ password: _p, ...rest }) => rest))
})

router.post('/contas', requireAuth, canEditConfig, validateBody(createContaSchema), async (req: Request, res: Response): Promise<void> => {
  const { username, password, permissoes } = req.body as { username: string; password: string; permissoes?: unknown }
  // Hash ANTES de ler os dados — evita janela de corrida (read-modify-write) com o await
  const hashed = await bcrypt.hash(password, 12)
  const data = readData()

  if (data.contas.some(c => c.username.toLowerCase() === username.toLowerCase())) {
    res.status(409).json({ error: 'Nome de usuário já existe' }); return
  }

  const novaConta: Conta = {
    id: data.nextContaId,
    username: username.trim(),
    password: hashed,
    ativo: true,
    permissoes: normalizePermissoes(permissoes),
  }

  data.contas.push(novaConta)
  data.nextContaId++
  writeData(data)

  audit('ACCOUNT_CREATED', req, `Usuário: ${novaConta.username}`)
  const { password: _p, ...semSenha } = novaConta
  res.status(201).json(semSenha)
})

router.put('/contas/:id', requireAuth, canEditConfig, validateBody(updateContaSchema), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  const { username, permissoes, ativo, password } = req.body as { username?: string; permissoes?: unknown; ativo?: boolean; password?: string }
  // Hash ANTES de ler os dados — evita janela de corrida com o await
  const novoHash = password ? await bcrypt.hash(password, 12) : undefined

  const data = readData()
  const conta = data.contas.find(c => c.id === id)
  if (!conta) { res.status(404).json({ error: 'Conta não encontrada' }); return }

  const changes: string[] = []

  if (username && username.trim() && username.trim() !== conta.username) {
    const novo = username.trim()
    if (data.contas.some(c => c.id !== id && c.username.toLowerCase() === novo.toLowerCase())) {
      res.status(409).json({ error: 'Nome de usuário já existe' }); return
    }
    changes.push(`usuário: ${conta.username}→${novo}`)
    conta.username = novo
  }
  if (permissoes !== undefined) {
    conta.permissoes = normalizePermissoes(permissoes)
    changes.push('permissões atualizadas')
  }
  if (typeof ativo === 'boolean') {
    conta.ativo = ativo
    changes.push(`ativo: ${ativo}`)
  }
  if (password) {
    conta.password = novoHash!
    changes.push('senha alterada')
  }

  // Trava anti-lockout: nunca deixar o sistema sem ninguém que gerencie Configurações
  if (countConfigAdmins(data.contas) < 1) {
    audit('PRIVILEGE_ESCALATION_ATTEMPT', req, `Bloqueado: deixaria o sistema sem admin de Configurações (conta ${id})`)
    res.status(400).json({ error: 'Operação bloqueada: precisa existir ao menos uma conta ativa com permissão de editar Configurações.' })
    return
  }

  writeData(data)
  audit('ACCOUNT_UPDATED', req, `ID: ${id} | ${changes.join(', ')}`)
  const { password: _p, ...semSenha } = conta
  res.json(semSenha)
})

router.delete('/contas/:id', requireAuth, canEditConfig, (req: Request, res: Response): void => {
  const id = parseInt(String(req.params.id), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

  if (req.user!.contaId === id) {
    res.status(400).json({ error: 'Não é possível excluir sua própria conta' }); return
  }

  const data = readData()
  const idx = data.contas.findIndex(c => c.id === id)
  if (idx === -1) { res.status(404).json({ error: 'Conta não encontrada' }); return }

  const [removida] = data.contas.splice(idx, 1)

  if (countConfigAdmins(data.contas) < 1) {
    res.status(400).json({ error: 'Operação bloqueada: precisa existir ao menos uma conta ativa com permissão de editar Configurações.' })
    return
  }

  writeData(data)
  audit('ACCOUNT_DELETED', req, `Usuário: ${removida.username}`)
  res.json({ ok: true })
})

// ── Logo ──────────────────────────────────────────────────────────────────────

router.get('/logo', (_req, res) => res.json({ logo: readData().logo }))

router.put('/logo', requireAuth, canEditConfig, validateBody(logoSchema), (req: Request, res: Response): void => {
  const { logo } = req.body as { logo: string }
  const data = readData()
  data.logo = logo
  writeData(data)
  audit('LOGO_UPDATED', req)
  res.json({ ok: true })
})

router.delete('/logo', requireAuth, canEditConfig, (_req, res) => {
  const data = readData()
  data.logo = ''
  writeData(data)
  audit('LOGO_DELETED', _req as Request)
  res.json({ ok: true })
})

// ── Recrutamento (config legada, mantida) ──────────────────────────────────────

router.get('/recrutamento', requireAuth, (_req, res) => res.json(readData().recCfg))

router.put('/recrutamento', requireAuth, canEditConfig, validateBody(recCfgSchema), (req: Request, res: Response): void => {
  const data = readData()
  const { notaMinima, categorias } = req.body
  if (typeof notaMinima === 'number') data.recCfg.notaMinima = notaMinima
  if (Array.isArray(categorias)) data.recCfg.categorias = categorias
  writeData(data)
  audit('CONFIG_UPDATED', req, 'Configuração de recrutamento atualizada')
  res.json(data.recCfg)
})

// ── Backup / Restore ──────────────────────────────────────────────────────────

router.get('/backup', requireAuth, canViewConfig, (req: Request, res: Response): void => {
  const data = readData()
  const sanitized = {
    ...data,
    contas: data.contas.map(({ password: _p, ...rest }) => ({ ...rest, password: '[REDACTED]' })),
  }
  audit('BACKUP_DOWNLOADED', req)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="montreal-backup-${new Date().toISOString().slice(0, 10)}.json"`)
  res.send(JSON.stringify(sanitized, null, 2))
})

router.post('/restore', requireAuth, canEditConfig, criticalLimiter, (req: Request, res: Response): void => {
  const body = req.body as Partial<MontrealData>

  const required: (keyof MontrealData)[] = ['membros', 'acoes', 'contas']
  if (!required.every(k => Array.isArray(body[k]))) {
    res.status(400).json({ error: 'Backup inválido — campos obrigatórios ausentes' }); return
  }

  const contasSemSenha = (body.contas as Conta[]).filter(c => !c.password || c.password === '[REDACTED]')
  if (contasSemSenha.length > 0) {
    res.status(400).json({ error: 'Backup não pode ser restaurado: senhas ausentes. Use um backup completo gerado pelo sistema.' })
    return
  }

  writeData(body as MontrealData)
  audit('RESTORE_EXECUTED', req, `Membros: ${body.membros?.length} | Ações: ${body.acoes?.length}`)
  res.json({ ok: true })
})

// ── Audit Log ───────────────────────────────────────────────────────────────

router.get('/audit-log', requireAuth, canViewConfig, (req: Request, res: Response): void => {
  const limit = Math.min(500, Math.max(10, parseInt(String(req.query.limit || '100'), 10)))
  res.json(readAuditLog(limit))
})

export default router
