/**
 * POST /api/admin — administracao dos codigos.
 *
 * Protegida pelo LICENSE_ADMIN_TOKEN. Nao ha tela: quem opera e o desenvolvedor,
 * pelo `npm run codes`. Uma pagina de administracao seria outro escopo — e mais
 * uma superficie para proteger — e nao e necessaria para vender.
 *
 * Acoes:
 *   health                        estado do servidor (unica que dispensa token)
 *   new     { quantity, note }    gera um lote novo, pronto para a plataforma
 *   add     { codes[], note }     cadastra codigos que ja existem
 *   list    { }                   todos os codigos com a situacao de cada um
 *   get     { code }              detalhe de um codigo
 *   revoke  { code, note }        BLOQUEIA: reembolso, cobranca contestada
 *   restore { code }              desfaz o bloqueio
 *   release { code }              limpa os aparelhos (trocou de celular)
 *   forget  { code }              apaga o registro do codigo
 */
import {
  dropCode,
  emptyRecord,
  getCode,
  listCodes,
  makeCodes,
  normalizeCode,
  putCode,
  readBody,
  send,
  storeReady,
  hasSigningKey,
  LICENCE_DAYS,
  MAX_DEVICES,
  type CodeRecord,
  type Req,
  type Res,
} from './_lib.js'

declare const process: { env: Record<string, string | undefined> }

/**
 * Comparacao de tempo constante. O token e curto e as tentativas passam pela
 * rede, entao o vazamento por tempo e teorico — mas custa cinco linhas.
 */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function authorized(req: Req): boolean {
  const expected = process.env.LICENSE_ADMIN_TOKEN
  if (!expected) return false
  const header = req.headers['authorization'] ?? req.headers['Authorization']
  const value = Array.isArray(header) ? header[0] : header
  if (!value) return false
  return sameSecret(value.replace(/^Bearer\s+/i, '').trim(), expected)
}

/** O que sai na listagem: sem os hashes dos aparelhos, so a contagem. */
const summary = (code: string, rec: CodeRecord) => ({
  code,
  status: rec.status,
  devices: rec.devices.length,
  createdAt: rec.createdAt,
  activatedAt: rec.activatedAt,
  revokedAt: rec.revokedAt,
  note: rec.note,
})

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })

  const body = readBody(req)
  const action = typeof body.action === 'string' ? body.action : ''

  // O health check fica aberto de proposito: e o que responde "o servidor de
  // licencas esta configurado?" sem precisar do token em maos.
  if (action === 'health') {
    return send(res, 200, {
      ok: storeReady() && hasSigningKey(),
      store: storeReady(),
      signingKey: hasSigningKey(),
      adminToken: Boolean(process.env.LICENSE_ADMIN_TOKEN),
      licenceDays: LICENCE_DAYS,
      maxDevices: MAX_DEVICES,
    })
  }

  if (!authorized(req)) return send(res, 401, { error: 'unauthorized' })
  if (!storeReady()) return send(res, 503, { error: 'store_unavailable' })

  const note = typeof body.note === 'string' ? body.note.slice(0, 200) : ''

  try {
    switch (action) {
      case 'new': {
        const quantity = Math.min(Math.max(Number(body.quantity ?? 0) | 0, 1), 500)
        const codes = makeCodes(quantity)
        for (const code of codes) await putCode(code, emptyRecord(note))
        return send(res, 200, { codes })
      }

      case 'add': {
        const raw = Array.isArray(body.codes) ? body.codes : []
        const added: string[] = []
        const rejected: unknown[] = []
        for (const item of raw.slice(0, 500)) {
          const code = normalizeCode(item)
          if (!code) {
            rejected.push(item)
            continue
          }
          // Nunca sobrescrever: recadastrar um codigo ja vendido zeraria os
          // aparelhos dele e desbloquearia quem foi reembolsado.
          if (await getCode(code)) continue
          await putCode(code, emptyRecord(note))
          added.push(code)
        }
        return send(res, 200, { added, rejected })
      }

      case 'list': {
        const codes = (await listCodes()).sort()
        const rows = []
        for (const code of codes) {
          const rec = await getCode(code)
          if (rec) rows.push(summary(code, rec))
        }
        return send(res, 200, { total: rows.length, codes: rows })
      }

      case 'get':
      case 'revoke':
      case 'restore':
      case 'release':
      case 'forget': {
        const code = normalizeCode(body.code)
        if (!code) return send(res, 400, { error: 'bad_code' })
        const rec = await getCode(code)
        if (!rec) return send(res, 404, { error: 'unknown_code' })

        if (action === 'get') return send(res, 200, { ...summary(code, rec) })

        if (action === 'forget') {
          await dropCode(code)
          return send(res, 200, { code, forgotten: true })
        }

        if (action === 'revoke') {
          rec.status = 'revoked'
          rec.revokedAt = Date.now()
          if (note) rec.note = note
        } else if (action === 'restore') {
          rec.status = rec.devices.length ? 'active' : 'unused'
          rec.revokedAt = null
          if (note) rec.note = note
        } else {
          // release: o codigo continua valido, so esquece os aparelhos.
          rec.devices = []
          rec.status = 'unused'
          rec.activatedAt = null
        }

        await putCode(code, rec)
        return send(res, 200, { ...summary(code, rec) })
      }

      default:
        return send(res, 400, { error: 'unknown_action' })
    }
  } catch {
    return send(res, 500, { error: 'server_error' })
  }
}
