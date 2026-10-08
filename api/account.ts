/**
 * /api/account — a conta de quem esta logada.
 *
 *   GET     perfil e progresso salvo
 *   PUT     { progress }  junta com o salvo e devolve o resultado
 *   PATCH   { name }      troca o nome
 *   DELETE                apaga conta e progresso (a compra continua valendo)
 *
 * Toda chamada exige a sessao no cabecalho Authorization. A resposta traz
 * `session` quando a sessao estava perto de vencer: o app troca a guardada
 * por ela, e quem usa o app nunca e deslogada por tempo.
 *
 * O PUT junta no SERVIDOR, com a mesma regra do aparelho (api/_merge.ts). Se
 * dois celulares salvarem ao mesmo tempo, o segundo nao apaga o que o
 * primeiro gravou: o resultado ja e a uniao dos dois.
 */
import { authenticate, cleanName, deleteAccount, getProgress, putProgress, putUser } from './_auth.js'
import { mergeProgress, sameProgress, sanitizeProgress } from './_merge.js'
import { readBody, send, storeReady, type Req, type Res } from './_lib.js'

export default async function handler(req: Req, res: Res): Promise<void> {
  if (!storeReady()) return send(res, 503, { error: 'store_unavailable' })

  try {
    const who = await authenticate(req)
    if (!who) return send(res, 401, { error: 'signed_out' })
    const { email, user, refreshed } = who
    const session = refreshed ?? undefined

    if (req.method === 'GET') {
      const stored = await getProgress(email)
      return send(res, 200, {
        user: { email, name: user.name, photo: user.photo },
        progress: stored ? sanitizeProgress(stored) : null,
        session,
      })
    }

    if (req.method === 'PUT') {
      const body = readBody(req)
      const incoming = sanitizeProgress(body.progress)
      const stored = await getProgress(email)
      const current = stored ? sanitizeProgress(stored) : null
      const merged = current ? mergeProgress(current, incoming) : incoming
      if (!current || !sameProgress(current, merged)) await putProgress(email, merged)
      return send(res, 200, { progress: merged, session })
    }

    if (req.method === 'PATCH') {
      const name = cleanName(readBody(req).name)
      if (name === null) return send(res, 400, { error: 'bad_name' })
      await putUser(email, { ...user, name })
      return send(res, 200, { user: { email, name, photo: user.photo }, session })
    }

    if (req.method === 'DELETE') {
      await deleteAccount(email)
      return send(res, 200, { ok: true })
    }

    send(res, 405, { error: 'method_not_allowed' })
  } catch (e) {
    console.error(`[account] ${(e as Error).message}`)
    send(res, 500, { error: 'server_error' })
  }
}
