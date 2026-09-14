/**
 * Confere que o app abre sem internet depois da primeira visita, e que o
 * progresso sobrevive ao fechamento — as duas promessas que substituem a loja.
 *
 * Uso: npx vite preview --port 4173   (em outro terminal)
 *      node scripts/verify-offline.mjs
 */
import { chromium, devices } from 'playwright'
import { licenceEverywhere } from './_licence.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
let failures = 0

const check = (label, ok, detail = '') => {
  if (!ok) failures++
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${label}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch()
// O app so abre com licenca: o aparelho ja entra liberado, como o de quem
// comprou. A porta de acesso em si e verificada em verify-license.mjs.
licenceEverywhere(browser)
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
const page = await context.newPage()

// 1. Primeira visita: o service worker precisa assumir o controle.
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 20000 })
check('service worker assumiu o controle', true)

// O que importa não é a contagem, e sim que o essencial esteja lá: a página,
// o bundle, o CSS e o vídeo mudo do wake lock do iOS.
const cached = await page.evaluate(async () => {
  const names = await caches.keys()
  const urls = []
  for (const n of names) {
    for (const req of await (await caches.open(n)).keys()) urls.push(req.url)
  }
  return urls
})

for (const [label, pattern] of [
  ['documento', /\/(index\.html)?(\?|$)/],
  ['bundle JS', /assets\/index-.*\.js/],
  ['CSS', /assets\/index-.*\.css/],
  ['manifesto', /manifest\.webmanifest/],
  ['vídeo do wake lock', /silence\.mp4/],
  ['ícone 512', /icon-512\.png/],
]) {
  check(`no cache: ${label}`, cached.some((u) => pattern.test(u)))
}
console.log(`       (${cached.length} entradas no total)`)

// 2. Grava progresso, para conferir que sobrevive.
await page.evaluate(() => {
  localStorage.setItem(
    'kegel-pelvic:v2',
    JSON.stringify({
      completedWorkouts: ['1-1-strength', '1-1-pulse'],
      dayCompletedAt: { '1-1': '2026-08-27' },
      introRead: true,
      settings: {
        sound: true,
        vibration: true,
        keepScreenOn: true,
        language: 'en',
        pulseSeconds: 0.35,
        holdSeconds: 5,
      },
    }),
  )
})

// 3. Corta a rede e recarrega.
await context.setOffline(true)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)

const logoOffline = await page
  .locator('.weeks__logo')
  .evaluate((el) => el.complete && el.naturalWidth > 0)
  .catch(() => null)
check('app abriu offline, com o logo', logoOffline === true, String(logoOffline))

const day1Done = await page.locator('.day-chip--done').count()
check('progresso preservado offline', day1Done === 1, `${day1Done} dia(s) concluído(s)`)

// 4. Entra num treino offline: nenhuma tela pode depender da rede.
await context.setOffline(true)
const dismiss = page.getByRole('button', { name: 'Not now' })
if (await dismiss.isVisible().catch(() => false)) await dismiss.click()

await page.getByRole('button', { name: 'Week 1, Day 2' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Start workout/ }).first().click()
await page.waitForTimeout(4500)

const ballVisible = await page.locator('.ball-stage__ball').isVisible()
check('treino roda offline', ballVisible)

const t = await page
  .locator('.ball-stage')
  .evaluate((el) => getComputedStyle(el).getPropertyValue('--t'))
check('bolinha animando offline', parseFloat(t) > 0, `--t = ${t.trim()}`)

// 5. O ajuste semeado (0,35 s) esta no formato antigo, de meio ciclo. A leitura
// tem de converte-lo para o novo, que e a repeticao inteira: 0,35 x 2 = 0,7,
// arredondado para a opcao mais proxima, 0,8 s.
const settings = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('kegel-pelvic:v2')).settings,
)
check(
  'ajuste antigo de ritmo convertido',
  settings.pulseSeconds === 0.8,
  `0.35s (meio ciclo) -> ${settings.pulseSeconds}s (repetição inteira)`,
)

await browser.close()

console.log(failures === 0 ? '\nOffline verificado.' : `\n${failures} falha(s).`)
process.exit(failures === 0 ? 0 : 1)
