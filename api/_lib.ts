/**
 * Base das rotas de licenca: armazenamento, assinatura e emissao.
 *
 * Arquivos que comecam com "_" nao viram rota na Vercel — este e so a
 * biblioteca compartilhada por activate.ts, renew.ts e admin.ts.
 *
 * Nao ha dependencia nova aqui de proposito: tudo usa fetch e WebCrypto, que
 * ja existem no runtime Node da Vercel. Uma biblioteca de JWT ou de Redis
 * seria peso a mais para trocar duas mensagens HTTP.
 */

// O tsconfig do app nao carrega os tipos do Node (o alvo e o navegador). Aqui
// so precisamos de process.env, entao ele e declarado a mao em vez de arrastar
// @types/node para dentro do build do front.
declare const process: { env: Record<string, string | undefined> }

/* --------------------------------------------------------------------------
   Formato HTTP das rotas
   -------------------------------------------------------------------------- */

export interface Req {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}

export interface Res {
  status(code: number): Res
  setHeader(name: string, value: string): void
  json(body: unknown): void
}

/**
 * Resposta padrao. `no-store` e obrigatorio: se uma resposta de licenca ficar
 * em cache — no navegador, no service worker ou na borda da Vercel — a revoga
 * cao para de funcionar em silencio, que e o pior defeito possivel aqui.
 */
export function send(res: Res, code: number, body: unknown): void {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.status(code).json(body)
}

/** O corpo chega como objeto quando o content-type e JSON, e como texto quando nao e. */
export function readBody(req: Req): Record<string, unknown> {
  const raw = req.body
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

/* --------------------------------------------------------------------------
   Codigos
   -------------------------------------------------------------------------- */

/**
 * Alfabeto sem caracteres ambiguos: sem I, O, 0 e 1. O codigo vai ser digitado
 * no celular, por gente lendo de um e-mail — cada par confundivel vira suporte.
 */
export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = 'SQZ'

/**
 * Aceita o que a compradora digitar. Espacos, minusculas, tracos a mais ou a
 * menos, e ate o prefixo esquecido: tudo vira a mesma forma canonica
 * SQZ-XXXXX-XXXXX. So o que sobrar depois disso e comparado.
 */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length)
  if (s.length !== 10) return null
  for (const ch of s) if (!ALPHABET.includes(ch)) return null
  return `${PREFIX}-${s.slice(0, 5)}-${s.slice(5)}`
}

/**
 * O e-mail da compra, tratado como identificador.
 *
 * Este e o caminho normal desde que a Hotmart confirmou que nao distribui lista
 * de codigos: nao ha nada para entregar a compradora, porque ela ja sabe com
 * que e-mail comprou. O codigo continua existindo para os casos manuais — um
 * acesso de cortesia, um suporte, uma venda fora da plataforma.
 *
 * Normalizacao conservadora, so minusculas e espacos: mexer em ponto e sinal de
 * mais quebraria enderecos legitimos em dominios que os tratam como distintos,
 * e o que a plataforma manda no webhook e o que a pessoa vai digitar.
 */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim().toLowerCase()
  if (s.length < 6 || s.length > 254) return null
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s)) return null
  return s
}

/**
 * Aceita as duas formas de identificacao e devolve a forma canonica.
 * O armazenamento nao distingue: para ele e uma chave de texto com uma
 * situacao, aparelhos e uma data de bloqueio.
 */
export function normalizeId(input: unknown): string | null {
  return normalizeCode(input) ?? normalizeEmail(input)
}

/** Gera um lote de codigos unicos, prontos para subir na plataforma de venda. */
export function makeCodes(quantity: number): string[] {
  const out = new Set<string>()
  while (out.size < quantity) {
    const bytes = crypto.getRandomValues(new Uint8Array(10))
    let s = ''
    // Rejeicao de modulo: 256 nao e multiplo de 32, entao aceitar
    // byte % 32 direto enviesaria as primeiras letras do alfabeto.
    for (let i = 0; i < bytes.length; i++) {
      let b = bytes[i]
      while (b >= 256 - (256 % ALPHABET.length)) b = crypto.getRandomValues(new Uint8Array(1))[0]
      s += ALPHABET[b % ALPHABET.length]
    }
    out.add(`${PREFIX}-${s.slice(0, 5)}-${s.slice(5)}`)
  }
  return [...out]
}

/* --------------------------------------------------------------------------
   Armazenamento (Vercel KV / Upstash Redis, por REST)
   -------------------------------------------------------------------------- */

