/**
 * Entrar, sair e falar com a conta. As rotas estao em api/auth.ts e
 * api/account.ts; aqui so fica o lado do aparelho.
 *
 * Toda resposta de erro vira um codigo curto (AuthError), que a tela traduz.
 * Falta de rede e separada de erro do servidor: "sem internet" pede outra
 * atitude da pessoa do que "codigo errado".
 */
import type { SyncedProgress } from '../../api/_merge'
import { deviceId, licenceFromToken, saveLicence } from './license'
import { authHeader, loadSession, saveSession, type Account, type Session } from './session'

export type AuthError =
  | 'bad_email'
  | 'bad_code'
  | 'expired'
  | 'too_many'
  | 'rate_limited'
  | 'revoked'
  | 'device_limit'
  | 'google_failed'
  | 'no_purchase'
  | 'offline'
  | 'store_unavailable'
  | 'server_error'

const KNOWN: AuthError[] = [
  'bad_email',
  'bad_code',
  'expired',
  'too_many',
  'rate_limited',
  'revoked',
  'device_limit',
  'google_failed',
  'no_purchase',
  'store_unavailable',
]

interface Reply<T> {
  ok: boolean
  status: number
  data: T & { error?: string; session?: string }
  offline: boolean
}

async function call<T>(method: string, path: string, body?: unknown, auth = false): Promise<Reply<T>> {
  let r: Response
  try {
    r = await fetch(path, {
      method,
      cache: 'no-store',
      // O envio do progresso dispara quando o app sai da tela: keepalive deixa
      // a requisicao terminar mesmo com a pagina indo para segundo plano.
      keepalive: method === 'PUT',
      headers: { 'Content-Type': 'application/json', ...(auth ? authHeader() : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return { ok: false, status: 0, data: {} as Reply<T>['data'], offline: true }
  }
  let data = {} as Reply<T>['data']
  try {
    data = (await r.json()) as Reply<T>['data']
  } catch {
    /* sem corpo */
  }
  // A conta devolve uma sessao renovada quando a atual esta perto de vencer.
  if (auth && typeof data.session === 'string') {
    const current = loadSession()
    if (current) saveSession({ ...current, token: data.session })
  }
  return { ok: r.ok, status: r.status, data, offline: false }
}

const toError = (reply: Reply<unknown>): AuthError =>
  reply.offline
    ? 'offline'
    : KNOWN.includes(reply.data.error as AuthError)
      ? (reply.data.error as AuthError)
      : 'server_error'

/* --------------------------------------------------------------------------
   Entrar
   -------------------------------------------------------------------------- */

export type SignInResult =
  | { ok: true; session: Session }
  | { ok: false; error: AuthError; googleEmail?: string }

interface SignInData {
  session?: string
  licence?: { token: string; expiresAt: number; code: string }
  user?: Account
  googleEmail?: string
}

/**
 * Fecha a entrada: guarda a sessao e a licenca. A licenca e conferida aqui,
 * pela assinatura, antes de ser guardada: uma resposta adulterada no caminho
 * nao destrava nada.
 */
async function settle(reply: Reply<SignInData>): Promise<SignInResult> {
  const { session, licence, user } = reply.data
  if (!reply.ok || !session || !licence || !user) {
    return { ok: false, error: toError(reply), googleEmail: reply.data.googleEmail }
  }
  const accepted = await licenceFromToken(licence.token, licence.code)
  if (!accepted) return { ok: false, error: 'server_error' }
  saveLicence(accepted)
  const s: Session = { token: session, user }
  saveSession(s)
  return { ok: true, session: s }
}

/** Pede o codigo. Sempre "ok" quando o servidor responde: ele nao diz quem comprou. */
export async function requestCode(email: string, lang: 'en' | 'pt'): Promise<{ ok: boolean; error?: AuthError }> {
  const reply = await call('POST', '/api/auth', { action: 'start', email, lang })
  return reply.ok ? { ok: true } : { ok: false, error: toError(reply) }
}

export async function verifyCode(email: string, code: string, googleCredential?: string): Promise<SignInResult> {
  const reply = await call<SignInData>('POST', '/api/auth', {
    action: 'verify',
    email,
    code,
    deviceId: deviceId(),
    googleCredential,
  })
  return settle(reply)
}

export async function signInWithGoogle(credential: string): Promise<SignInResult> {
  const reply = await call<SignInData>('POST', '/api/auth', {
    action: 'google',
    credential,
    deviceId: deviceId(),
  })
  return settle(reply)
}

/* --------------------------------------------------------------------------
   Conta
   -------------------------------------------------------------------------- */

export type AccountReply =
  | { ok: true; user: Account; progress: SyncedProgress | null }
  | { ok: false; signedOut: boolean; offline: boolean }

export async function fetchAccount(): Promise<AccountReply> {
  const reply = await call<{ user?: Account; progress?: SyncedProgress | null }>('GET', '/api/account', undefined, true)
  if (reply.ok && reply.data.user) {
    return { ok: true, user: reply.data.user, progress: reply.data.progress ?? null }
  }
  return { ok: false, signedOut: reply.status === 401, offline: reply.offline }
}

export type PushReply =
  | { ok: true; progress: SyncedProgress }
  | { ok: false; signedOut: boolean; offline: boolean }

export async function pushProgress(progress: SyncedProgress): Promise<PushReply> {
  const reply = await call<{ progress?: SyncedProgress }>('PUT', '/api/account', { progress }, true)
  if (reply.ok && reply.data.progress) return { ok: true, progress: reply.data.progress }
  return { ok: false, signedOut: reply.status === 401, offline: reply.offline }
}

export async function renameAccount(name: string): Promise<Account | null> {
  const reply = await call<{ user?: Account }>('PATCH', '/api/account', { name }, true)
  if (!reply.ok || !reply.data.user) return null
  const current = loadSession()
  if (current) saveSession({ ...current, user: reply.data.user })
  return reply.data.user
}

export async function deleteRemoteAccount(): Promise<boolean> {
  const reply = await call('DELETE', '/api/account', undefined, true)
  return reply.ok
}
