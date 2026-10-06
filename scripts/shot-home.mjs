// Captura da home com progresso parcial, para conferir os cards separados.
import { chromium, devices } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173'

const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
const page = await context.newPage()

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  localStorage.setItem(
    'kegel-pelvic:v2',
    JSON.stringify({
      completedWorkouts: ['1-1-strength', '1-1-pulse'],
      dayCompletedAt: {},
      introRead: true,
      settings: { sound: true, vibration: true, keepScreenOn: true, language: 'en', pulseSeconds: 1.05, holdSeconds: 5 },
    }),
  )
})
await page.reload({ waitUntil: 'networkidle' })
const notNow = page.getByRole('button', { name: 'Not now' })
if (await notNow.count()) await notNow.click()
await page.waitForTimeout(600)
await page.screenshot({ path: resolve(here, '../screenshots/home-cards.png') })
await browser.close()
console.log('ok')
