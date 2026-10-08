/**
 * POST /api/auth — entrar na conta.
 *
 * Uma rota so, com tres acoes, porque o plano gratuito da Vercel limita o
 * numero de funcoes por projeto:
 *
 *   { action: 'start',  email }                      -> manda o codigo
 *   { action: 'verify', email, code, deviceId }      -> confere e entra
 *   { action: 'google', credential, deviceId }       -> entra com o Google
 *
 * 'verify' aceita tambem `googleCredential`: e o caso de quem tentou o Google
 * com um Gmail diferente do e-mail da compra. Ela prova o e-mail da compra
 * pelo codigo e, na mesma ida, liga as duas contas. Da proxima vez o botao do
 * Google ja entra direto.
 *
 * As tres devolvem a mesma coisa quando dao certo: a sessao (para o progresso
 * na nuvem) e a licenca offline de sempre (para o app abrir sem internet).
 */
import {
  allowMail,
  checkOtp,
  clientIp,
  createOtp,
  emptyUser,
  getUser,
  hasSessionSecret,
  linkedEmail,
  linkGoogle,
  purchaseOf,
  putUser,
  sendCode,
  signSession,
  verifyGoogle,
  type GoogleIdentity,
  type MailLang,
  type UserRecord,
} from './_auth.js'
import {
  hasSigningKey,
  httpFor,
  issue,
  normalizeEmail,
  readBody,
  send,
  storeReady,
  type Req,
  type Res,
} from './_lib.js'

/** Conta nova, ou recriada depois de excluida (mantendo a geracao das sessoes). */
async function ensureUser(email: string): Promise<UserRecord> {
  const user = await getUser(email)
  if (user && user.createdAt > 0) return user
  const fresh: UserRecord = { ...emptyUser(), generation: user?.generation ?? 0 }
  await putUser(email, fresh)
  return fresh
}

/** Licenca + sessao + perfil: o fim comum dos tres caminhos de entrada. */
async function finish(res: Res, email: string, deviceId: unknown, google: GoogleIdentity | null) {
  const licence = await issue(email, deviceId, 'activate')
  if (!licence.ok) return send(res, httpFor(licence.error), { error: licence.error })

  let user = await ensureUser(email)
  if (google) user = await linkGoogle(email, user, google)

  send(res, 200, {
    session: await signSession(email, user.generation),
    licence: { token: licence.token, expiresAt: licence.expiresAt, code: licence.code },
    user: { email, name: user.name, photo: user.photo },
  })
}

async function start(req: Req, res: Res, body: Record<string, unknown>) {
  const email = normalizeEmail(body.email)
  if (!email) return send(res, 400, { error: 'bad_email' })
  if (!(await allowMail(email, clientIp(req)))) return send(res, 429, { error: 'rate_limited' })

  // So recebe codigo quem comprou. Mas a resposta e a mesma para todo mundo:
  // ela nao pode servir para descobrir se um e-mail comprou este produto.
  if ((await purchaseOf(email)) === 'active') {
    const lang: MailLang = body.lang === 'pt' ? 'pt' : 'en'
    await sendCode(email, await createOtp(email), lang)
  }
  send(res, 200, { ok: true })
}

async function verify(res: Res, body: Record<string, unknown>) {
  const email = normalizeEmail(body.email)
  if (!email) return send(res, 400, { error: 'bad_email' })

  const check = await checkOtp(email, body.code)
  if (check !== 'ok') return send(res, check === 'too_many' ? 429 : 401, { error: check })

  // Codigo certo so existe para quem comprou, mas a compra pode ter sido
  // reembolsada entre o envio e a digitacao.
  const purchase = await purchaseOf(email)
  if (purchase === 'revoked') return send(res, 403, { error: 'revoked' })
  if (purchase === 'none') return send(res, 401, { error: 'bad_code' })

  // O Google e opcional aqui; se vier invalido, entra so com o e-mail.
  const google = body.googleCredential ? await verifyGoogle(body.googleCredential) : null
  await finish(res, email, body.deviceId, google)
}

async function google(res: Res, body: Record<string, unknown>) {
  const identity = await verifyGoogle(body.credential)
  if (!identity) return send(res, 401, { error: 'google_failed' })

  const email = (await linkedEmail(identity.sub)) ?? identity.email
  const purchase = await purchaseOf(email)
  if (purchase === 'revoked') return send(res, 403, { error: 'revoked' })
  if (purchase === 'none') {
    // Aqui pode dizer: quem pergunta provou ser dono deste Gmail, e esta so
    // descobrindo que ELE nao e o e-mail da propria compra.
    return send(res, 404, { error: 'no_purchase', googleEmail: identity.email })
  }
  await finish(res, email, body.deviceId, identity)
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' })
  if (!storeReady() || !hasSigningKey() || !hasSessionSecret()) {
    return send(res, 503, { error: 'store_unavailable' })
  }

  const body = readBody(req)
  try {
    if (body.action === 'start') return await start(req, res, body)
    if (body.action === 'verify') return await verify(res, body)
    if (body.action === 'google') return await google(res, body)
    send(res, 400, { error: 'bad_action' })
  } catch (e) {
    console.error(`[auth] ${(e as Error).message}`)
    send(res, 500, { error: 'server_error' })
  }
}
