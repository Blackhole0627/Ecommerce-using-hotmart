/**
 * Base das contas: codigo por e-mail, login com Google, sessao, perfil e o
 * progresso salvo na nuvem.
 *
 * Como o resto de api/, sem dependencia nova: fetch, WebCrypto e o mesmo
 * Redis das licencas. Arquivos com "_" nao viram rota na Vercel.
 *
 * A conta NAO substitui a licenca, ela a protege. Antes, quem digitasse o
 * e-mail de uma compradora entrava no lugar dela; agora o e-mail tem de ser
 * provado (codigo na caixa de entrada, ou Google), e so depois disso a
 * licenca offline de sempre e emitida. Reembolso, limite de aparelhos e uso
 * sem internet continuam exatamente como estavam.
 *
 * Privacidade, e o motivo de algumas escolhas abaixo parecerem menos
 * "amigaveis" do que poderiam: saber que um e-mail comprou este produto ja e
 * uma informacao intima. Entao nenhuma resposta revela se um e-mail comprou ou
 * nao. Quem pede um codigo sempre ouve "se este for o e-mail da compra, o
 * codigo esta a caminho", e so recebe codigo quem de fato comprou.
 */
import { getCode, kv, normalizeEmail, type Req } from './_lib.js'

declare const process: { env: Record<string, string | undefined> }

/* --------------------------------------------------------------------------
   Configuracao
   -------------------------------------------------------------------------- */

/**
 * Com isto ligado, /api/activate deixa de aceitar um e-mail "solto": exige a
 * sessao daquele mesmo e-mail. E o que fecha a porta lateral de pular o login
 * chamando a rota antiga direto. Ver activate.ts.
 */
export const authRequired = (): boolean => process.env.AUTH_REQUIRED === 'true'

export const googleClientId = (): string | null => process.env.GOOGLE_CLIENT_ID ?? null

const GOOGLE_JWKS_URL = process.env.GOOGLE_JWKS_URL ?? 'https://www.googleapis.com/oauth2/v3/certs'
const RESEND_API_URL = process.env.RESEND_API_URL ?? 'https://api.resend.com/emails'
const MAIL_FROM = process.env.AUTH_MAIL_FROM ?? 'The Squeeze Method <login@femivita.online>'

/** Sessao longa: quem treina todo dia nao pode ser deslogada toda semana. */
export const SESSION_DAYS = 90
/** Abaixo disto, a resposta ja devolve uma sessao renovada. */
const SESSION_REFRESH_DAYS = 60

export const OTP_MINUTES = 10
const OTP_MAX_TRIES = 5
/** Por e-mail: cinco codigos por hora cobre quem nao achou o primeiro. */
const MAIL_PER_HOUR = 5
/**
 * Por IP: freia quem tenta disparar e-mail para uma lista de enderecos. A
 * variavel so existe para a verificacao automatica, que faz todas as
 * requisicoes do mesmo endereco.
 */
const IP_PER_HOUR = Number(process.env.AUTH_IP_PER_HOUR ?? 30)

/* --------------------------------------------------------------------------
   Base64url e segredo de sessao
   -------------------------------------------------------------------------- */

const enc = new TextEncoder()
const dec = new TextDecoder()

const b64url = (bytes: Uint8Array): string => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromB64url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export const hasSessionSecret = (): boolean => Boolean(process.env.LICENSE_PRIVATE_KEY)

let hmacKey: CryptoKey | null = null

/**
 * A chave das sessoes sai da chave privada das licencas, por hash. Assim nao
 * existe um segredo novo para configurar e esquecer, e trocar a chave das
 * licencas (o que so se faz se ela vazar) derruba as sessoes junto.
 */
async function sessionKey(): Promise<CryptoKey> {
  if (hmacKey) return hmacKey
  const pem = process.env.LICENSE_PRIVATE_KEY
  if (!pem) throw new Error('LICENSE_PRIVATE_KEY nao configurada')
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`squeeze-session:${pem.trim()}`))
  hmacKey = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
  return hmacKey
}

async function hmac(text: string): Promise<string> {
  const sig = await crypto.subtle.sign('HMAC', await sessionKey(), enc.encode(text))
  return b64url(new Uint8Array(sig))
}

/** Comparacao em tempo constante: o tempo da resposta nao pode vazar o segredo. */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/* --------------------------------------------------------------------------
   Sessao
   -------------------------------------------------------------------------- */

interface SessionClaims {
  /** E-mail da compra. */
  e: string
  /** Geracao da sessao: excluir a conta sobe o numero e invalida as antigas. */
  g: number
  iat: number
  exp: number
}

export async function signSession(email: string, generation: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const claims: SessionClaims = { e: email, g: generation, iat: now, exp: now + SESSION_DAYS * 86400 }
  const payload = b64url(enc.encode(JSON.stringify(claims)))
  return `s1.${payload}.${await hmac(`s1.${payload}`)}`
}

