/**
 * POST /api/hotmart — o aviso de compra e de reembolso, vindo da Hotmart.
 *
 * E isto que torna o acesso automatico. A cliente vende de madrugada, tem outro
 * emprego, e nao ha ninguem para mandar codigo na hora — entao nada e enviado a
 * compradora. A Hotmart avisa aqui quem comprou, e a compradora entra no app
 * com o proprio e-mail da compra, que ela ja sabe de cor.
 *
 * O reembolso segue o mesmo caminho e no mesmo instante: a Hotmart avisa, o
 * acesso e revogado, e o app fecha na proxima vez que aquele aparelho falar com
 * o servidor — ou em no maximo sete dias, se ficar offline de proposito.
 *
 * A Hotmart REENVIA o mesmo aviso quando nao recebe 200, entao tudo aqui e
 * idempotente: processar duas vezes tem de dar no mesmo que processar uma.
 */
import {
  emptyRecord,
  getCode,
  hotmartSecret,
  normalizeEmail,
  putCode,
  readBody,
  send,
  storeReady,
  type Req,
  type Res,
} from './_lib.js'

/** Eventos que liberam o acesso. */
const LIBERA = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'PURCHASE_PROTEST_CLOSED'])

/**
 * Eventos que tiram o acesso.
 *
 * PURCHASE_DELAYED e PURCHASE_BILLET_PRINTED ficam de fora de proposito: sao
 * cobranca pendente, nao compra desfeita, e derrubar o app de quem so atrasou
 * seria pior que o problema.
 */
const REVOGA = new Set([
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_CANCELED',
  'PURCHASE_EXPIRED',
  'PURCHASE_PROTEST',
  'SUBSCRIPTION_CANCELLATION',
])

/** Comparacao de tempo constante, como no admin. */
function mesmoSegredo(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** O hottok vem no cabecalho na versao 2 e dentro do corpo na versao 1. */
function autorizado(req: Req, corpo: Record<string, unknown>): boolean {
  const esperado = hotmartSecret()
  if (!esperado) return false
  const cabecalho = req.headers['x-hotmart-hottok'] ?? req.headers['X-HOTMART-HOTTOK']
  const doCabecalho = Array.isArray(cabecalho) ? cabecalho[0] : cabecalho
  const doCorpo = typeof corpo.hottok === 'string' ? corpo.hottok : ''
  const recebido = (doCabecalho || doCorpo || '').trim()
  return recebido.length > 0 && mesmoSegredo(recebido, esperado)
}

/**
 * Onde a Hotmart poe o e-mail da compradora depende da versao do webhook, e
 * elas convivem. Em vez de apostar num formato, procura nos lugares conhecidos.
 */
function emailDaCompra(corpo: Record<string, unknown>): string | null {
  const d = (corpo.data ?? corpo) as Record<string, unknown>
  const candidatos: unknown[] = []

  const buyer = d.buyer as Record<string, unknown> | undefined
  if (buyer) candidatos.push(buyer.email)

  const subscriber = d.subscriber as Record<string, unknown> | undefined
  if (subscriber) candidatos.push(subscriber.email)

  candidatos.push(d.email, corpo.email)

  for (const c of candidatos) {
    const e = normalizeEmail(c)
    if (e) return e
  }
  return null
}

/** O identificador da transacao, so para registro — ajuda no suporte depois. */
function transacao(corpo: Record<string, unknown>): string {
  const d = (corpo.data ?? corpo) as Record<string, unknown>
  const p = d.purchase as Record<string, unknown> | undefined
  const t = (p && p.transaction) ?? d.transaction ?? corpo.transaction
  return typeof t === 'string' ? t.slice(0, 60) : ''
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })

  const corpo = readBody(req)

  // 401 antes de qualquer outra coisa: nao confirmar nem sequer se o evento era
  // valido para quem nao provou ser a Hotmart.
  if (!autorizado(req, corpo)) return send(res, 401, { error: 'unauthorized' })
  if (!storeReady()) return send(res, 503, { error: 'store_unavailable' })

  const evento = typeof corpo.event === 'string' ? corpo.event.toUpperCase() : ''
  const email = emailDaCompra(corpo)

  if (!email) {
    // 200 de proposito: o aviso chegou e foi entendido, so nao era sobre uma
    // compra com e-mail. Devolver erro faria a Hotmart reenviar para sempre.
    return send(res, 200, { ok: true, ignored: 'sem e-mail', event: evento })
  }

  try {
    const atual = await getCode(email)

    if (LIBERA.has(evento)) {
      const rec = atual ?? emptyRecord('')
      rec.status = 'active'
      rec.revokedAt = null
      rec.activatedAt = rec.activatedAt ?? Date.now()
      rec.note = `hotmart ${transacao(corpo)}`.trim()
      await putCode(email, rec)
      return send(res, 200, { ok: true, action: 'liberado' })
    }

    if (REVOGA.has(evento)) {
      // Cria mesmo se nunca tiver existido: o aviso de reembolso pode chegar
      // antes do de compra se a ordem se inverter, e o registro revogado
      // impede que a compra atrasada libere o acesso depois.
      const rec = atual ?? emptyRecord('')
      rec.status = 'revoked'
      rec.revokedAt = Date.now()
      rec.note = `hotmart ${evento} ${transacao(corpo)}`.trim()
      await putCode(email, rec)
      return send(res, 200, { ok: true, action: 'revogado' })
    }

    return send(res, 200, { ok: true, ignored: evento || 'sem evento' })
  } catch {
    // 500 aqui e proposital: a Hotmart reenvia, e o reenvio conserta uma falha
    // passageira do banco. Perder um aviso de reembolso seria pior.
    return send(res, 500, { error: 'server_error' })
  }
}
