// Capturas das telas novas (pacote 11/09/2026): ebook e páginas legais.
import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../screenshots')
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe',
})
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
const page = await context.newPage()

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

const shot = async (name, fullPage = false) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage })
  console.log(`  ${name}.png`)
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('.install', { timeout: 8000 })
await page.getByRole('button', { name: 'Not now' }).click()
await page.waitForTimeout(300)

// 1. Área do ebook, a partir do card da home.
await page.getByRole('button', { name: /ebook/i }).click()
await shot('13-ebook')

// O link do PDF precisa existir e responder 200.
const href = await page.locator('a.ebook__open').getAttribute('href')
const res = await page.request.get(new URL(href, BASE).toString())
console.log(`  PDF ${href}: HTTP ${res.status()} (${(await res.body()).length} bytes)`)
if (res.status() !== 200) errors.push(`PDF não respondeu 200: ${res.status()}`)

// 2. Ajustes, rolado até o fim: seção legal visível.
await page.getByRole('button', { name: 'Back' }).click()
await page.getByRole('button', { name: 'Settings' }).click()
await page.waitForTimeout(400)
await page.evaluate(() => {
  document.querySelector('.screen__body')?.lastElementChild?.scrollIntoView()
  window.scrollTo(0, document.body.scrollHeight)
})
await shot('14-settings-legal')

// 3. As três páginas legais, inteiras.
for (const [name, label] of [
  ['15-privacy', 'Privacy Policy'],
  ['16-terms', 'Terms of Use'],
  ['17-disclaimer', 'Medical Disclaimer'],
]) {
  await page.getByRole('button', { name: label }).click()
  await page.waitForTimeout(300)
  await shot(name, true)
  await page.getByRole('button', { name: 'Back' }).click()
  await page.waitForTimeout(300)
}

// 4. Ebook em português, conferindo a dupla de dicionários.
await page.getByRole('radio', { name: /Portugu/ }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Voltar' }).click()
await page.getByRole('button', { name: /ebook/i }).click()
await shot('18-ebook-pt')

await browser.close()

if (errors.length) {
  console.log('\nProblemas encontrados:')
  for (const e of errors) console.log(`  - ${e}`)
  process.exit(1)
}
console.log('\nTelas novas conferidas, sem erros de página.')
