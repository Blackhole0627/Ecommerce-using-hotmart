/**
 * Licenca de uso: o app so abre para quem comprou.
 *
 * Como funciona, em uma frase: o servidor assina um bilhete com prazo, o
 * aparelho confere a assinatura sozinho — sem internet — e para de abrir quando
 * o prazo vence.
 *
 * A decisao que importa esta no vencimento. A tentacao e guardar um "sim" e
 * confiar nele para sempre, revalidando quando houver rede; so que assim quem
 * pede reembolso e depois fica offline de proposito fica com o app para sempre.
 * Aqui e o contrario: ficar sem internet nao preserva o acesso, e o que o faz
 * vencer. Quem esta em dia renova em segundo plano e nunca ve nada disso.
 *
 * Nada disto e inviolavel, e nao ha promessa de que seja: o app roda no
 * navegador da compradora, e o que roda no aparelho dela pode ser desmontado
 * por quem tem paciencia e conhecimento. O objetivo e que nao valha o esforco.
 *
 * Guardado numa chave PROPRIA do localStorage, separada do progresso: o botao
 * "recomecar o programa" apaga kegel-pelvic:v2, e se a licenca morasse la a
 * usuaria se trancaria para fora ao zerar o proprio treino.
 */
import { LICENSE_PUBLIC_JWK } from './license-key'

const LIC_KEY = 'kegel-pelvic:lic'
const DEVICE_KEY = 'kegel-pelvic:device'

/**
 * A porta de acesso esta ligada?
 *
 * Existe para separar duas mudancas que nao podem acontecer no mesmo dia: mudar
 * o app de hospedagem e comecar a exigir codigo. Sao dois riscos diferentes, e
 * juntos viram um site fora do ar sem ninguem saber qual dos dois derrubou.
 *
 * Fica LIGADA por padrao. Desligar exige escrever VITE_REQUIRE_LICENSE=false a
 * mao, no ambiente do projeto: nunca acontece por esquecimento, so por decisao.
 * E decidido na hora de compilar, nao em tempo de execucao — nao existe resposta
 * de servidor, cabecalho ou valor guardado que consiga ligar ou desligar isto.
 *
 * Enquanto estiver desligada o app abre para qualquer pessoa, como era antes.
 * Religar e trocar a variavel e publicar de novo.
 */
export const LICENSE_REQUIRED = import.meta.env.VITE_REQUIRE_LICENSE !== 'false'

/** Renova em segundo plano quando falta menos que isto. */
const RENEW_BEFORE_MS = 3 * 24 * 60 * 60 * 1000

/**
 * Folga do relogio. Atrasar o relogio do celular seria a forma mais simples de
 * esticar uma licenca vencida, entao o ultimo instante visto fica guardado e um
 * relogio que anda para tras derruba a licenca em vez de renova-la. A folga
 * existe porque fuso, horario de verao e ajuste automatico mexem o relogio
 * alguns minutos de forma legitima.
 */
const CLOCK_SLACK_MS = 6 * 60 * 60 * 1000

export interface Licence {
  token: string
  code: string
  /** Vencimento, em milissegundos. */
  expiresAt: number
  /** Maior instante ja observado, para detectar relogio para tras. */
  seenAt: number
}

export type BlockReason = 'expired' | 'revoked'

export type ActivateError =
  | 'bad_code'
  | 'unknown_code'
  | 'revoked'
  | 'device_limit'
  | 'not_activated'
  | 'store_unavailable'
  | 'offline'
  | 'server_error'

/* --------------------------------------------------------------------------
   Aparelho
   -------------------------------------------------------------------------- */

/**
 * Identificador do aparelho. Aleatorio, criado na primeira abertura e guardado
 * aqui — nao ha nenhuma tentativa de impressao digital do navegador: alem de
 * invasivo, e instavel e daria bloqueio em gente honesta.
 */
export function deviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    if (saved && saved.length >= 8) return saved
  } catch {
    /* aba privada: segue com um id de sessao */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const fresh = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  try {
    localStorage.setItem(DEVICE_KEY, fresh)
  } catch {
    /* idem */
  }
  return fresh
}

const enc = new TextEncoder()

const b64url = (bytes: Uint8Array): string => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Sem anotacao de retorno: o inferido e Uint8Array<ArrayBuffer>, que e o que o
// WebCrypto aceita. "Uint8Array" alargaria para ArrayBufferLike e o verify
// deixaria de compilar.
const fromB64url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Mesmo calculo do servidor (api/_lib.ts). As duas pontas tem de bater. */
async function deviceHash(id: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`squeeze:${id}`))
  return b64url(new Uint8Array(digest)).slice(0, 22)
}

/* --------------------------------------------------------------------------
   Conferencia da assinatura
   -------------------------------------------------------------------------- */

interface Claims {
  c: string
  d: string
  iat: number
  exp: number
  v: number
}

let keyPromise: Promise<CryptoKey> | null = null

const publicKey = (): Promise<CryptoKey> => {
  keyPromise ??= crypto.subtle.importKey(
    'jwk',
    LICENSE_PUBLIC_JWK,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  )
  return keyPromise
}

/**
 * Confere assinatura, versao e aparelho. Devolve as reivindicacoes ou null.
 * Repare que o VENCIMENTO nao e conferido aqui: quem decide o que fazer com um
 * bilhete vencido e quem chamou, porque a resposta muda entre "renove" e
 * "bloqueie".
 */
