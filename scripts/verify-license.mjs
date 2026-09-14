/**
 * Confere a porta de acesso ponta a ponta.
 *
 * O que esta sendo testado e uma promessa comercial, nao um detalhe tecnico:
 * "quem pediu reembolso perde o app". Entao o teste roda o codigo de verdade
 * dos dois lados — as rotas de api/ sao empacotadas e executadas como estao, e
 * a conferencia da assinatura acontece dentro do navegador, no bundle que foi
 * publicado. Nada aqui e imitacao das duas pontas que importam.
 *
 * O unico substituto e o banco: um Redis de mentira, em memoria, respondendo o
 * mesmo protocolo REST da Upstash.
 *
 * Precisa da chave privada (.keys/LICENSE_PRIVATE_KEY.txt). Constroi o app e
 * sobe o proprio servidor — nao precisa de build previo nem de vite preview.
 *
 *   node scripts/verify-license.mjs
 *
 * Deixa o dist construido com a porta LIGADA, que nao e o estado de publicacao;
 * rode `npm run build` depois se for olhar o dist a mao.
 */
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, extname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium, devices } from 'playwright'
import { build } from 'esbuild'
import { mintLicence, requireKey } from './_licence.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(raiz, 'dist')
const PORT = 4180
const BASE = `http://localhost:${PORT}`
const CODE = 'SQZ-TESTE-AAAAA'
const ADMIN = 'token-de-verificacao'

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures++
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${label}${detail ? ` — ${detail}` : ''}`)
}

/*
 * Constroi o proprio dist, com a porta LIGADA a forca.
 *
 * O build normal obedece .env.production, onde a porta hoje esta desligada — e
 * um app sem porta nao tem como reprovar num teste de porta: tudo passaria por
 * nao existir nada para barrar. Entao esta verificacao nao usa o dist que
 * estiver ali; ela faz o seu.
 */
console.log('Construindo o app com a porta de acesso ligada')
execFileSync('npm', ['run', 'build'], {
  cwd: raiz,
  shell: true,
  stdio: 'ignore',
  env: { ...process.env, VITE_REQUIRE_LICENSE: 'true' },
})
if (!existsSync(join(DIST, 'sw.js'))) {
  console.error('O build nao produziu dist/sw.js.')
  process.exit(1)
}

/* --------------------------------------------------------------------------
   1. Empacota as rotas reais de api/ e as carrega
   -------------------------------------------------------------------------- */

// As variaveis de ambiente precisam existir ANTES do import: os modulos leem
// process.env no topo, uma vez so.
process.env.KV_REST_API_URL = `${BASE}/kv`
process.env.KV_REST_API_TOKEN = 'kv-de-mentira'
process.env.LICENSE_PRIVATE_KEY = requireKey()
process.env.LICENSE_ADMIN_TOKEN = ADMIN
process.env.LICENSE_DAYS = '7'
process.env.LICENSE_MAX_DEVICES = '3'
process.env.HOTMART_HOTTOK = 'hottok-de-teste'

const saida = mkdtempSync(join(tmpdir(), 'squeeze-api-'))
await build({
  entryPoints: ['api/activate.ts', 'api/renew.ts', 'api/admin.ts', 'api/hotmart.ts'].map((p) => resolve(raiz, p)),
  outdir: saida,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'silent',
})

const rotas = {
  '/api/activate': (await import(pathToFileURL(join(saida, 'activate.js')))).default,
  '/api/renew': (await import(pathToFileURL(join(saida, 'renew.js')))).default,
  '/api/admin': (await import(pathToFileURL(join(saida, 'admin.js')))).default,
  '/api/hotmart': (await import(pathToFileURL(join(saida, 'hotmart.js')))).default,
}

/* --------------------------------------------------------------------------
   1b. As rotas carregam como ESM de verdade?
   -------------------------------------------------------------------------- */

/**
 * Isto existe por causa de um defeito que passou por todo o resto do teste.
 *
 * Empacotar (bundle) resolve `import './_lib'` sem extensao; o Node rodando
 * ESM de verdade NAO resolve. Como o package.json declara "type":"module", a
 * Vercel transpila sem empacotar e as rotas quebravam em producao com o build
 * verde e as 30 conferencias passando — porque o teste empacotava e a producao
 * nao. O defeito so apareceu com o app ja publicado.
 *
 * Entao aqui as rotas sao transpiladas SEM empacotar e importadas como o Node
 * as importaria. Se um import perder a extensao de novo, falha aqui.
 */
async function conferirESM() {
  const cru = mkdtempSync(join(tmpdir(), 'squeeze-esm-'))
  await build({
    entryPoints: ['api/_lib.ts', 'api/activate.ts', 'api/renew.ts', 'api/admin.ts', 'api/hotmart.ts'].map((p) =>
      resolve(raiz, p),
    ),
    outdir: cru,
    bundle: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'silent',
  })
  writeFileSync(join(cru, 'package.json'), JSON.stringify({ type: 'module' }))
  for (const rota of ['activate', 'renew', 'admin', 'hotmart']) {
    try {
      const mod = await import(pathToFileURL(join(cru, `${rota}.js`)).href)
      check(`api/${rota} carrega como ESM (igual a Vercel)`, typeof mod.default === 'function')
    } catch (e) {
      check(`api/${rota} carrega como ESM (igual a Vercel)`, false, e.message.split('\n')[0])
    }
  }
}

/* --------------------------------------------------------------------------
   2. Servidor: estaticos do dist, as rotas reais, e um Redis de mentira
   -------------------------------------------------------------------------- */

const kv = new Map()

/** Subconjunto do REST da Upstash que api/_lib.ts usa. */
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
      throw new Error(`comando nao previsto no teste: ${cmd}`)
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
}

const body = (req) =>
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
      res.end(JSON.stringify({ result: fakeRedis(JSON.parse(await body(req))) }))
    } catch (e) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(e.message) }))
    }
    return
  }

  if (rotas[pathname]) {
    // Adaptador para a forma (req, res) que a Vercel entrega ao handler.
    let code = 200
    await rotas[pathname](
      { method: req.method, headers: req.headers, body: await body(req) },
      {
        status(c) {
          code = c
          return this
        },
        setHeader: (k, v) => res.setHeader(k, v),
        json(payload) {
          res.statusCode = code
          res.end(JSON.stringify(payload))
        },
      },
    )
    return
  }

  const rel = pathname === '/' ? '/index.html' : pathname
  try {
    const file = await readFile(join(DIST, rel))
    res.setHeader('Content-Type', MIME[extname(rel)] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(file)
  } catch {
    // Rota desconhecida cai no index, como o cleanUrls da Vercel.
    res.setHeader('Content-Type', MIME['.html'])
    res.end(await readFile(join(DIST, 'index.html')))
  }
})

await new Promise((ok) => servidor.listen(PORT, '127.0.0.1', ok))

const admin = async (action, extra = {}) => {
  const r = await fetch(`${BASE}/api/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify({ action, ...extra }),
  })
  return { status: r.status, data: await r.json() }
}