async function readSession(token: string): Promise<SessionClaims | null> {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 's1') return null
  if (!sameSecret(parts[2], await hmac(`s1.${parts[1]}`))) return null
  try {
    const c = JSON.parse(dec.decode(fromB64url(parts[1]))) as SessionClaims
    if (typeof c.e !== 'string' || typeof c.exp !== 'number' || typeof c.g !== 'number') return null
    if (c.exp * 1000 <= Date.now()) return null
    return c
  } catch {
    return null
  }
}

/* --------------------------------------------------------------------------
   Conta e progresso
   -------------------------------------------------------------------------- */

export interface UserRecord {
  name: string
  /** Foto do Google, quando entrou por la. Nunca uma foto enviada. */
  photo: string
  createdAt: number
  /** Geracao das sessoes. Ver SessionClaims.g. */
  generation: number
  /** Contas Google ligadas a este e-mail, para a exclusao apagar os vinculos. */
  googleSubs: string[]
}

const userKey = (email: string) => `user:${email}`
const progressKey = (email: string) => `progress:${email}`
const googleKey = (sub: string) => `auth:google:${sub}`

async function getJson<T>(key: string): Promise<T | null> {
  const raw = await kv<string | null>('GET', key)
  if (!raw) return null
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return null
  }
}

const setJson = (key: string, value: unknown, ttlSeconds?: number) =>
  ttlSeconds
    ? kv('SET', key, JSON.stringify(value), 'EX', ttlSeconds)
    : kv('SET', key, JSON.stringify(value))

export const getUser = (email: string) => getJson<UserRecord>(userKey(email))
export const putUser = (email: string, user: UserRecord) => setJson(userKey(email), user)

export const emptyUser = (): UserRecord => ({
  name: '',
  photo: '',
  createdAt: Date.now(),
  generation: 0,
  googleSubs: [],
})

export const getProgress = (email: string) => getJson<unknown>(progressKey(email))
export const putProgress = (email: string, progress: unknown) => setJson(progressKey(email), progress)

/**
 * Apaga perfil, progresso e vinculos com o Google. A compra NAO e apagada: ela
 * e da plataforma de venda, e a pessoa pode entrar de novo depois, do zero.
 */
export async function deleteAccount(email: string): Promise<void> {
  const user = await getUser(email)
  for (const sub of user?.googleSubs ?? []) await kv('DEL', googleKey(sub))
  await kv('DEL', progressKey(email))
  // A conta some, mas a geracao fica gravada um passo acima: uma sessao antiga
  // guardada em outro aparelho nao pode reviver a conta recriada depois.
  await putUser(email, { ...emptyUser(), generation: (user?.generation ?? 0) + 1, createdAt: 0 })
}

/** Nome digitado pela pessoa: sem caracteres de controle, tamanho de nome. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  // Tira so os caracteres de controle (U+0000 a U+001F e U+007F), um a um.
  let semControle = ''
  for (const ch of raw) {
    const c = ch.charCodeAt(0)
    if (c > 31 && c !== 127) semControle += ch
  }
  const s = semControle.replace(/\s+/g, ' ').trim()
  return s.length <= 60 ? s : null
}

/** Uma conta existe e esta "viva" (criada e nao excluida). */
const alive = (user: UserRecord | null): user is UserRecord => Boolean(user && user.createdAt > 0)

/**
 * Quem e a pessoa desta requisicao, pela sessao no cabecalho Authorization.
 * Null se nao houver sessao valida, ou se a conta foi excluida depois dela.
 */
export async function authenticate(
  req: Req,
): Promise<{ email: string; user: UserRecord; refreshed: string | null } | null> {
  const header = req.headers.authorization ?? req.headers.Authorization
  const value = Array.isArray(header) ? header[0] : header
  const token = typeof value === 'string' && value.startsWith('Bearer ') ? value.slice(7).trim() : ''
  if (!token || !hasSessionSecret()) return null

  const claims = await readSession(token)
  if (!claims) return null
  const user = await getUser(claims.e)
  if (!alive(user) || user.generation !== claims.g) return null

  const daysLeft = (claims.exp * 1000 - Date.now()) / 86400000
  const refreshed = daysLeft < SESSION_REFRESH_DAYS ? await signSession(claims.e, user.generation) : null
  return { email: claims.e, user, refreshed }
}

/* --------------------------------------------------------------------------
   Compra
   -------------------------------------------------------------------------- */

export type PurchaseState = 'active' | 'revoked' | 'none'

/** O e-mail tem uma compra? Le o mesmo registro que o webhook da Hotmart grava. */
export async function purchaseOf(email: string): Promise<PurchaseState> {
  const rec = await getCode(email)
  if (!rec) return 'none'
  return rec.status === 'revoked' ? 'revoked' : 'active'
}

