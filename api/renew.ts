/**
 * POST /api/renew — renova a licenca de um aparelho que ja foi ativado.
 *
 * O app chama sozinho, em segundo plano, quando falta pouco para vencer. Quem
 * esta em dia nunca ve nada disso. Quem foi reembolsado leva 403 e o app se
 * fecha na hora, em vez de esperar o vencimento.
 *
 * Diferente de /api/activate, esta rota nao registra aparelho novo — renovar
 * nao pode virar um caminho lateral para furar o limite de aparelhos.
 */
import { httpFor, issue, readBody, send, type Req, type Res } from './_lib.js'

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })

  const body = readBody(req)
  try {
    const result = await issue(body.code, body.deviceId, 'renew')
    if (!result.ok) return send(res, httpFor(result.error), { error: result.error })
    send(res, 200, {
      token: result.token,
      expiresAt: result.expiresAt,
      code: result.code,
    })
  } catch {
    send(res, 500, { error: 'server_error' })
  }
}
