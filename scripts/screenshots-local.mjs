/**
 * Percorre o app em um iPhone simulado e guarda as telas em screenshots/.
 * Serve para conferir o resultado sem precisar de um aparelho na mÃ£o.
 *
 * Uso: npx vite preview --port 4173   (em outro terminal)
 *      node scripts/screenshots.mjs
 */
import { chromium, devices } from 'playwright'
// Porta de acesso desligada neste build (VITE_REQUIRE_LICENSE=false): a
// licenca forjada do _licence.mjs nao e necessaria para percorrer as telas.
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../screenshots')
const BASE = process.env.BASE_URL ?? 'http://localhost:4173'

const STORAGE_KEY = 'kegel-pelvic:v2'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath: 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' })
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
const page = await context.newPage()

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

const shot = async (name) => {
  await page.waitForTimeout(450)
  await page.screenshot({ path: resolve(outDir, `${name}.png`) })
  console.log(`  ${name}.png`)
}

/** Grava progresso direto no storage e recarrega. */
const seed = async (completedWorkouts, introRead = true) => {
  await page.evaluate(
    ([key, done, intro]) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          completedWorkouts: done,
          dayCompletedAt: {},
          introRead: intro,
          settings: {
            sound: true,
            vibration: true,
            keepScreenOn: true,
            language: 'en',
            pulseSeconds: 0.5,
            holdSeconds: 5,
          },
        }),
      )
    },
    [STORAGE_KEY, completedWorkouts, introRead],
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)

// A dica de instalaÃ§Ã£o do iOS aparece sozinha e Ã© modal de propÃ³sito.
await page.waitForSelector('.install', { timeout: 8000 })
await shot('00-install-ios')
await page.getByRole('button', { name: 'Not now' }).click()
await page.waitForTimeout(300)

// 1. Home: as 6 semanas, com "Start here" em destaque por ainda nÃ£o ter sido lido.
await shot('01-program')

const week2Locked = await page.locator('.week--locked').count()
console.log(`  semanas travadas no inÃ­cio: ${week2Locked} (esperado 5)`)
if (week2Locked !== 5) errors.push(`travamento de semanas errado: ${week2Locked}`)

// 2. "Find the right muscle" â€” o pedido da cliente para abrir o app.
await page.getByRole('button', { name: /Start here/ }).click()
await shot('02-find-the-muscle')

// 3. Detalhe do dia, com a postura em destaque.
await page.getByRole('button', { name: /Got it, start week 1/ }).click()
await page.waitForTimeout(400)
await shot('03-day-lying')

const postureText = await page.locator('.posture__hint').textContent()
console.log(`  postura da semana 1: ${postureText?.slice(0, 40)}â€¦`)

// 4. ExecuÃ§Ã£o: contraÃ§Ã£o rÃ¡pida, semana 1.
await page.getByRole('button', { name: /Start workout/ }).first().click()
await page.waitForTimeout(4200)
await shot('04-session-quick')

// A bolinha passa 1,6 s parada em cada ponta, entao comparar dois instantes
// quaisquer nao prova nada: os dois podem cair dentro da mesma parada. O que
// se quer saber e se ela percorre o trilho inteiro ao longo de uma repeticao.
const amostras = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const out = []
      const id = setInterval(() => {
        const el = document.querySelector('.ball-stage')
        if (el) out.push(+getComputedStyle(el).getPropertyValue('--t'))
        if (out.length >= 90) {
          clearInterval(id)
          resolve(out)
        }
      }, 60)
    }),
)
const minimo = Math.min(...amostras)
const maximo = Math.max(...amostras)
console.log(`  --t percorreu de ${minimo.toFixed(2)} a ${maximo.toFixed(2)}`)
if (maximo < 0.9 || minimo > 0.1) {
  errors.push(`a bolinha nao percorreu o trilho (${minimo.toFixed(2)}..${maximo.toFixed(2)})`)
}

// 5. Descanso, depois da primeira sÃ©rie (10 reps x 2s = 20s).
await page.waitForTimeout(18000)
await shot('05-rest')
console.log(`  descanso mostrando: ${await page.locator('.session__countdown-number').textContent()}`)

// 6. Progresso parcial na home: semana 1 em andamento.
await page.getByRole('button', { name: 'Leave workout' }).click()
await page.getByRole('button', { name: 'Back' }).click()
await seed(['1-1-strength', '1-1-pulse', '1-2-strength'])
await shot('06-program-progress')

// 7. Semana 4: a primeira com sustentaÃ§Ã£o de 5 segundos.
const week1and2and3 = []
for (const w of [1, 2, 3]) {
  for (let d = 1; d <= 7; d++) week1and2and3.push(`${w}-${d}-strength`, `${w}-${d}-pulse`)
}
await seed(week1and2and3)
await shot('07-program-week4-open')

await page.getByRole('button', { name: 'Week 4, Day 1' }).click()
await page.waitForTimeout(400)
await shot('08-day-standing-hold')

// 8. A fase de sustentaÃ§Ã£o: bolinha parada no topo, com a contagem.
await page.getByRole('button', { name: /Start workout/ }).first().click()
await page.waitForSelector('.session__hold', { timeout: 12000 })
await page.waitForTimeout(900)
await shot('09-session-hold')

const holdCount = await page.locator('.session__hold-count').textContent()
console.log(`  contagem da sustentaÃ§Ã£o: ${holdCount}`)

// 9. PulsaÃ§Ã£o, com a bolinha central.
await page.getByRole('button', { name: 'Leave workout' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Start workout/ }).last().click()
await page.waitForTimeout(4000)
await shot('10-session-pulse')
console.log(`  modo pulsaÃ§Ã£o ativo: ${(await page.locator('.ball-stage--pulse').count()) === 1}`)

// 10. Ajustes, incluindo o seletor de idioma.
await page.getByRole('button', { name: 'Leave workout' }).click()
await page.getByRole('button', { name: 'Back' }).click()
await page.getByRole('button', { name: 'Settings' }).click()
await shot('11-settings')

// 11. PortuguÃªs, para a cliente revisar o conteÃºdo.
await page.getByRole('radio', { name: /Portugu/ }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'Voltar' }).click()
await shot('12-program-pt')

await browser.close()

if (errors.length) {
  console.log('\nProblemas encontrados:')
  for (const e of errors) console.log(`  - ${e}`)
  process.exit(1)
}
console.log('\nPercurso completo, sem erros de pÃ¡gina.')
