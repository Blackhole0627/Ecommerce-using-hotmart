/**
 * Emissao de licencas para os scripts de verificacao.
 *
 * Desde que existe a porta de acesso, nenhum script consegue abrir o app sem
 * uma licenca valida — e uma licenca valida so sai da chave privada. Entao os
 * scripts semeiam uma antes de navegar, exatamente como o servidor faria.
 *
 * A chave e lida de LICENSE_PRIVATE_KEY ou de .keys/LICENSE_PRIVATE_KEY.txt.
 * Sem ela, verificar e impossivel — e melhor parar dizendo isso do que rodar
 * uma versao de mentira do teste.
 */
import { webcrypto as crypto } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const b64url = (bytes) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function privateKeyMaterial() {
  if (process.env.LICENSE_PRIVATE_KEY) return process.env.LICENSE_PRIVATE_KEY.trim()
  const arquivo = resolve(raiz, '.keys/LICENSE_PRIVATE_KEY.txt')
  if (existsSync(arquivo)) return readFileSync(arquivo, 'utf8').trim()
  return null
}

/** Aborta com uma mensagem util em vez de falhar dez linhas adiante. */
export function requireKey() {
  const key = privateKeyMaterial()
  if (key) return key
  console.error(
    'Falta a chave privada das licencas.\n' +
      '  Defina LICENSE_PRIVATE_KEY, ou deixe o arquivo em .keys/LICENSE_PRIVATE_KEY.txt\n' +
      '  (ela e gerada por: node scripts/gen-license-keys.mjs)',
  )
  process.exit(1)
}

/** Mesmo calculo das duas pontas: api/_lib.ts e src/lib/license.ts. */
export async function deviceHash(deviceId) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`squeeze:${deviceId}`),
  )
  return b64url(new Uint8Array(digest)).slice(0, 22)
}

/**
 * Assina um bilhete. `days` aceita negativo de proposito: e assim que se testa
 * o comportamento de uma licenca ja vencida.
 */
export async function mintLicence({ code = 'SQZ-TESTE-AAAAA', deviceId, days = 7 } = {}) {
  const pkcs8 = requireKey()
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Buffer.from(pkcs8, 'base64'),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const now = Math.floor(Date.now() / 1000)
  const claims = {
    c: code,
    d: await deviceHash(deviceId),
    iat: now,
    exp: now + Math.round(days * 86400),
    v: 1,
  }

  const header = b64url(Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })))
  const payload = b64url(Buffer.from(JSON.stringify(claims)))
  const input = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(input),
  )

  return {
    token: `${input}.${b64url(new Uint8Array(sig))}`,
    code,
    expiresAt: claims.exp * 1000,
  }
}

/**
 * Deixa o aparelho ja liberado ANTES da pagina carregar.
 *
 * Tem de ser addInitScript, e nao um evaluate depois do goto: o React le a
 * licenca na primeira renderizacao, e semear depois so mostraria a tela do
 * codigo por um instante — ou de vez, se nada recarregasse.
 */
export async function seedLicence(
  context,
  { deviceId = 'verificacao-automatica-0001', days = 7 } = {},
) {
  const licence = await mintLicence({ deviceId, days })
  await context.addInitScript(
    ([id, lic]) => {
      localStorage.setItem('kegel-pelvic:device', id)
      localStorage.setItem('kegel-pelvic:lic', lic)
    },
    [
      deviceId,
      JSON.stringify({
        token: licence.token,
        code: licence.code,
        expiresAt: licence.expiresAt,
        seenAt: Date.now(),
      }),
    ],
  )
  return licence
}

/**
 * Semeia a licenca em TODO contexto que o navegador criar dali em diante.
 *
 * Os scripts de verificacao antigos abrem varios contextos, e desde que existe
 * a porta de acesso nenhum deles chegaria ao programa. Envolver o newContext
 * uma vez e menos ruido do que repetir a semeadura em cada abertura — e nao
 * deixa passar nenhuma.
 */
export function licenceEverywhere(browser, options = {}) {
  const original = browser.newContext.bind(browser)
  browser.newContext = async (...args) => {
    const context = await original(...args)
    await seedLicence(context, options)
    return context
  }
}