/* --------------------------------------------------------------------------
   Limite de envios
   -------------------------------------------------------------------------- */

interface RateWindow {
  n: number
  start: number
}

/** Janela fixa de uma hora. Corrida entre duas requisicoes so deixa passar uma a mais. */
async function allow(key: string, max: number): Promise<boolean> {
  const now = Date.now()
  const w = await getJson<RateWindow>(key)
  const current = w && now - w.start < 3600_000 ? w : { n: 0, start: now }
  if (current.n >= max) return false
  current.n++
  await setJson(key, current, 3600)
  return true
}

export function clientIp(req: Req): string {
  const fwd = req.headers['x-forwarded-for']
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim()
  return first || 'desconhecido'
}

export const allowMail = (email: string, ip: string) =>
  Promise.all([allow(`auth:rl:mail:${email}`, MAIL_PER_HOUR), allow(`auth:rl:ip:${ip}`, IP_PER_HOUR)]).then(
    ([a, b]) => a && b,
  )

/* --------------------------------------------------------------------------
   Codigo por e-mail
   -------------------------------------------------------------------------- */

interface OtpRecord {
  /** Hash do codigo. O codigo em si nunca e guardado. */
  h: string
  exp: number
  tries: number
}

const otpKey = (email: string) => `auth:otp:${email}`
const otpHash = (email: string, code: string) => hmac(`otp:${email}:${code}`)

/** Seis digitos, sem vies de modulo. */
function sixDigits(): string {
  const limit = 4294967296 - (4294967296 % 1000000)
  let n = 0
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0]
  } while (n >= limit)
  return String(n % 1000000).padStart(6, '0')
}

/** Cria um codigo novo e substitui qualquer anterior: so o ultimo enviado vale. */
export async function createOtp(email: string): Promise<string> {
  const code = sixDigits()
  const rec: OtpRecord = { h: await otpHash(email, code), exp: Date.now() + OTP_MINUTES * 60_000, tries: 0 }
  await setJson(otpKey(email), rec, OTP_MINUTES * 60)
  return code
}

export type OtpCheck = 'ok' | 'bad_code' | 'expired' | 'too_many'

/**
 * Confere o codigo. Um e-mail que nunca recebeu codigo responde 'bad_code',
 * igual a um codigo errado: a resposta nao pode dizer quem comprou.
 */
export async function checkOtp(email: string, rawCode: unknown): Promise<OtpCheck> {
  const code = typeof rawCode === 'string' ? rawCode.replace(/\D/g, '') : ''
  const rec = await getJson<OtpRecord>(otpKey(email))
  if (!rec) return 'bad_code'
  if (Date.now() > rec.exp) {
    await kv('DEL', otpKey(email))
    return 'expired'
  }
  if (rec.tries >= OTP_MAX_TRIES) return 'too_many'
  if (code.length === 6 && sameSecret(rec.h, await otpHash(email, code))) {
    // Uso unico: o mesmo codigo nao abre um segundo aparelho.
    await kv('DEL', otpKey(email))
    return 'ok'
  }
  rec.tries++
  const ttl = Math.max(1, Math.ceil((rec.exp - Date.now()) / 1000))
  await setJson(otpKey(email), rec, ttl)
  return rec.tries >= OTP_MAX_TRIES ? 'too_many' : 'bad_code'
}

/* --------------------------------------------------------------------------
   Envio do e-mail
   -------------------------------------------------------------------------- */

const MAIL_TEXT = {
  en: {
    subject: (code: string) => `${code} is your sign-in code`,
    intro: 'Here is your code to sign in to The Squeeze Method:',
    expires: `It expires in ${OTP_MINUTES} minutes and works only once.`,
    ignore: 'If you did not ask for this, you can ignore this e-mail. Nobody can sign in without the code.',
  },
  pt: {
    subject: (code: string) => `${code} é o seu código de acesso`,
    intro: 'Aqui está o seu código para entrar no The Squeeze Method:',
    expires: `Ele vale por ${OTP_MINUTES} minutos e só pode ser usado uma vez.`,
    ignore: 'Se você não pediu este código, pode ignorar este e-mail. Ninguém entra sem ele.',
  },
} as const

export type MailLang = keyof typeof MAIL_TEXT

/**
 * Envia o codigo pela Resend. Devolve se deu certo; quem chama NAO repassa a
 * falha para a pessoa (isso revelaria que o e-mail tem compra), so registra.
 *
 * Sem chave configurada, AUTH_DEV_LOG_CODES=true escreve o codigo no log: e
 * para desenvolvimento e verificacao, nunca para producao.
 */