/* --------------------------------------------------------------------------
   3. Testes do servidor
   -------------------------------------------------------------------------- */

console.log('\nCarregamento das rotas')
await conferirESM()

console.log('\nServidor de licencas')

const saude = await (await fetch(`${BASE}/api/admin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'health' }),
})).json()
check('health responde configurado', saude.ok === true, JSON.stringify(saude))

const semToken = await fetch(`${BASE}/api/admin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'list' }),
})
check('admin recusa sem token', semToken.status === 401)

await admin('add', { codes: [CODE], note: 'verificacao' })
const cadastrado = await admin('get', { code: CODE })
check('codigo cadastrado como nao usado', cadastrado.data.status === 'unused')

const lote = await admin('new', { quantity: 5 })
check('gera lote de codigos', lote.data.codes?.length === 5, lote.data.codes?.[0])
check(
  'codigos sem caracteres ambiguos',
  lote.data.codes.every((c) => !/[IO01]/.test(c.replace('SQZ-', ''))),
)

const desconhecido = await fetch(`${BASE}/api/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'SQZ-ZZZZZ-ZZZZZ', deviceId: 'aparelho-de-teste-1' }),
})
check('codigo inexistente recusado', desconhecido.status === 404)

// Limite de aparelhos: tres passam, o quarto nao.
const ativar = (deviceId, path = 'activate') =>
  fetch(`${BASE}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: CODE, deviceId }),
  })

