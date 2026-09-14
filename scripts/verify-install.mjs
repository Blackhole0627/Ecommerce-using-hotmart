/**
 * Verificação de instalação e de aceite.
 *
 * Duas perguntas, contra o site publicado:
 *
 *   1. O app instala mesmo na tela inicial, no iPhone e no Android?
 *   2. Cada coisa que a cliente pediu está lá e funciona?
 *
 * Uso:  BASE_URL=https://femivita.online node scripts/verify-install.mjs
 *       (sem BASE_URL, testa o preview local)
 */
import { chromium, devices } from 'playwright'
import { licenceEverywhere } from './_licence.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const KEY = 'kegel-pelvic:v2'

let fails = 0
const ok = (label, pass, detail = '') => {
  if (!pass) fails++
  console.log(`  ${pass ? 'ok   ' : 'FALHA'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const secao = (t) => console.log(`\n${t}\n${'-'.repeat(t.length)}`)

const browser = await chromium.launch()
// O app so abre com licenca: todo contexto ja entra liberado, como o de quem
// comprou. A porta de acesso em si e verificada em verify-license.mjs.
licenceEverywhere(browser)

try {
  // ===========================================================================
  secao('1. Manifesto e ícones — o que a loja do sistema lê para instalar')
  // ===========================================================================
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })

  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href')
  ok('a página declara um manifesto', !!manifestHref, manifestHref ?? '')

  const m = await page.evaluate(async (href) => {
    const r = await fetch(href)
    return { status: r.status, url: r.url, body: await r.json() }
  }, manifestHref)

  ok('o manifesto carrega', m.status === 200, `HTTP ${m.status}`)
  ok('tem name', !!m.body.name, m.body.name)
  ok('tem short_name', !!m.body.short_name, m.body.short_name)
  ok(
    'short_name cabe embaixo do ícone (até 12)',
    (m.body.short_name ?? '').length <= 12,
    `${(m.body.short_name ?? '').length} caracteres`,
  )
  ok('display é standalone', m.body.display === 'standalone', m.body.display)
  ok('tem start_url', !!m.body.start_url, m.body.start_url)
  ok('tem theme_color', !!m.body.theme_color, m.body.theme_color)
  ok('idioma do manifesto bate com o do documento', m.body.lang === 'en-US', m.body.lang)

  const sizes = (m.body.icons ?? []).map((i) => i.sizes)
  ok('tem ícone 192 (exigência do Android)', sizes.includes('192x192'), sizes.join(' '))
  ok('tem ícone 512 (exigência do Android)', sizes.includes('512x512'))
  ok(
    'tem ícone maskable (evita o ícone recortado no Android)',
    (m.body.icons ?? []).some((i) => (i.purpose ?? '').includes('maskable')),
  )

  // Os ícones existem de verdade e têm as dimensões que o manifesto promete?
  for (const icon of m.body.icons ?? []) {
    const info = await page.evaluate(
      (src) =>
        new Promise((res) => {
          const img = new Image()
          img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight })
          img.onerror = () => res(null)
          img.src = src
        }),
      new URL(icon.src, m.url).href,
    )
    const [w, h] = icon.sizes.split('x').map(Number)
    ok(`ícone ${icon.sizes} carrega no tamanho certo`, info?.w === w && info?.h === h,
       info ? `${info.w}x${info.h}` : 'não carregou')
  }

  // ===========================================================================
  secao('2. iPhone — o caminho que não tem convite automático')
  // ===========================================================================
  ok(
    'apple-mobile-web-app-capable presente (sem isso abre no Safari, não em tela cheia)',
    (await page.getAttribute('meta[name="apple-mobile-web-app-capable"]', 'content')) === 'yes',
  )
  const appleTitle = await page.getAttribute('meta[name="apple-mobile-web-app-title"]', 'content')
  ok('apple-mobile-web-app-title presente', !!appleTitle, appleTitle ?? '')

  const appleIcon = await page.getAttribute('link[rel="apple-touch-icon"]', 'href')
  const appleOk = await page.evaluate(
    (src) =>
      new Promise((res) => {
        const i = new Image()
        i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight })
        i.onerror = () => res(null)
        i.src = src
      }),
    new URL(appleIcon, BASE).href,
  )
  ok('apple-touch-icon carrega', !!appleOk, appleOk ? `${appleOk.w}x${appleOk.h}` : 'não carregou')

  const viewport = await page.getAttribute('meta[name="viewport"]', 'content')
  ok(
    'viewport-fit=cover (libera a área segura; sem isso o botão fica sob a barra de gestos)',
    (viewport ?? '').includes('viewport-fit=cover'),
  )

  // A dica manual precisa aparecer: o iOS não oferece nenhum convite próprio.
  await page.waitForSelector('.install', { timeout: 9000 })
  const passos = await page.locator('.install__steps li').count()
  ok('a dica de instalação aparece no iPhone', true)
  ok('a dica traz o passo a passo', passos === 3, `${passos} passos`)
  const textoDica = await page.locator('.install').innerText()
  ok('a dica cita "Add to Home Screen"', /Add to Home Screen/i.test(textoDica))

  // Uma vez dispensada, não volta a incomodar.
  await page.getByRole('button', { name: 'Not now' }).click()
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3200)
  ok('depois de dispensada, não reaparece', (await page.locator('.install').count()) === 0)

  // ===========================================================================
  secao('3. Já instalado — como o app se comporta aberto pelo ícone')
  // ===========================================================================
  const standalone = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
  const sp = await standalone.newPage()
  // Finge a abertura em tela cheia, como o iOS faz a partir do ícone.
  await sp.addInitScript(() => {
    Object.defineProperty(window.navigator, 'standalone', { get: () => true })
  })
  await sp.goto(BASE, { waitUntil: 'networkidle' })
  await sp.waitForTimeout(3200)
  ok(
    'aberto pelo ícone, a dica de instalar não aparece',
    (await sp.locator('.install').count()) === 0,
  )
  ok('a home carrega instalada', (await sp.locator('.weeks__logo').count()) === 1)
  await standalone.close()

  // ===========================================================================
  secao('4. Android — o convite automático do Chrome')
  // ===========================================================================
  const andCtx = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' })
  const ap = await andCtx.newPage()
  // O Chrome real dispara beforeinstallprompt; o navegador de teste não.
  // Simula o evento para conferir que o app o intercepta e mostra o botão.
  await ap.addInitScript(() => {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const e = new Event('beforeinstallprompt')
        e.prompt = async () => {}
        e.userChoice = Promise.resolve({ outcome: 'accepted' })
        window.dispatchEvent(e)
      }, 400)
    })
  })
  await ap.goto(BASE, { waitUntil: 'networkidle' })
  await ap.waitForSelector('.install', { timeout: 9000 })
  const botaoAndroid = await ap.locator('.install__cta').count()
  ok('no Android aparece o botão de instalar, não o passo a passo', botaoAndroid === 1)
  await andCtx.close()

  // ===========================================================================
  secao('5. Service worker e uso sem internet')
  // ===========================================================================
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 20000 })
  ok('o service worker assumiu o controle', true)

  const temFetch = await page.evaluate(async () => {
    const r = await fetch('/sw.js')
    const t = await r.text()
    return /addEventListener\(['"]fetch['"]/.test(t) || /onfetch/.test(t) || t.includes('workbox')
  })
  ok('o service worker trata requisições (exigência do Chrome para instalar)', temFetch)

  await ctx.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  ok('abre sem internet', (await page.locator('.weeks__logo').count()) === 1)
  await ctx.setOffline(false)

  // ===========================================================================
  secao('6. O que a cliente pediu, item por item')
  // ===========================================================================
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const dispensar = page.getByRole('button', { name: 'Not now' })
  if (await dispensar.isVisible().catch(() => false)) await dispensar.click()

  // "o nome do app tem q ser adaptado para as americanas" — e o nome veio
  // escrito no logo que ela mandou depois: The Squeeze Method.
  const tituloDoc = await page.title()
  ok('o nome é o do logo dela', tituloDoc === 'The Squeeze Method', tituloDoc)

  // O logo dela é o cabeçalho: não é texto redesenhado, é a arte dela.
  const logo = page.locator('.weeks__logo')
  ok('o logo da cliente abre a tela inicial', (await logo.count()) === 1)
  const alt = (await logo.getAttribute('alt')) ?? ''
  ok(
    'o logo carrega o nome para quem usa leitor de tela',
    alt.includes('The Squeeze Method') && alt.includes('Pelvic Power & Wellness'),
    alt,
  )
  const carregou = await logo.evaluate((el) => el.complete && el.naturalWidth > 0)
  ok('o arquivo do logo carrega mesmo', carregou)
  ok('a interface está em inglês', (await page.locator('html').getAttribute('lang')) === 'en-US')

  // "no primeiro modulo ela explica como identificar o musculo certo,
  //  entao acho melhor colocar isso no comeco"
  const primeiroCartao = await page.locator('.screen__body > button, .screen__body > *').first()
  ok(
    '"Find the right muscle" é o primeiro item da tela',
    (await primeiroCartao.getAttribute('class'))?.includes('start-here') ?? false,
  )

  // Seis semanas, com as posturas na ordem que ela descreveu.
  const posturas = await page.locator('.week__posture').allInnerTexts()
  ok('são 6 semanas', posturas.length === 6, posturas.length + '')
  ok(
    'posturas na ordem pedida: deitada, sentada, em pé / em pé, deitada, sentada',
    JSON.stringify(posturas) ===
      JSON.stringify(['Lying down', 'Seated', 'Standing', 'Standing', 'Lying down', 'Seated']),
    posturas.join(' · '),
  )

  // Semana travada mostra "conclua a anterior" no lugar do estilo, então o
  // estilo só é legível com as semanas abertas. Conclui 1 a 5 para poder ler.
  ok('5 das 6 semanas começam travadas', (await page.locator('.week--locked').count()) === 5)

  const feitos = []
  for (const w of [1, 2, 3, 4, 5]) {
    for (let d = 1; d <= 7; d++) feitos.push(`${w}-${d}-strength`, `${w}-${d}-pulse`)
  }
  await page.evaluate(
    ([k, f]) =>
      localStorage.setItem(
        k,
        JSON.stringify({
          completedWorkouts: f,
          dayCompletedAt: {},
          introRead: true,
          settings: {
            sound: true,
            vibration: true,
            keepScreenOn: true,
            language: 'en',
            pulseSeconds: 1.05,
            holdSeconds: 5,
          },
        }),
      ),
    [KEY, feitos],
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.week', { timeout: 15000 })

  const estilos = await page.locator('.week__meta').allInnerTexts()
  ok(
    'semanas 1-3 contração rápida, 4-6 sustentada de 5s',
    estilos.slice(0, 3).every((s) => /Quick squeezes/.test(s)) &&
      estilos.slice(3).every((s) => /5-second holds/.test(s)),
    estilos.map((s) => s.split(' · ')[0]).join(' | '),
  )

  // Séries, repetições e descanso do que ela descreveu.
  await page.getByRole('button', { name: 'Week 1, Day 1' }).click()
  await page.waitForTimeout(500)
  const numeros = await page.locator('.workout').first().locator('.workout__stats dd').allInnerTexts()
  ok('5 séries', numeros[0] === '5', numeros[0])
  ok('10 repetições', numeros[1] === '10', numeros[1])
  ok('45s de descanso', numeros[2] === '45s', numeros[2])

  const segundoTreino = await page.locator('.workout__title').nth(1).innerText()
  ok('o treino de pulsação vem em seguida', /Pulse/.test(segundoTreino), segundoTreino)

  await page.getByRole('button', { name: 'Back' }).click()
  await page.waitForTimeout(400)

  // ===========================================================================
  secao('7. Som, vibração e tela acesa durante o treino')
  // ===========================================================================
  await page.getByRole('button', { name: 'Week 1, Day 1' }).click()
  await page.waitForTimeout(400)
  // Semana 1 ficou concluida pela semeadura, entao o botao diz "Do it again".
  await page.getByRole('button', { name: /Start workout|Do it again/ }).first().click()
  await page.waitForSelector('.ball-stage', { timeout: 15000 })

  const audio = await page.evaluate(() => {
    const C = window.AudioContext || window.webkitAudioContext
    return { existe: !!C }
  })
  ok('Web Audio disponível para os sinais sonoros', audio.existe)
  ok(
    'controle de som na tela de execução',
    (await page.locator('button[aria-label*="sound" i]').count()) === 1,
  )
  // No iPhone não existe navigator.vibrate: o controle tem de sumir, não ficar morto.
  const temVibrate = await page.evaluate(() => typeof navigator.vibrate === 'function')
  const botaoVibra = await page.locator('button[aria-label*="vibration" i]').count()
  ok(
    'controle de vibração só aparece onde há vibração',
    temVibrate ? botaoVibra === 1 : botaoVibra === 0,
    temVibrate ? 'aparelho vibra' : 'sem vibração (como no iPhone): controle escondido',
  )
  ok('lembrete da postura visível durante o treino', (await page.locator('.session__posture').count()) === 1)

  await ctx.close()
} finally {
  await browser.close()
}

console.log(
  fails === 0
    ? '\nTudo verificado: instala e faz o que foi pedido.'
    : `\n${fails} verificação(ões) falharam.`,
)
process.exit(fails === 0 ? 0 : 1)
