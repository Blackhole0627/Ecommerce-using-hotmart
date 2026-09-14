/**
 * Verificação de "o treino sumiu".
 *
 * A cliente relatou duas vezes a mesma coisa: pausou o treino, largou o
 * telefone, e ao voltar não havia mais treino nenhum. Este script reproduz o
 * caminho inteiro num iPhone emulado e cobra as quatro garantias que a resposta
 * depende de serem verdade:
 *
 *   1. o app pausa sozinho ao ir para segundo plano, em vez de continuar
 *      correndo invisível e gastar as séries sem ninguém;
 *   2. a tela pausada diz, com todas as letras, que o lugar está guardado;
 *   3. o lugar guardado inclui QUAL treino — retomar no treino de pulsação
 *      precisa voltar para a pulsação, não para o começo do de força;
 *   4. quem está no navegador vê, o tempo todo, o convite para instalar.
 *
 * O relógio é virtual: performance.now() e requestAnimationFrame são trocados
 * antes do app carregar, e cada quadro avança 100 ms. Uma sessão de seis
 * minutos roda em pouco mais de vinte segundos, sem mexer no código do motor.
 *
 * Uso:  node scripts/verify-resume.mjs
 *       BASE_URL=https://femivita.online node scripts/verify-resume.mjs
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

/** Relógio virtual + um gancho para simular o app indo para segundo plano. */
const RELOGIO = ({ passo }) => {
  let virtual = 0
  performance.now = () => virtual

  const pendentes = new Map()
  let proximo = 1
  window.requestAnimationFrame = (cb) => {
    const id = proximo++
    pendentes.set(
      id,
      setTimeout(() => {
        pendentes.delete(id)
        virtual += passo
        cb(virtual)
      }, 0),
    )
    return id
  }
  window.cancelAnimationFrame = (id) => {
    clearTimeout(pendentes.get(id))
    pendentes.delete(id)
  }

  const definir = (estado, escondido) => {
    Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true })
    Object.defineProperty(document, 'hidden', { value: escondido, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  }
  window.__esconder = () => definir('hidden', true)
  window.__mostrar = () => definir('visible', false)
}

const abrirTreino = async (page) => {
  await page.getByRole('button', { name: 'Week 1, Day 1' }).click()
  await page.locator('.day__workouts button.btn--primary').first().click()
  await page.locator('.session__posture').waitFor({ timeout: 15_000 })
}

const sessaoSalva = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}').activeSession ?? null, KEY)

const browser = await chromium.launch()
// O app so abre com licenca: todo contexto ja entra liberado, como o de quem
// comprou. A porta de acesso em si e verificada em verify-license.mjs.
licenceEverywhere(browser)