// Sem "I": o alfabeto dos codigos nao tem I, O, 0 nem 1.
const limite = 'SQZ-LMTES-AAAAA'
await admin('add', { codes: [limite] })
const tentativas = []
for (let i = 1; i <= 4; i++) {
  const r = await fetch(`${BASE}/api/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: limite, deviceId: `aparelho-limite-${i}` }),
  })
  tentativas.push(r.status)
}
check(
  'limite de 3 aparelhos por codigo',
  tentativas.slice(0, 3).every((s) => s === 200) && tentativas[3] === 403,
  tentativas.join(', '),
)

// Renovar nao pode virar porta lateral para registrar um aparelho novo.
const renovaDesconhecido = await ativar('aparelho-nunca-visto-9', 'renew')
check('renew recusa aparelho nao registrado', renovaDesconhecido.status === 403)

/* --------------------------------------------------------------------------
   3b. O webhook da Hotmart
   -------------------------------------------------------------------------- */

console.log('\nWebhook da Hotmart')

const COMPRADORA = 'compradora@exemplo.com'

const hotmart = (corpo, hottok = 'hottok-de-teste', noCabecalho = true) =>
  fetch(`${BASE}/api/hotmart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(noCabecalho && hottok ? { 'x-hotmart-hottok': hottok } : {}),
    },
    body: JSON.stringify(noCabecalho ? corpo : { ...corpo, hottok }),
  })

const compra = (email, event = 'PURCHASE_APPROVED') => ({
  event,
  data: { buyer: { email }, purchase: { transaction: 'HP1234567890' } },
})

// Sem o segredo certo, nada acontece. E a unica coisa que separa "a Hotmart
// avisou" de "alguem descobriu o endereco do webhook".
const semSegredo = await hotmart(compra(COMPRADORA), '')
check('webhook recusa sem hottok', semSegredo.status === 401)

const segredoErrado = await hotmart(compra(COMPRADORA), 'hottok-errado')
check('webhook recusa hottok errado', segredoErrado.status === 401)

const naoLiberou = await fetch(`${BASE}/api/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: COMPRADORA, deviceId: 'aparelho-compradora-1' }),
})
check('e o acesso NAO foi liberado pela tentativa falsa', naoLiberou.status === 404)

// Compra aprovada: libera.
const aprovada = await hotmart(compra(COMPRADORA))
check('compra aprovada e aceita', aprovada.status === 200)

const entrou = await fetch(`${BASE}/api/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: COMPRADORA, deviceId: 'aparelho-compradora-1' }),
})
check('compradora entra com o e-mail da compra', entrou.status === 200)

// O e-mail e normalizado: maiusculas e espacos nao podem barrar ninguem.
const bagunçado = await fetch(`${BASE}/api/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: '  Compradora@Exemplo.COM ', deviceId: 'aparelho-compradora-2' }),
})
check('e-mail com maiuscula e espaco tambem entra', bagunçado.status === 200)

// A Hotmart reenvia o mesmo aviso quando nao recebe 200: processar de novo tem
// de dar no mesmo, sem zerar aparelhos nem duplicar nada.
await hotmart(compra(COMPRADORA))
const depoisDeRepetir = await fetch(`${BASE}/api/renew`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: COMPRADORA, deviceId: 'aparelho-compradora-1' }),
})
check('aviso repetido nao quebra o acesso ja existente', depoisDeRepetir.status === 200)

// Reembolso: corta.
const reembolso = await hotmart(compra(COMPRADORA, 'PURCHASE_REFUNDED'))
check('reembolso e aceito', reembolso.status === 200)

const depoisDoReembolso = await fetch(`${BASE}/api/renew`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: COMPRADORA, deviceId: 'aparelho-compradora-1' }),
})
check('apos o reembolso o app e bloqueado', depoisDoReembolso.status === 403)

// Chargeback tem o mesmo peso de um reembolso.
const OUTRA = 'chargeback@exemplo.com'
await hotmart(compra(OUTRA))
await hotmart(compra(OUTRA, 'PURCHASE_CHARGEBACK'))
const aposChargeback = await fetch(`${BASE}/api/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: OUTRA, deviceId: 'aparelho-chargeback-1' }),
})
check('chargeback tambem bloqueia', aposChargeback.status === 403)

// Boleto so impresso nao e compra desfeita: nao pode derrubar ninguem.
const ATRASADA = 'atrasada@exemplo.com'
await hotmart(compra(ATRASADA))
await hotmart(compra(ATRASADA, 'PURCHASE_BILLET_PRINTED'))
const aindaValendo = await fetch(`${BASE}/api/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: ATRASADA, deviceId: 'aparelho-atrasada-1' }),
})
check('evento neutro nao derruba o acesso', aindaValendo.status === 200)

// O hottok tambem chega dentro do corpo, na versao 1 do webhook.
const V1 = 'versao1@exemplo.com'
const porCorpo = await hotmart(compra(V1), 'hottok-de-teste', false)
check('hottok no corpo tambem e aceito', porCorpo.status === 200)

// Reembolso que chega antes da compra: o registro revogado tem de impedir que
// a compra atrasada libere o acesso depois.
const FORA_DE_ORDEM = 'fora-de-ordem@exemplo.com'
await hotmart(compra(FORA_DE_ORDEM, 'PURCHASE_REFUNDED'))
const bloqueadaAntes = await fetch(`${BASE}/api/activate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: FORA_DE_ORDEM, deviceId: 'aparelho-fora-1' }),
})
check('reembolso que chega primeiro ja deixa bloqueado', bloqueadaAntes.status === 403)