export async function verify(token: string): Promise<Claims | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const okSig = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await publicKey(),
      fromB64url(parts[2]),
      enc.encode(`${parts[0]}.${parts[1]}`),
    )
    if (!okSig) return null
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[1]))) as Claims
    if (claims.v !== 1 || typeof claims.exp !== 'number' || typeof claims.c !== 'string') return null
    if (claims.d !== (await deviceHash(deviceId()))) return null
    return claims
  } catch {
    return null
  }
}

/* --------------------------------------------------------------------------
   Armazenamento local
   -------------------------------------------------------------------------- */

export function loadLicence(): Licence | null {
  try {
    const raw = localStorage.getItem(LIC_KEY)
    if (!raw) return null
    const l = JSON.parse(raw) as Partial<Licence>
    if (typeof l.token !== 'string' || typeof l.expiresAt !== 'number') return null
    return {
      token: l.token,
      code: typeof l.code === 'string' ? l.code : '',
      expiresAt: l.expiresAt,
      seenAt: typeof l.seenAt === 'number' ? l.seenAt : 0,
    }
  } catch {
    return null
  }
}

export function saveLicence(licence: Licence): void {
  try {
    localStorage.setItem(LIC_KEY, JSON.stringify(licence))
  } catch {
    /* sem espaco ou storage bloqueado: a sessao atual segue valendo */
  }
}

export function clearLicence(): void {
  try {
    localStorage.removeItem(LIC_KEY)
  } catch {
    /* idem */
  }
}

/** Marca o instante atual como visto, para o teste de relogio para tras. */
export function touch(licence: Licence): Licence {
  const updated = { ...licence, seenAt: Math.max(licence.seenAt, Date.now()) }
  saveLicence(updated)
  return updated
}

export const clockWentBack = (licence: Licence): boolean =>
  Date.now() < licence.seenAt - CLOCK_SLACK_MS

export const isExpired = (licence: Licence): boolean => Date.now() >= licence.expiresAt

export const needsRenew = (licence: Licence): boolean =>
  licence.expiresAt - Date.now() < RENEW_BEFORE_MS

/* --------------------------------------------------------------------------
   Servidor
   -------------------------------------------------------------------------- */

interface Answer {
  ok: boolean
  /** Falha de rede, nao do servidor: nao ha o que concluir sobre a licenca. */
  offline: boolean
  licence?: Licence
  error?: ActivateError
}

async function ask(path: string, code: string): Promise<Answer> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // O service worker nao pode responder isto do cache — um 200 guardado
      // faria a revoga cao falhar em silencio. Ver o denylist em vite.config.ts.
      cache: 'no-store',
      body: JSON.stringify({ code, deviceId: deviceId() }),
    })
  } catch {
    return { ok: false, offline: true }
  }

  let data: { token?: string; expiresAt?: number; code?: string; error?: string } = {}
  try {
    data = (await response.json()) as typeof data
  } catch {
    /* resposta sem corpo: cai no tratamento de erro abaixo */
  }

  if (!response.ok || !data.token) {
    return { ok: false, offline: false, error: (data.error as ActivateError) ?? 'server_error' }
  }

  const claims = await verify(data.token)
  if (!claims) return { ok: false, offline: false, error: 'server_error' }

  return {
    ok: true,
    offline: false,
    licence: {
      token: data.token,
      code: data.code ?? claims.c,
      expiresAt: claims.exp * 1000,
      seenAt: Date.now(),
    },
  }
}

/** Primeira ativacao: registra o aparelho e devolve a licenca. */
export const activate = (code: string): Promise<Answer> => ask('/api/activate', code)

/** Renovacao silenciosa de um aparelho ja registrado. */
export const renew = (code: string): Promise<Answer> => ask('/api/renew', code)

export type { Answer }

/* --------------------------------------------------------------------------
   Codigo vindo do link
   -------------------------------------------------------------------------- */

/**
 * Le o codigo de femivita.online/#c=SQZ-XXXXX-XXXXX.
 *
 * A plataforma de venda pode entregar o link ja com o codigo dentro, e ai a
 * compradora toca em vez de digitar. Cada passo de digitacao em celular custa
 * conversao — e ela vai rodar anuncio.
 */
export function codeFromLink(): string {
  const from = (s: string) => new URLSearchParams(s.replace(/^[#?]/, '')).get('c') ?? ''
  const code = from(location.hash) || from(location.search)
  return code.trim()
}

/** Tira o codigo da barra de enderecos depois de usado. */
export function cleanLink(): void {
  if (location.hash.includes('c=') || location.search.includes('c=')) {
    history.replaceState({}, '', location.pathname)
  }
}

/* --------------------------------------------------------------------------
   Formatacao
   -------------------------------------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/**
 * O campo aceita as duas coisas, e decide pela presenca do @.
 *
 * O caminho normal e o e-mail da compra: a plataforma avisa quem comprou, e a
 * compradora entra com um dado que ela ja sabe de cor. O codigo continua
 * valendo para os casos manuais — cortesia, suporte, venda fora da plataforma.
 *
 * Um e-mail nao pode passar pela formatacao do codigo: ela poe tudo em
 * maiuscula e joga fora o @ e o ponto.
 */
export function formatId(input: string): string {
  if (input.includes('@')) return input.trimStart().toLowerCase()
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (s.startsWith('SQZ')) s = s.slice(3)
  s = s.slice(0, 10)
  const parts = ['SQZ']
  if (s.length) parts.push(s.slice(0, 5))
  if (s.length > 5) parts.push(s.slice(5))
  return parts.join('-')
}

export const looksComplete = (valor: string): boolean =>
  valor.includes('@')
    ? EMAIL.test(valor.trim())
    : valor.replace(/[^A-Z0-9]/g, '').length === 13
