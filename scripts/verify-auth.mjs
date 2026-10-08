/**
 * Confere o login e o progresso na nuvem, ponta a ponta.
 *
 * Roda o codigo de verdade dos dois lados: as rotas de api/ empacotadas como
 * estao, e o app construido com VITE_LOGIN=true, dirigido num iPhone simulado.
 * Os unicos substitutos sao os servicos de fora:
 *
 *   Redis        um de mentira, em memoria, no protocolo REST da Upstash
 *   Resend       um endpoint que guarda os e-mails em vez de enviar
 *   Google       chaves RSA geradas aqui, servidas como as do Google
 *
 * As chaves das licencas tambem sao geradas aqui, descartaveis: este teste NAO
 * precisa da chave privada de producao.
 *
 *   node scripts/verify-auth.mjs
 *
 * Constroi em dist-auth-test/ (o dist normal nao e tocado).
 */
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { webcrypto as crypto } from 'node:crypto'
import { tmpdir } from 'node:os'
import { resolve, dirname, extname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, devices } from 'playwright'
import { build } from 'esbuild'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(raiz, 'dist-auth-test')
const PORT = 4197
const BASE = `http://127.0.0.1:${PORT}`
const GOOGLE_AUD = 'teste.apps.googleusercontent.com'
const HOTTOK = 'hottok-de-teste'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures++
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${label}${detail ? ` (${detail})` : ''}`)
}

const b64url = (bytes) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/* --------------------------------------------------------------------------
   0. Chaves descartaveis
   -------------------------------------------------------------------------- */

const licKeys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const licPkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', licKeys.privateKey)).toString('base64')
const licJwk = await crypto.subtle.exportKey('jwk', licKeys.publicKey)
const licPublic = JSON.stringify({ kty: licJwk.kty, crv: licJwk.crv, x: licJwk.x, y: licJwk.y })

const googleKeys = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
)
const googleJwk = { ...(await crypto.subtle.exportKey('jwk', googleKeys.publicKey)), kid: 'kid-teste', use: 'sig', alg: 'RS256' }

/** Um "credential" como o do botao do Google. `mexer` estraga um campo de proposito. */
async function googleToken({ sub, email, name = 'Ana', verified = true, aud = GOOGLE_AUD, expIn = 3600, key = googleKeys.privateKey } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'kid-teste', typ: 'JWT' })))
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        iss: 'https://accounts.google.com',
        aud,
        sub,
        email,
        email_verified: verified,
        name,
        given_name: name,
        picture: 'https://lh3.googleusercontent.com/a/teste',
        iat: now,
        exp: now + expIn,
      }),
    ),
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`))
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`
}

/* --------------------------------------------------------------------------
   1. Constroi o app com login
   -------------------------------------------------------------------------- */

console.log('Construindo o app com login ligado')
await rm(DIST, { recursive: true, force: true })
execFileSync('npx', ['vite', 'build', '--outDir', 'dist-auth-test'], {
  cwd: raiz,
  shell: true,
  stdio: 'ignore',
  env: { ...process.env, VITE_LOGIN: 'true', VITE_LICENSE_PUBLIC_JWK: licPublic, VITE_GOOGLE_CLIENT_ID: '' },
})
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('O build nao produziu dist-auth-test/index.html.')
  process.exit(1)
}

/* --------------------------------------------------------------------------
   2. Rotas reais de api/
   -------------------------------------------------------------------------- */

process.env.KV_REST_API_URL = `${BASE}/kv`
process.env.KV_REST_API_TOKEN = 'kv-de-mentira'
process.env.LICENSE_PRIVATE_KEY = licPkcs8
process.env.LICENSE_DAYS = '7'
process.env.LICENSE_MAX_DEVICES = '3'
process.env.HOTMART_HOTTOK = HOTTOK
process.env.AUTH_REQUIRED = 'true'
process.env.GOOGLE_CLIENT_ID = GOOGLE_AUD
process.env.GOOGLE_JWKS_URL = `${BASE}/google/certs`
process.env.RESEND_API_KEY = 're_teste'
process.env.RESEND_API_URL = `${BASE}/resend`
process.env.AUTH_IP_PER_HOUR = '100000'

const NOMES = ['activate', 'renew', 'hotmart', 'auth', 'account']
const saida = mkdtempSync(join(tmpdir(), 'squeeze-auth-'))
await build({
  entryPoints: NOMES.map((n) => resolve(raiz, `api/${n}.ts`)),
  outdir: saida,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'silent',
})
const rotas = {}
for (const n of NOMES) rotas[`/api/${n}`] = (await import(pathToFileURL(join(saida, `${n}.js`)))).default

/** Igual ao conferirESM do verify-license: a Vercel nao empacota. */
async function conferirESM() {
  const cru = mkdtempSync(join(tmpdir(), 'squeeze-auth-esm-'))
  await build({
    entryPoints: ['_lib', '_auth', '_merge', ...NOMES].map((n) => resolve(raiz, `api/${n}.ts`)),
    outdir: cru,
    bundle: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'silent',
  })
  writeFileSync(join(cru, 'package.json'), JSON.stringify({ type: 'module' }))
  for (const n of ['auth', 'account', 'activate']) {
    try {
      const mod = await import(pathToFileURL(join(cru, `${n}.js`)).href)
      check(`api/${n} carrega como ESM (igual a Vercel)`, typeof mod.default === 'function')
    } catch (e) {
      check(`api/${n} carrega como ESM (igual a Vercel)`, false, e.message.split('\n')[0])
    }
  }
}

/* --------------------------------------------------------------------------
   3. Servidor: estaticos, rotas, e os servicos de fora de mentira
   -------------------------------------------------------------------------- */

const kv = new Map()
function fakeRedis([cmd, ...args]) {
  switch (String(cmd).toUpperCase()) {
    case 'GET':
      return kv.get(args[0]) ?? null
    case 'SET':
      kv.set(args[0], args[1])
      return 'OK'
    case 'DEL':
      return kv.delete(args[0]) ? 1 : 0
    case 'SADD': {
      const set = kv.get(args[0]) instanceof Set ? kv.get(args[0]) : new Set()
      set.add(args[1])
      kv.set(args[0], set)
      return 1
    }
    case 'SREM': {
      const set = kv.get(args[0])
      return set instanceof Set && set.delete(args[1]) ? 1 : 0
    }
    case 'SMEMBERS': {
      const set = kv.get(args[0])
      return set instanceof Set ? [...set] : []
    }
    default:
      throw new Error(`comando nao previsto: ${cmd}`)
  }
}

/** E-mails "enviados", em ordem. */
const mails = []
const lastCodeFor = (email) => {
  const m = [...mails].reverse().find((x) => x.to.includes(email))
  return m ? /\b(\d{6})\b/.exec(m.text)?.[1] : undefined
}
const mailsTo = (email) => mails.filter((m) => m.to.includes(email)).length

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
}

const readRaw = (req) =>
  new Promise((ok) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => ok(raw))
  })

const servidor = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, BASE)

  if (pathname === '/kv') {
    try {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ result: fakeRedis(JSON.parse(await readRaw(req))) }))
    } catch (e) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(e.message) }))
    }
    return
  }

  if (pathname === '/resend') {
    const raw = JSON.parse(await readRaw(req))
    if (req.headers.authorization !== 'Bearer re_teste') {
      res.statusCode = 401
      return res.end('{}')
    }
    mails.push({ to: raw.to, subject: raw.subject, text: raw.text })
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ id: `m${mails.length}` }))
  }

  if (pathname === '/google/certs') {
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ keys: [googleJwk] }))
  }

  if (rotas[pathname]) {
    const raw = await readRaw(req)
    let body = raw
    try {
      body = raw ? JSON.parse(raw) : undefined
    } catch {
      /* fica texto */
    }
    const out = { code: 200, headers: {}, body: null }
    await rotas[pathname](
      { method: req.method, body, headers: req.headers },
      {
        status(c) {
          out.code = c
          return this
        },
        setHeader(k, v) {
          out.headers[k] = v
        },
        json(b) {
          out.body = b
        },
      },
    )
    res.statusCode = out.code
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v)
    return res.end(JSON.stringify(out.body))
  }

  // Estaticos, com fallback de SPA.
  let file = join(DIST, pathname === '/' ? 'index.html' : pathname)
  if (!existsSync(file) || extname(file) === '') file = join(DIST, 'index.html')
  try {
    const data = await readFile(file)
    res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
    res.end(data)
  } catch {
    res.statusCode = 404
    res.end()
  }
})
await new Promise((ok) => servidor.listen(PORT, '127.0.0.1', ok))

/* --------------------------------------------------------------------------
   4. Ajudantes de API
   -------------------------------------------------------------------------- */

async function api(method, path, body, session) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data = null
  try {
    data = await r.json()
  } catch {
    /* sem corpo */
  }
  return { status: r.status, data }
}

const buy = (email) =>
  api('POST', '/api/hotmart', {
    hottok: HOTTOK,
    event: 'PURCHASE_APPROVED',
    data: { buyer: { email }, purchase: { transaction: `HP-${email}` } },
  })
const refund = (email) =>
  api('POST', '/api/hotmart', {
    hottok: HOTTOK,
    event: 'PURCHASE_REFUNDED',
    data: { buyer: { email }, purchase: { transaction: `HP-${email}` } },
  })

const startCode = (email) => api('POST', '/api/auth', { action: 'start', email, lang: 'en' })
const verifyCode = (email, code, deviceId = 'aparelho-teste-0001', extra = {}) =>
  api('POST', '/api/auth', { action: 'verify', email, code, deviceId, ...extra })

/** Pede e confere um codigo, e devolve a sessao. */
async function signIn(email, deviceId) {
  await startCode(email)
  const r = await verifyCode(email, lastCodeFor(email), deviceId)
  return r.data?.session
}

const progressDoc = (over = {}) => ({
  epoch: 0,
  completedWorkouts: [],
  dayCompletedAt: {},
  introRead: false,
  settings: null,
  settingsUpdatedAt: 0,
  ...over,
})

/* --------------------------------------------------------------------------
   5. API
   -------------------------------------------------------------------------- */

try {
  console.log('\nCarregamento das rotas')
  await conferirESM()

  console.log('\nPedido de codigo')
  const BUYER = 'compradora@example.com'
  await buy(BUYER)

  const pedido = await startCode(BUYER)
  check('compradora pede codigo: 200', pedido.status === 200)
  check('e o codigo chega no e-mail dela', /^\d{6}$/.test(lastCodeFor(BUYER) ?? ''), lastCodeFor(BUYER))

  const estranha = await startCode('estranha@example.com')
  check('quem nao comprou ouve a MESMA resposta', estranha.status === 200 && JSON.stringify(estranha.data) === JSON.stringify(pedido.data))
  check('mas nao recebe codigo nenhum', mailsTo('estranha@example.com') === 0)

  check('e-mail mal formado: 400', (await startCode('nao-e-email')).status === 400)

  console.log('\nConferencia do codigo')
  const errado = await verifyCode(BUYER, '000000')
  check('codigo errado: 401 bad_code', errado.status === 401 && errado.data?.error === 'bad_code')
  const naoComprou = await verifyCode('estranha@example.com', '123456')
  check('quem nao comprou: o mesmo bad_code', naoComprou.data?.error === 'bad_code')

  for (let i = 0; i < 3; i++) await verifyCode(BUYER, '000001')
  const quinta = await verifyCode(BUYER, '000002')
  check('quinta tentativa errada bloqueia o codigo', quinta.data?.error === 'too_many')
  const depoisDeBloquear = await verifyCode(BUYER, lastCodeFor(BUYER))
  check('e nem o codigo certo passa mais', depoisDeBloquear.data?.error === 'too_many')

  await startCode(BUYER)
  const codigo = lastCodeFor(BUYER)
  const entrou = await verifyCode(BUYER, codigo, 'aparelho-a-0001')
  check('codigo novo e certo entra', entrou.status === 200, `HTTP ${entrou.status} ${entrou.data?.error ?? ''}`)
  check('devolve sessao, licenca e perfil', Boolean(entrou.data?.session && entrou.data?.licence?.token && entrou.data?.user?.email === BUYER))
  const reuso = await verifyCode(BUYER, codigo, 'aparelho-b-0001')
  check('o mesmo codigo nao entra duas vezes', reuso.data?.error === 'bad_code')

  const S = entrou.data.session

  console.log('\nPorta lateral fechada')
  const semSessao = await api('POST', '/api/activate', { code: BUYER, deviceId: 'aparelho-x-0001' })
  check('ativar so com o e-mail, sem login: 401', semSessao.status === 401 && semSessao.data?.error === 'login_required')
  const comSessao = await api('POST', '/api/activate', { code: BUYER, deviceId: 'aparelho-a-0001' }, S)
  check('ativar com a sessao do proprio e-mail: 200', comSessao.status === 200)
  const OUTRA = 'outra@example.com'
  await buy(OUTRA)
  const alheia = await api('POST', '/api/activate', { code: OUTRA, deviceId: 'aparelho-a-0001' }, S)
  check('sessao de uma nao ativa o e-mail de outra', alheia.status === 401)

  console.log('\nConta e progresso')
  check('conta sem sessao: 401', (await api('GET', '/api/account')).status === 401)
  check('sessao adulterada: 401', (await api('GET', '/api/account', undefined, S.slice(0, -2) + 'xx')).status === 401)
  const vazia = await api('GET', '/api/account', undefined, S)
  check('conta nova: perfil e progresso vazio', vazia.status === 200 && vazia.data?.progress === null && vazia.data?.user?.email === BUYER)

  const celularA = progressDoc({ completedWorkouts: ['1-1-strength', '1-1-pulse'], dayCompletedAt: { '1-1': '2026-10-01' }, introRead: true })
  const celularB = progressDoc({ completedWorkouts: ['1-1-strength', '1-2-strength'], dayCompletedAt: { '1-1': '2026-09-30' } })
  await api('PUT', '/api/account', { progress: celularA }, S)
  const juntos = await api('PUT', '/api/account', { progress: celularB }, S)
  check(
    'dois celulares: o segundo nao apaga o primeiro (uniao)',
    JSON.stringify(juntos.data?.progress?.completedWorkouts) === JSON.stringify(['1-1-pulse', '1-1-strength', '1-2-strength']),
    JSON.stringify(juntos.data?.progress?.completedWorkouts),
  )
  check('dia concluido fica com a data mais antiga', juntos.data?.progress?.dayCompletedAt?.['1-1'] === '2026-09-30')
  check('"leu a introducao" vale de qualquer lado', juntos.data?.progress?.introRead === true)

  const recomeco = await api('PUT', '/api/account', { progress: progressDoc({ epoch: 1 }) }, S)
  check('recomecar o programa (era nova) zera a conta', recomeco.data?.progress?.completedWorkouts?.length === 0)
  const antigo = await api('PUT', '/api/account', { progress: celularA }, S)
  check('e um celular desatualizado nao desfaz o recomeco', antigo.data?.progress?.epoch === 1 && antigo.data?.progress?.completedWorkouts?.length === 0)

  const lixo = await api('PUT', '/api/account', { progress: { epoch: 1, completedWorkouts: ['1-3-strength', '<script>', 42], dayCompletedAt: { x: 'y' } } }, S)
  check('lixo enviado e descartado item a item', JSON.stringify(lixo.data?.progress?.completedWorkouts) === JSON.stringify(['1-3-strength']))

  const nome = await api('PATCH', '/api/account', { name: '  Ana   Maria ' }, S)
  check('nome salvo, sem espacos sobrando', nome.data?.user?.name === 'Ana Maria')
  check('nome comprido demais: 400', (await api('PATCH', '/api/account', { name: 'x'.repeat(61) }, S)).status === 400)

  console.log('\nLimite de pedidos')
  const LIMITE = 'limite@example.com'
  await buy(LIMITE)
  const respostas = []
  for (let i = 0; i < 6; i++) respostas.push((await startCode(LIMITE)).status)
  check('sexto codigo na mesma hora: 429', respostas[5] === 429, respostas.join(','))
  check('e so cinco e-mails sairam', mailsTo(LIMITE) === 5)

  console.log('\nGoogle')
  const viaGoogle = await api('POST', '/api/auth', {
    action: 'google',
    credential: await googleToken({ sub: 'g-1', email: OUTRA }),
    deviceId: 'aparelho-g-0001',
  })
  check('Google com o e-mail da compra entra', viaGoogle.status === 200, `HTTP ${viaGoogle.status} ${viaGoogle.data?.error ?? ''}`)
  check('e traz nome e foto do Google', viaGoogle.data?.user?.name === 'Ana' && viaGoogle.data?.user?.photo.startsWith('https://'))

  const outroApp = await api('POST', '/api/auth', { action: 'google', credential: await googleToken({ sub: 'g-1', email: OUTRA, aud: 'outro-app.apps.googleusercontent.com' }), deviceId: 'aparelho-g-0001' })
  check('token feito para outro app: recusado', outroApp.status === 401)
  const naoConfirmado = await api('POST', '/api/auth', { action: 'google', credential: await googleToken({ sub: 'g-1', email: OUTRA, verified: false }), deviceId: 'aparelho-g-0001' })
  check('e-mail nao confirmado no Google: recusado', naoConfirmado.status === 401)
  const vencido = await api('POST', '/api/auth', { action: 'google', credential: await googleToken({ sub: 'g-1', email: OUTRA, expIn: -3600 }), deviceId: 'aparelho-g-0001' })
  check('token vencido: recusado', vencido.status === 401)
  const outraChave = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const forjado = await api('POST', '/api/auth', { action: 'google', credential: await googleToken({ sub: 'g-1', email: OUTRA, key: outraChave.privateKey }), deviceId: 'aparelho-g-0001' })
  check('token assinado por outra chave: recusado', forjado.status === 401)

  const GMAIL = 'pessoal@gmail.com'
  const tokenPessoal = await googleToken({ sub: 'g-2', email: GMAIL, name: 'Bia' })
  const semCompra = await api('POST', '/api/auth', { action: 'google', credential: tokenPessoal, deviceId: 'aparelho-p-0001' })
  check('Gmail diferente do da compra: pede para ligar', semCompra.status === 404 && semCompra.data?.googleEmail === GMAIL)
  const LIGAR = 'compra-da-bia@example.com'
  await buy(LIGAR)
  await startCode(LIGAR)
  const ligou = await verifyCode(LIGAR, lastCodeFor(LIGAR), 'aparelho-p-0001', { googleCredential: tokenPessoal })
  check('prova o e-mail da compra e liga as duas contas', ligou.status === 200 && ligou.data?.user?.name === 'Bia')
  const depoisDeLigar = await api('POST', '/api/auth', { action: 'google', credential: await googleToken({ sub: 'g-2', email: GMAIL }), deviceId: 'aparelho-p-0001' })
  check('da proxima vez o Google entra direto, na conta da compra', depoisDeLigar.status === 200 && depoisDeLigar.data?.user?.email === LIGAR)

  console.log('\nReembolso')
  const REEMB = 'reembolso@example.com'
  await buy(REEMB)
  const sReemb = await signIn(REEMB, 'aparelho-r-0001')
  check('entrou antes do reembolso', Boolean(sReemb))
  await refund(REEMB)
  const antes = mailsTo(REEMB)
  await startCode(REEMB)
  check('depois do reembolso nao recebe mais codigo', mailsTo(REEMB) === antes)
  const renova = await api('POST', '/api/renew', { code: REEMB, deviceId: 'aparelho-r-0001' })
  check('e a licenca para de renovar (o app fecha)', renova.status === 403 && renova.data?.error === 'revoked')

  console.log('\nExcluir conta')
  const EXCL = 'excluir@example.com'
  await buy(EXCL)
  const sExcl = await signIn(EXCL, 'aparelho-e-0001')
  await api('PUT', '/api/account', { progress: progressDoc({ completedWorkouts: ['1-1-strength'] }) }, sExcl)
  check('excluir: 200', (await api('DELETE', '/api/account', undefined, sExcl)).status === 200)
  check('sessao antiga para de valer', (await api('GET', '/api/account', undefined, sExcl)).status === 401)
  const sNova = await signIn(EXCL, 'aparelho-e-0001')
  const recriada = await api('GET', '/api/account', undefined, sNova)
  check('entrar de novo comeca do zero', recriada.status === 200 && recriada.data?.progress === null)
  check('e a sessao de antes da exclusao continua morta', (await api('GET', '/api/account', undefined, sExcl)).status === 401)

  /* ------------------------------------------------------------------------
     6. App de verdade, num iPhone simulado
     ------------------------------------------------------------------------ */

  console.log('\nApp no navegador')
  const browser = await chromium.launch()
  const novoCelular = async () => {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US', serviceWorkers: 'block' })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => check('sem erro de pagina', false, e.message))
    return { ctx, page }
  }
  const aberto = (page) => page.locator('.weeks__logo').isVisible().catch(() => false)
  /** SHOTS=1 guarda capturas das telas novas em screenshots/, para mostrar a cliente. */
  const foto = async (page, nome, alvo) => {
    if (!process.env.SHOTS) return
    if (alvo) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), alvo)
    await page.waitForTimeout(500)
    await page.screenshot({ path: resolve(raiz, 'screenshots', `login-${nome}.png`) })
  }
  /** A dica de instalacao do iOS abre sozinha, com atraso: espera ela aparecer. */
  const fechaDica = async (page) => {
    const notNow = page.getByRole('button', { name: 'Not now' })
    try {
      await notNow.waitFor({ state: 'visible', timeout: 2500 })
      await notNow.click()
    } catch {
      /* nao apareceu: segue */
    }
  }

  async function entrarPeloApp(page, email) {
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.locator('#login-email').fill(email)
    await page.getByRole('button', { name: 'Send me a code' }).click()
    await page.locator('#login-code').waitFor({ timeout: 8000 })
    await page.locator('#login-code').fill(lastCodeFor(email))
    await page.locator('.weeks__logo').waitFor({ timeout: 10000 })
  }

  const ANA = 'ana@example.com'
  await buy(ANA)

  const A = await novoCelular()
  await A.page.goto(BASE, { waitUntil: 'networkidle' })
  check('sem login, aparece a tela de entrar', await A.page.locator('#login-email').isVisible())
  await foto(A.page, '1-entrar')
  check('e o programa nao aparece', (await aberto(A.page)) === false)

  await A.page.getByRole('button', { name: 'Privacy Policy' }).click()
  check('a politica de privacidade abre sem login', await A.page.getByRole('heading', { name: 'Your account' }).isVisible())
  await A.page.getByRole('button', { name: 'Back' }).click()

  await A.page.locator('#login-email').fill('ninguem@example.com')
  await A.page.getByRole('button', { name: 'Send me a code' }).click()
  await A.page.locator('#login-code').waitFor({ timeout: 8000 })
  check('e-mail sem compra tambem vai para "confira seu e-mail"', await A.page.getByRole('heading', { name: 'Check your e-mail' }).isVisible())
  await foto(A.page, '2-codigo')
  await A.page.locator('#login-code').fill('123456')
  await A.page.waitForTimeout(800)
  check('e qualquer codigo e recusado', (await A.page.locator('.gate__error').textContent()).includes('not right'))
  await A.page.getByRole('button', { name: 'Use a different e-mail' }).click()

  await entrarPeloApp(A.page, ANA)
  check('codigo do e-mail abre o app', await aberto(A.page))
  await fechaDica(A.page)
  check('a home diz que esta salvo na conta', await A.page.getByText('Saved to your account').first().isVisible())

  // Le a introducao e desliga o som: duas mudancas reais pela interface.
  await A.page.getByRole('button', { name: /Start here/ }).click()
  await A.page.getByRole('button', { name: /Got it, start week 1/ }).click()
  await A.page.getByRole('button', { name: 'Back' }).click()
  await A.page.getByRole('button', { name: 'Settings' }).click()
  await A.page.getByRole('switch', { name: 'Sound' }).click()
  await A.page.locator('#account-name').fill('Ana')
  await A.page.getByRole('button', { name: 'Save', exact: true }).click()
  await A.page.waitForTimeout(2500)
  check('Ajustes mostram a conta', await A.page.getByText(ANA).isVisible())
  await foto(A.page, '4-conta', '.account')
  check('e o progresso como salvo', await A.page.getByText('Your progress is saved to your account.').isVisible())

  const sAna = await signIn(ANA, 'aparelho-api-0001')
  const naConta = await api('GET', '/api/account', undefined, sAna)
  check('a introducao lida chegou na conta', naConta.data?.progress?.introRead === true)
  check('o som desligado chegou na conta', naConta.data?.progress?.settings?.sound === false)
  check('e o nome', naConta.data?.user?.name === 'Ana')

  console.log('\nOutro celular, mesma conta')
  const B = await novoCelular()
  await entrarPeloApp(B.page, ANA)
  await fechaDica(B.page)
  await B.page.waitForTimeout(1500)
  check('cumprimenta pelo nome', await B.page.getByText('Welcome back, Ana').isVisible())
  await foto(B.page, '3-home')
  check(
    'a introducao aparece como lida',
    await B.page.locator('.start-here--read', { hasText: 'Find the right muscle' }).isVisible(),
  )
  await B.page.getByRole('button', { name: 'Settings' }).click()
  check('o som veio desligado do outro celular', (await B.page.getByRole('switch', { name: 'Sound' }).getAttribute('aria-checked')) === 'false')

  console.log('\nProgresso de antes do login sobe para a conta')
  const CLARA = 'clara@example.com'
  await buy(CLARA)
  const C = await novoCelular()
  await C.page.goto(BASE, { waitUntil: 'networkidle' })
  await C.page.evaluate(() =>
    localStorage.setItem(
      'kegel-pelvic:v2',
      JSON.stringify({ completedWorkouts: ['1-1-strength', '1-1-pulse'], dayCompletedAt: { '1-1': '2026-10-01' }, introRead: true }),
    ),
  )
  await entrarPeloApp(C.page, CLARA)
  await fechaDica(C.page)
  await C.page.waitForTimeout(2500)
  const sClara = await signIn(CLARA, 'aparelho-api-0002')
  const daClara = await api('GET', '/api/account', undefined, sClara)
  check(
    'os treinos feitos antes de entrar estao na conta',
    JSON.stringify(daClara.data?.progress?.completedWorkouts) === JSON.stringify(['1-1-pulse', '1-1-strength']),
    JSON.stringify(daClara.data?.progress?.completedWorkouts),
  )

  console.log('\nSair')
  await B.page.getByRole('button', { name: 'Sign out' }).click()
  await B.page.locator('#login-email').waitFor({ timeout: 8000 })
  check('sair volta para a tela de entrar', await B.page.locator('#login-email').isVisible())
  // O app recria o progresso VAZIO ao abrir; o que importa e nao sobrar nada da conta.
  const restou = await B.page.evaluate(() => ({
    progresso: JSON.parse(localStorage.getItem('kegel-pelvic:v2') ?? '{}'),
    sessao: localStorage.getItem('kegel-pelvic:session'),
  }))
  check(
    'e nao deixa progresso nem sessao no celular',
    restou.sessao === null && !restou.progresso.introRead && (restou.progresso.completedWorkouts ?? []).length === 0,
    JSON.stringify(restou).slice(0, 120),
  )

  console.log('\nReembolso com o app aberto')
  await refund(ANA)
  await A.page.reload({ waitUntil: 'networkidle' })
  await A.page.waitForTimeout(2500)
  check('reembolsada: o app fecha', (await aberto(A.page)) === false)
  check('e a saida e "Sign out"', await A.page.getByRole('button', { name: 'Sign out' }).isVisible())

  console.log('\nExcluir pela tela')
  await C.page.getByRole('button', { name: 'Settings' }).click()
  await C.page.getByRole('button', { name: 'Delete my account' }).click()
  await C.page.getByRole('button', { name: 'Delete for good' }).click()
  await C.page.locator('#login-email').waitFor({ timeout: 8000 })
  check('excluir volta para a tela de entrar', await C.page.locator('#login-email').isVisible())
  check('e a conta sumiu do servidor', (await api('GET', '/api/account', undefined, sClara)).status === 401)

  await browser.close()
} finally {
  servidor.close()
}

console.log(failures === 0 ? '\nTudo certo.' : `\n${failures} falha(s).`)
process.exit(failures === 0 ? 0 : 1)