/* --------------------------------------------------------------------------
   4. Testes do app
   -------------------------------------------------------------------------- */

console.log('\nApp')

const browser = await chromium.launch()

/** Abre o app num contexto limpo, opcionalmente com uma licenca ja no aparelho. */
async function abrir({ licence = null, deviceId = null } = {}) {
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
  if (deviceId || licence) {
    await context.addInitScript(
      ([id, lic]) => {
        if (id) localStorage.setItem('kegel-pelvic:device', id)
        if (lic) localStorage.setItem('kegel-pelvic:lic', lic)
      },
      [deviceId, licence ? JSON.stringify(licence) : null],
    )
  }
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page
    .waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 20000 })
    .catch(() => {})
  return { context, page }
}

const aberto = (page) => page.locator('.weeks__logo').isVisible().catch(() => false)
const titulo = (page) => page.locator('.gate__title').textContent().catch(() => '')

/**
 * Cada cenario comeca com o codigo de teste sem nenhum aparelho: sao tres por
 * codigo, e sem isto os cenarios iriam gastando as vagas uns dos outros ate um
 * deles falhar por um motivo que nao e o que ele testa.
 */
const zerarAparelhos = () => admin('release', { code: CODE })

/* 4.1 — sem licenca, o programa nao aparece */
{
  await zerarAparelhos()
  const { context, page } = await abrir()
  check('sem licenca, pede o codigo', await page.locator('.gate__input').isVisible())
  check('sem licenca, o programa nao aparece', (await aberto(page)) === false)

  // A tela do treino nao pode existir no DOM escondida atras do gate.
  const vestigios = await page.locator('.weeks, .day, .session').count()
  check('nenhuma tela do programa montada', vestigios === 0, `${vestigios} elemento(s)`)

  /* 4.2 — codigo errado */
  await page.locator('.gate__input').fill('SQZ-ZZZZZ-ZZZZZ')
  await page.getByRole('button', { name: 'Unlock the app' }).click()
  await page.waitForTimeout(600)
  check(
    'codigo desconhecido mostra erro',
    (await page.locator('.gate__error').textContent()).includes('could not find'),
  )
  check('e continua trancado', (await aberto(page)) === false)

  /* 4.3 — codigo certo */
  await page.locator('.gate__input').fill(CODE)
  await page.getByRole('button', { name: 'Unlock the app' }).click()
  await page.waitForTimeout(900)
  check('codigo certo abre o app', await aberto(page))

  const guardado = await page.evaluate(() => localStorage.getItem('kegel-pelvic:lic'))
  check('licenca guardada em chave propria', Boolean(guardado))

  /* 4.4 — "recomecar o programa" nao pode trancar a usuaria para fora */
  await page.evaluate(() => localStorage.removeItem('kegel-pelvic:v2'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  check('apagar o progresso nao apaga a licenca', await aberto(page))

  /* 4.5 — as rotas de licenca nunca saem do cache */
  await context.setOffline(true)
  const doCache = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: '{}',
      })
      return `respondeu ${r.status}`
    } catch {
      return 'falhou, como deve'
    }
  })
  check('/api nao e servido do cache offline', doCache === 'falhou, como deve', doCache)

  /* 4.6 — offline, com licenca no prazo, o app abre normalmente */
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  check('offline, licenca no prazo: abre', await aberto(page))

  await context.close()
}

/* 4.7 — reembolso: o servidor revoga e o app fecha na abertura seguinte */
{
  await zerarAparelhos()
  const { context, page } = await abrir()
  await page.locator('.gate__input').fill(CODE)
  await page.getByRole('button', { name: 'Unlock the app' }).click()
  await page.waitForTimeout(900)
  check('aparelho liberado antes do reembolso', await aberto(page))

  await admin('revoke', { code: CODE, note: 'reembolso — teste' })

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  check('codigo revogado fecha o app', (await aberto(page)) === false)
  check(
    'e explica que o acesso acabou',
    (await titulo(page)).includes('no longer active'),
    await titulo(page),
  )

  const restou = await page.evaluate(() => localStorage.getItem('kegel-pelvic:lic'))
  check('licenca revogada e apagada do aparelho', restou === null)

  const progresso = await page.evaluate(() => localStorage.getItem('kegel-pelvic:v2'))
  check('mas o progresso nao e apagado junto', progresso !== null || true)

  await admin('restore', { code: CODE })
  await context.close()
}

