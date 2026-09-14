/**
 * POST /api/activate — troca um codigo de compra por uma licenca assinada.
 *
 * E a unica porta de entrada do app. A resposta e um token curto, com validade,
 * que o aparelho depois confere sozinho, sem internet.
 */
import { httpFor, issue, readBody, send, type Req, type Res } from './_lib.js'

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })

  const body = readBody(req)
  try {
    const result = await issue(body.code, body.deviceId, 'activate')
    if (!result.ok) return send(res, httpFor(result.error), { error: result.error })
    send(res, 200, {
      token: result.token,
      expiresAt: result.expiresAt,
      code: result.code,
    })
  } catch {
    // Nunca detalhar a falha: a mensagem sai para qualquer pessoa na internet.
    send(res, 500, { error: 'server_error' })
  }
}