export async function sendCode(email: string, code: string, lang: MailLang): Promise<boolean> {
  const t = MAIL_TEXT[lang] ?? MAIL_TEXT.en
  const key = process.env.RESEND_API_KEY

  if (!key) {
    if (process.env.AUTH_DEV_LOG_CODES === 'true') {
      console.log(`[auth] codigo de ${email}: ${code}`)
      return true
    }
    console.error('[auth] RESEND_API_KEY nao configurada; codigo nao enviado')
    return false
  }

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#3B2B26;max-width:420px;margin:0 auto;padding:24px">` +
    `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${t.intro}</p>` +
    `<p style="font-size:34px;font-weight:700;letter-spacing:6px;margin:0 0 16px;color:#237972">${code}</p>` +
    `<p style="font-size:14px;line-height:1.5;margin:0 0 12px">${t.expires}</p>` +
    `<p style="font-size:13px;line-height:1.5;margin:0;color:#8F837D">${t.ignore}</p>` +
    `</div>`

  try {
    const r = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [email],
        subject: t.subject(code),
        html,
        text: `${t.intro}\n\n${code}\n\n${t.expires}\n\n${t.ignore}`,
      }),
    })
    if (!r.ok) console.error(`[auth] envio recusado pela Resend: HTTP ${r.status}`)
    return r.ok
  } catch (e) {
    console.error(`[auth] falha ao enviar codigo: ${(e as Error).message}`)
    return false
  }
}

/* --------------------------------------------------------------------------
   Google
   -------------------------------------------------------------------------- */

interface GoogleJwk extends JsonWebKey {
  kid?: string
}

let jwksCache: { keys: GoogleJwk[]; at: number } | null = null

async function googleKeys(force = false): Promise<GoogleJwk[]> {
  if (!force && jwksCache && Date.now() - jwksCache.at < 3600_000) return jwksCache.keys
  const r = await fetch(GOOGLE_JWKS_URL)
  if (!r.ok) throw new Error(`jwks HTTP ${r.status}`)
  const data = (await r.json()) as { keys?: GoogleJwk[] }
  jwksCache = { keys: data.keys ?? [], at: Date.now() }
  return jwksCache.keys
}

export interface GoogleIdentity {
  sub: string
  email: string
  name: string
  picture: string
}

/**
 * Confere o "credential" que o botao do Google entrega: assinatura RS256 com
 * as chaves publicas do Google, emissor, destinatario (o nosso Client ID),
 * validade e e-mail confirmado. Qualquer falha devolve null.
 */
export async function verifyGoogle(credential: unknown): Promise<GoogleIdentity | null> {
  const aud = googleClientId()
  if (!aud || typeof credential !== 'string') return null
  const parts = credential.split('.')
  if (parts.length !== 3) return null

  try {
    const header = JSON.parse(dec.decode(fromB64url(parts[0]))) as { alg?: string; kid?: string }
    if (header.alg !== 'RS256' || !header.kid) return null

    // Chave nova do Google ainda fora do cache: busca de novo uma vez.
    let jwk = (await googleKeys()).find((k) => k.kid === header.kid)
    if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === header.kid)
    if (!jwk) return null

    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      fromB64url(parts[2]),
      enc.encode(`${parts[0]}.${parts[1]}`),
    )
    if (!ok) return null

    const c = JSON.parse(dec.decode(fromB64url(parts[1]))) as Record<string, unknown>
    const now = Date.now() / 1000
    const issOk = c.iss === 'accounts.google.com' || c.iss === 'https://accounts.google.com'
    const verified = c.email_verified === true || c.email_verified === 'true'
    if (!issOk || c.aud !== aud || !verified) return null
    if (typeof c.exp !== 'number' || c.exp < now - 60) return null
    if (typeof c.sub !== 'string') return null

    const email = normalizeEmail(c.email)
    if (!email) return null
    const picture = typeof c.picture === 'string' && c.picture.startsWith('https://') ? c.picture : ''
    return { sub: c.sub, email, name: cleanName(c.given_name ?? c.name) ?? '', picture }
  } catch {
    return null
  }
}

/** E-mail de compra ja ligado a esta conta Google, se houver. */
export const linkedEmail = async (sub: string): Promise<string | null> => {
  const v = await kv<string | null>('GET', googleKey(sub))
  return v ? String(v) : null
}

/** Liga a conta Google ao e-mail de compra, e guarda nome e foto se faltarem. */
export async function linkGoogle(email: string, user: UserRecord, g: GoogleIdentity): Promise<UserRecord> {
  await kv('SET', googleKey(g.sub), email)
  const updated: UserRecord = {
    ...user,
    name: user.name || g.name,
    photo: g.picture || user.photo,
    googleSubs: user.googleSubs.includes(g.sub) ? user.googleSubs : [...user.googleSubs, g.sub],
  }
  await putUser(email, updated)
  return updated
}