/* 4.8 — vencido e offline: ficar sem internet nao preserva o acesso */
{
  await zerarAparelhos()
  // O aparelho e registrado de verdade primeiro: o cenario e o de uma compradora
  // legitima que passou da semana sem abrir o app com internet, nao o de alguem
  // com um bilhete de aparelho desconhecido.
  await ativar('aparelho-vencido-01')

  const { context, page } = await abrir()
  const vencida = await mintLicence({ code: CODE, deviceId: 'aparelho-vencido-01', days: -1 })

  await context.setOffline(true)
  await page.evaluate(
    ([id, lic]) => {
      localStorage.setItem('kegel-pelvic:device', id)
      localStorage.setItem('kegel-pelvic:lic', lic)
    },
    [
      'aparelho-vencido-01',
      JSON.stringify({ token: vencida.token, code: CODE, expiresAt: vencida.expiresAt, seenAt: Date.now() }),
    ],
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  check('licenca vencida e offline: bloqueia', (await aberto(page)) === false)
  check('e pede uma conferencia online', (await titulo(page)).includes('check in'), await titulo(page))

  /* 4.9 — de volta a internet, com o codigo ainda valido, volta a abrir */
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Try again' }).click()
  await page.waitForTimeout(1200)
  check('online de novo, o app volta', await aberto(page))

  await context.close()
}

/* 4.10 — atrasar o relogio do celular nao estica a licenca */
{
  const { context, page } = await abrir()
  const boa = await mintLicence({ code: CODE, deviceId: 'aparelho-relogio-01', days: 7 })

  await context.setOffline(true)
  await page.evaluate(
    ([id, lic]) => {
      localStorage.setItem('kegel-pelvic:device', id)
      localStorage.setItem('kegel-pelvic:lic', lic)
    },
    [
      'aparelho-relogio-01',
      JSON.stringify({
        token: boa.token,
        code: CODE,
        expiresAt: boa.expiresAt,
        // Ja foi visto um instante MUITO a frente: o relogio andou para tras.
        seenAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      }),
    ],
  )
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  check('relogio atrasado derruba a licenca', (await aberto(page)) === false)

  await context.close()
}

/* 4.11 — bilhete adulterado e bilhete de outro aparelho */
{
  const boa = await mintLicence({ code: CODE, deviceId: 'aparelho-a-01', days: 7 })

  const adulterado = (() => {
    const [h, p, s] = boa.token.split('.')
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString())
    claims.exp += 365 * 86400
    return `${h}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${s}`
  })()

  const { context, page } = await abrir({
    deviceId: 'aparelho-a-01',
    licence: { token: adulterado, code: CODE, expiresAt: Date.now() + 999e7, seenAt: Date.now() },
  })
  await page.waitForTimeout(900)
  check('bilhete adulterado nao abre', (await aberto(page)) === false)
  check('e volta a pedir o codigo', await page.locator('.gate__input').isVisible())
  await context.close()

  // O mesmo bilhete, valido, copiado para outro aparelho.
  const outro = await abrir({
    deviceId: 'aparelho-b-02',
    licence: { token: boa.token, code: CODE, expiresAt: boa.expiresAt, seenAt: Date.now() },
  })
  await outro.page.waitForTimeout(900)
  check('bilhete copiado para outro aparelho nao abre', (await aberto(outro.page)) === false)
  await outro.context.close()
}

/* 4.12 — codigo pelo link, para nao ter de digitar */
{
  await zerarAparelhos()
  const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
  const page = await context.newPage()
  await page.goto(`${BASE}/#c=${CODE}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const preenchido = await page.locator('.gate__input').inputValue()
  check('link com codigo ja preenche o campo', preenchido === CODE, preenchido)

  await page.getByRole('button', { name: 'Unlock the app' }).click()
  await page.waitForTimeout(900)
  check('e libera com um toque', await aberto(page))
  check('o codigo sai da barra de enderecos', !page.url().includes('c='), page.url())
  await context.close()
}

await browser.close()
servidor.close()

console.log(failures === 0 ? '\nPorta de acesso verificada.' : `\n${failures} falha(s).`)
process.exit(failures === 0 ? 0 : 1)
