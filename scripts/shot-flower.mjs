// Captura rápida da flor no treino (força e pulsação), para enviar à cliente.
import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../screenshots')
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
const page = await context.newPage()

const shot = async (name) => {
  await page.screenshot({ path: resolve(outDir, `${name}.png`) })
  console.log(`  ${name}.png`)
}

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('.install', { timeout: 8000 })
await page.getByRole('button', { name: 'Not now' }).click()
await page.waitForTimeout(300)

await page.getByRole('button', { name: /Start here/ }).click()
await page.getByRole('button', { name: /Got it, start week 1/ }).click()
await page.waitForTimeout(400)

// Treino de força: espera a flor chegar ao topo (aperta) para a foto.
await page.getByRole('button', { name: /Start workout/ }).first().click()
await page.waitForTimeout(4300)
await shot('flor-treino-forca')

// Pulsação: flor grande no centro.
await page.getByRole('button', { name: 'Leave workout' }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /Start workout/ }).last().click()
await page.waitForTimeout(4000)
await shot('flor-treino-pulsacao')

await browser.close()
console.log('ok')
