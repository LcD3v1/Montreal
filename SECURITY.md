# Segurança — Sistema Montreal

Este documento descreve as defesas implementadas, como manter o sistema seguro,
como atualizar, como fazer deploy seguro e como reagir a um incidente.

> Arquitetura: **um único serviço** Node/Express que serve o frontend buildado.
> Persistência em **arquivo JSON** (`data.json`) — **não há banco SQL/NoSQL**, então
> injeção de SQL/NoSQL não se aplica. As proteções de "banco" são de integridade e
> permissão de arquivo.

---

## 1. Defesas implementadas (resumo)

| Camada | Proteção |
|---|---|
| Headers HTTP | Helmet: CSP restritiva (prod), HSTS 1 ano, `X-Frame-Options: DENY`, `noSniff`, sem `X-Powered-By`, Referrer-Policy, COOP/CORP `same-origin`, Permissions-Policy |
| Rate limiting | Global (300/15min), API (150/min), login (10/15min), operações críticas (5/15min) |
| Brute force | Bloqueio de conta por 15 min após 5 falhas de login |
| Autenticação | JWT (exp. 8h) com `jti` + blacklist de tokens (logout/troca de senha revogam na hora); conta é revalidada (ativa/permissões) a **cada requisição** |
| Login | `bcrypt.compare` sempre executado (timing-safe — não revela se o usuário existe); mensagem de erro genérica |
| Senhas | `bcrypt` custo 12; mínimo de 8 caracteres para novas senhas/contas |
| Autorização | RBAC por área com níveis **ver/editar** (`requireView`/`requireEdit`), princípio do menor privilégio |
| Validação | `zod` em todo body; `hpp` (HTTP Parameter Pollution); limite de 5 MB no JSON |
| Sanitização | Remove null bytes e sequências de path traversal; bloqueia chaves de prototype pollution (`__proto__`, `constructor`, `prototype`) |
| Path traversal | Bloqueio de dotfiles nas rotas e no static; `sanitizeParams` recusa `..`, `\0`, `/` em params |
| CSRF | Não aplicável — autenticação via header `Authorization: Bearer`, não cookies |
| Integridade de dados | Escrita **atômica** de `data.json` (tmp + fsync + rename) com modo `0600`; leitura **falha alto** se o arquivo existir e estiver corrompido (nunca sobrescreve com padrões) |
| Auditoria | Log estruturado (JSON por linha) de login, alterações, ações administrativas, rate limit, etc. |

---

## 2. Como manter seguro (operação)

- **Segredos nunca no git.** `JWT_SECRET`, `data.json`, `.env` e `*.log` estão no `.gitignore`.
  Configure os segredos no painel de variáveis de ambiente da hospedagem.
- **`JWT_SECRET` forte e único** (≥ 32 chars). O servidor **não sobe** com segredo ausente/fraco.
  Gere: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- **Troque a senha padrão** `admin/admin123` no primeiro acesso (Configurações → Contas).
- **Menor privilégio:** dê a cada conta só as áreas (ver/editar) que ela precisa.
- **Volume persistente** para `DATA_PATH` e `AUDIT_LOG_PATH` (senão dados/logs somem no restart).
- **Revise o `audit.log`** periodicamente (logins falhos, `RATE_LIMIT_HIT`, ações admin).

## 3. Como atualizar com segurança

```bash
# na raiz do projeto
npm audit --omit=dev          # backend e frontend: verificar vulnerabilidades
cd backend && npm audit fix   # aplica correções não-destrutivas
cd ../frontend && npm audit fix
npm run build                 # confirmar que compila
```

- Rode `npm audit` antes de cada deploy. Meta: **0 vulnerabilidades**.
- Evite `npm audit fix --force` sem testar (pode trazer breaking changes).
- Mantenha Node LTS atualizado.

## 4. Deploy seguro (ShardCloud / Linux)

1. Variáveis: `JWT_SECRET` (obrigatória), `DATA_PATH` e `AUDIT_LOG_PATH` (em volume persistente), `NODE_ENV=production`.
2. **HTTPS/TLS**: garanta que o tráfego chega por HTTPS (a plataforma termina o TLS). O HSTS já força HTTPS no navegador.
3. **Firewall / DDoS**: exponha só a porta do serviço; use a proteção de borda da plataforma (WAF/DDoS) quando disponível.
4. Confirme que `data.json` e `audit.log` **não** são servidos publicamente (bloqueio de dotfiles + `dotfiles: 'deny'` já ativos; arquivos ficam fora de `frontend/dist`).

## 5. Recuperação de incidente

1. **Contenha:** troque o `JWT_SECRET` (invalida todos os tokens) e reinicie o serviço.
2. **Force troca de senhas** das contas afetadas (Configurações → Contas).
3. **Investigue:** analise o `audit.log` (IPs, `LOGIN_FAILED`, `RATE_LIMIT_HIT`, ações administrativas).
4. **Restaure dados:** substitua o `data.json` por um backup íntegro (o app tem backup/restore em Configurações).
5. **Contas desativadas** perdem acesso imediatamente (revalidação por requisição).

---

## 6. Melhorias recomendadas (roadmap)

- **MFA/2FA (TOTP)** para contas administrativas.
- **Persistir** brute-force e blacklist de tokens (hoje em memória — zeram no restart; ok para instância única).
- **CI de segurança**: rodar `npm audit` e um scanner (ex.: Dependabot/CodeQL) a cada PR.
- **Backup automático** periódico do `data.json` para armazenamento externo.
- **Complexidade de senha** (exigir maiúscula/número/símbolo) além do mínimo de 8.

## Como reportar uma vulnerabilidade

Abra uma issue privada ou contate o responsável pelo projeto. Não divulgue publicamente antes da correção.