/*
 * Duas formas de falar com o banco, e o motivo de existirem as duas.
 *
 * A conta da cliente ficou com um Redis Cloud, que fala o protocolo Redis por
 * TCP e nao tem API HTTP. Ja a verificacao automatizada sobe um servidor de
 * mentira que responde o protocolo REST da Upstash, e e assim que as 36
 * conferencias rodam sem depender de um banco de verdade.
 *
 * Entao o transporte e escolhido pelo que estiver configurado, e o resto do
 * arquivo nao sabe qual dos dois esta em uso: os comandos sao os mesmos,
 * escritos como ['GET', chave], que e exatamente o formato que o sendCommand
 * do cliente Redis tambem aceita.
 */
const STORE_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const STORE_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
const REDIS_URL = process.env.REDIS_URL

export const storeReady = (): boolean => Boolean((STORE_URL && STORE_TOKEN) || REDIS_URL)

/** Cliente reaproveitado entre chamadas na mesma instancia: abrir TLS a cada
 *  requisicao custaria mais que a propria consulta, e o plano gratuito tem um
 *  limite baixo de conexoes simultaneas. */
interface ClienteRedis {
  isOpen: boolean
  connect: () => Promise<unknown>
  sendCommand: (cmd: string[]) => Promise<unknown>
  /** Opcional: as versoes do cliente divergem sobre expor o emissor de eventos. */
  on?: (evento: string, cb: () => void) => void
}

let cliente: ClienteRedis | null = null

async function viaTcp<T>(cmd: string[]): Promise<T> {
  if (!cliente) {
    const { createClient } = await import('redis')
    const c = createClient({ url: REDIS_URL }) as unknown as ClienteRedis
    // Sem este ouvinte, uma queda de conexao vira excecao nao tratada e derruba
    // a funcao inteira em vez de falhar so aquela consulta.
    c.on?.('error', () => {})
    cliente = c
  }
  if (!cliente.isOpen) await cliente.connect()
  return (await cliente.sendCommand(cmd)) as T
}

async function viaRest<T>(cmd: string[]): Promise<T> {
  const r = await fetch(STORE_URL as string, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STORE_TOKEN as string}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  })
  const data = (await r.json()) as { result?: T; error?: string }
  if (!r.ok || data.error) throw new Error(data.error ?? `store HTTP ${r.status}`)
  return data.result as T
}

async function redis<T>(...cmd: (string | number)[]): Promise<T> {
  const texto = cmd.map(String)
  return STORE_URL && STORE_TOKEN ? viaRest<T>(texto) : viaTcp<T>(texto)
}

export type CodeStatus = 'unused' | 'active' | 'revoked'

export interface CodeRecord {
  status: CodeStatus
  /** Hashes dos aparelhos ativados. O identificador cru nunca e guardado. */
  devices: string[]
  createdAt: number
  activatedAt: number | null
  revokedAt: number | null
  /** Anotacao livre: pedido, e-mail da compradora, motivo do bloqueio. */
  note: string
}

const key = (code: string) => `lic:code:${code}`
const INDEX = 'lic:codes'

export async function getCode(code: string): Promise<CodeRecord | null> {
  const raw = await redis<string | null>('GET', key(code))
  if (!raw) return null
  try {
    return JSON.parse(raw) as CodeRecord
  } catch {
    return null
  }
}

export async function putCode(code: string, rec: CodeRecord): Promise<void> {
  await redis('SET', key(code), JSON.stringify(rec))
  await redis('SADD', INDEX, code)
}

export async function listCodes(): Promise<string[]> {
  // O cliente TCP pode devolver Buffer; o REST devolve texto. Normaliza os dois.
  const bruto = (await redis<unknown>('SMEMBERS', INDEX)) ?? []
  return Array.isArray(bruto) ? bruto.map((v) => String(v)) : []
}

export async function dropCode(code: string): Promise<void> {
  await redis('DEL', key(code))
  await redis('SREM', INDEX, code)
}

export const emptyRecord = (note = ''): CodeRecord => ({
  status: 'unused',
  devices: [],
  createdAt: Date.now(),
  activatedAt: null,
  revokedAt: null,
  note,
})

/* --------------------------------------------------------------------------
   Assinatura ES256
   -------------------------------------------------------------------------- */

const enc = new TextEncoder()

const b64urlFromBytes = (bytes: Uint8Array): string => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Sem anotacao de retorno de proposito: o TypeScript infere Uint8Array<ArrayBuffer>,
// que e o que o WebCrypto aceita. Escrever "Uint8Array" alargaria para
// ArrayBufferLike e o importKey deixaria de compilar.
const bytesFromB64 = (b64: string) => {
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export const hasSigningKey = (): boolean => Boolean(process.env.LICENSE_PRIVATE_KEY)

let cachedKey: CryptoKey | null = null

async function signingKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const pem = process.env.LICENSE_PRIVATE_KEY
  if (!pem) throw new Error('LICENSE_PRIVATE_KEY nao configurada')
  cachedKey = await crypto.subtle.importKey(
    'pkcs8',
    bytesFromB64(pem.trim()),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  return cachedKey
}

/** Identificador do aparelho, guardado so como hash: o valor cru nunca sobe. */
export async function hashDevice(deviceId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`squeeze:${deviceId}`))
  return b64urlFromBytes(new Uint8Array(digest)).slice(0, 22)
}