try {
  // ===========================================================================
  secao('1. Pausar e ir para segundo plano — o relato da cliente')
  // ===========================================================================
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
    await ctx.addInitScript(RELOGIO, { passo: 100 })
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await abrirTreino(page)

    // Deixa passar o preparo e entrar no treino de verdade.
    await page.locator('.ball-stage').waitFor({ timeout: 15_000 })

    const antes = await page.locator('.session__counter-series').innerText()

    await page.evaluate(() => window.__esconder())
    await page.waitForTimeout(300)

    const pausado = await page.locator('.session__paused').isVisible().catch(() => false)
    ok('sair do app pausa o treino sozinho', pausado)

    const textoPausa = await page.locator('.session__paused').innerText().catch(() => '')
    ok(
      'a tela pausada avisa que o lugar está guardado',
      /saved/i.test(textoPausa),
      textoPausa.replace(/\n/g, ' / '),
    )

    const botao = await page.locator('footer .btn--primary').innerText()
    ok('o botão passa a oferecer retomar', /resume/i.test(botao), botao.trim())

    // Enquanto escondido, o treino não pode andar: é isso que faz a cliente
    // voltar e encontrar séries que ela não fez.
    await page.waitForTimeout(1200)
    const depois = await page.locator('.session__counter-series').innerText()
    ok('o treino não avança em segundo plano', antes === depois, `${antes} → ${depois}`)

    const salva = await sessaoSalva(page)
    ok('a sessão ficou gravada no aparelho', !!salva, JSON.stringify(salva))

    // O aviso cobre o palco, e só o palco. Numa versão ele cobriu a tela
    // inteira e engoliu justamente o botão de voltar ao treino.
    await page.locator('footer .btn--primary').click({ timeout: 4000 })
    await page.waitForTimeout(200)
    const voltou = await page.locator('footer .btn--primary').innerText()
    ok('dá para retomar com o aviso na tela', /pause/i.test(voltou), voltou.trim())
    ok('o aviso sai ao retomar', (await page.locator('.session__paused').count()) === 0)

    await ctx.close()
  }

  // ===========================================================================
  secao('2. O app é descartado no meio da pulsação e volta no lugar certo')
  // ===========================================================================
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
    await ctx.addInitScript(RELOGIO, { passo: 100 })
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await abrirTreino(page)

    // Corre até o treino de pulsação, que emenda sozinho no de força.
    await page
      .locator('.session__posture')
      .filter({ hasText: 'Pulse workout' })
      .waitFor({ timeout: 180_000 })
    ok('o treino de força emenda na pulsação sem toque', true)

    // Espera chegar na segunda série da pulsação, para o teste ter o que provar.
    await page
      .locator('.session__counter-series')
      .filter({ hasText: 'Set 2/5' })
      .waitFor({ timeout: 60_000 })

    const salva = await sessaoSalva(page)
    ok(
      'o lugar guardado aponta para a PULSAÇÃO, não para o começo do dia',
      salva?.startIndex === 1,
      `startIndex ${salva?.startIndex}`,
    )
    ok('o lugar guardado tem a série certa', salva?.series === 2, `série ${salva?.series}`)

    // O iOS descarta a página: é um recarregamento, não uma saída de propósito.
    await page.reload({ waitUntil: 'networkidle' })

    const faixa = page.locator('.resume')
    ok('a faixa de retomar aparece na tela inicial', await faixa.isVisible())

    const textoFaixa = await faixa.innerText()
    ok(
      'a faixa diz em qual treino ela parou',
      /pulse/i.test(textoFaixa),
      textoFaixa.replace(/\n/g, ' / '),
    )

    // E ela precisa ser a primeira coisa da tela, não algo abaixo do programa.
    const primeiro = await page.evaluate(() => {
      const corpo = document.querySelector('.screen__body')
      const retomar = document.querySelector('.resume')
      if (!corpo || !retomar) return false
      return Array.from(corpo.children).indexOf(retomar) === 0
    })
    ok('a faixa é a primeira coisa do corpo da tela', primeiro)

    await faixa.locator('.resume__go').click()
    await page.locator('.session__posture').waitFor({ timeout: 15_000 })

    const onde = await page.locator('.session__posture').innerText()
    ok('retomar volta para a pulsação', /pulse/i.test(onde), onde.trim())

    await page
      .locator('.session__counter-series')
      .filter({ hasText: 'Set 2/5' })
      .waitFor({ timeout: 20_000 })
    ok('retomar volta na série em que parou', true, 'Set 2/5')

    await ctx.close()
  }

  // ===========================================================================
  secao('3. "É pra instalar o app no celular?" — o convite tem que estar à vista')
  // ===========================================================================
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'networkidle' })

    // O convite automático aparece uma vez; fecha para provar o que sobra.
    const folha = page.locator('.install__sheet')
    await folha.waitFor({ timeout: 8000 })
    await page.locator('.install .btn--quiet').click()

    const barra = page.locator('.install-bar')
    ok('depois de dispensado, sobra a barra fixa de instalação', await barra.isVisible())

    const textoBarra = await barra.innerText()
    ok(
      'a barra explica que ela está no navegador',
      /safari|browser/i.test(textoBarra),
      textoBarra.replace(/\n/g, ' / '),
    )

    await barra.locator('button').click()
    await folha.waitFor({ timeout: 5000 })
    ok('a barra reabre o passo a passo', await folha.isVisible())

    const passos = await page.locator('.install__steps li').count()
    ok('o passo a passo do iPhone tem os três passos', passos === 3, `${passos} passos`)

    await ctx.close()
  }

  // ===========================================================================
  secao('4. Já instalado: o convite some e o app não insiste')
  // ===========================================================================
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' })
    await ctx.addInitScript(() => {
      const real = window.matchMedia.bind(window)
      window.matchMedia = (q) =>
        q.includes('display-mode: standalone') ? { matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } : real(q)
    })
    const page = await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)

    ok('a barra de instalação não aparece', (await page.locator('.install-bar').count()) === 0)
    ok('o convite automático não aparece', (await page.locator('.install__sheet').count()) === 0)

    await ctx.close()
  }
} finally {
  await browser.close()
}

console.log(
  fails === 0
    ? '\nTudo certo: pausar, sair do app e voltar mantém o treino no lugar.\n'
    : `\n${fails} verificação(ões) falharam.\n`,
)
process.exit(fails === 0 ? 0 : 1)