export interface Claims {
  /** Codigo da licenca. */
  c: string
  /** Hash do aparelho. */
  d: string
  iat: number
  exp: number
  v: 1
}

/**
 * Monta o JWS compacto. A assinatura do WebCrypto para ECDSA ja sai no formato
 * cru r||s, que e exatamente o que ES256 pede — nao ha DER para converter.
 */
export async function signLicence(claims: Claims): Promise<string> {
  const header = b64urlFromBytes(enc.encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' })))
  const payload = b64urlFromBytes(enc.encode(JSON.stringify(claims)))
  const input = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    await signingKey(),
    enc.encode(input),
  )
  return `${input}.${b64urlFromBytes(new Uint8Array(sig))}`
}

/* --------------------------------------------------------------------------
   Emissao
   -------------------------------------------------------------------------- */

/**
 * Validade da licenca offline.
 *
 * Este numero e o coracao da regra: uma pessoa que pediu reembolso e ficou
 * offline de proposito continua com o app por, no maximo, este tempo. Ficar
 * sem internet nao preserva o acesso — e o que faz ele vencer.
 *
 * Sete dias acompanha a garantia que ela oferece. Mexer aqui muda so o teto do
 * atraso: quem esta em dia renova sozinho e nunca ve bloqueio nenhum.
 */
export const LICENCE_DAYS = Number(process.env.LICENSE_DAYS ?? 7)

/** Quantos aparelhos por codigo. Casa dupla de celular e tablet e legitima. */
export const MAX_DEVICES = Number(process.env.LICENSE_MAX_DEVICES ?? 3)

/**
 * O segredo que a Hotmart manda junto de cada aviso de venda.
 *
 * Sem conferir isto, qualquer pessoa que descubra o endereco do webhook manda
 * uma compra falsa e libera acesso de graca. E a unica coisa que separa "a
 * Hotmart avisou" de "alguem disse que a Hotmart avisou".
 */
export const hotmartSecret = (): string | null => process.env.HOTMART_HOTTOK ?? null

export type IssueError =
  | 'store_unavailable'
  | 'bad_code'
  | 'unknown_code'
  | 'revoked'
  | 'device_limit'
  | 'not_activated'

export type IssueResult =
  | { ok: true; token: string; expiresAt: number; code: string }
  | { ok: false; error: IssueError }

/**
 * Emite (ou renova) a licenca de um codigo para um aparelho.
 *
 * `mode: 'activate'` pode registrar um aparelho novo; `mode: 'renew'` nunca —
 * quem renova ja tem de estar na lista. Sem essa separacao, renovar seria uma
 * porta lateral para furar o limite de aparelhos.
 */
export async function issue(
  rawCode: unknown,
  rawDevice: unknown,
  mode: 'activate' | 'renew',
): Promise<IssueResult> {
  if (!storeReady() || !hasSigningKey()) return { ok: false, error: 'store_unavailable' }

  const code = normalizeId(rawCode)
  const deviceId = typeof rawDevice === 'string' ? rawDevice.trim() : ''
  if (!code || deviceId.length < 8 || deviceId.length > 128) {
    return { ok: false, error: 'bad_code' }
  }

  const rec = await getCode(code)
  if (!rec) return { ok: false, error: 'unknown_code' }
  if (rec.status === 'revoked') return { ok: false, error: 'revoked' }

  const device = await hashDevice(deviceId)
  const known = rec.devices.includes(device)

  if (!known) {
    if (mode === 'renew') return { ok: false, error: 'not_activated' }
    if (rec.devices.length >= MAX_DEVICES) return { ok: false, error: 'device_limit' }
    rec.devices.push(device)
  }

  if (rec.status === 'unused') {
    rec.status = 'active'
    rec.activatedAt = Date.now()
  }
  await putCode(code, rec)

  const now = Math.floor(Date.now() / 1000)
  const exp = now + Math.round(LICENCE_DAYS * 86400)
  const token = await signLicence({ c: code, d: device, iat: now, exp, v: 1 })
  return { ok: true, token, expiresAt: exp, code }
}

/** Mapeia o erro para o status HTTP. 403 e definitivo; 404 e codigo inexistente. */
export const httpFor = (error: IssueError): number =>
  error === 'store_unavailable'
    ? 503
    : error === 'unknown_code'
      ? 404
      : error === 'bad_code'
        ? 400
        : 403
