/**
 * Gera o Manual de Instrucoes que a Hotmart exige junto do produto.
 *
 * Exigencias deles, atendidas aqui: capa com o nome da autora e um titulo que
 * combine com o nome do produto, e o processo de entrega inteiro explicado
 * dentro do documento.
 *
 * Usa a mesma folha de estilo e o mesmo formato 6x9in do ebook, de proposito:
 * chega junto com o livro, entao tem de parecer a mesma coisa, e nao um anexo
 * administrativo de outra fonte.
 *
 * Em ingles, como o ebook: quem le e a compradora americana.
 *
 *   node ebook/manual.mjs
 *   python ebook/otimiza.py ebook/manual.pdf the-squeeze-method-manual.pdf
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const S = dirname(fileURLToPath(import.meta.url))
const logo = readFileSync(S + '/logo_uri.txt', 'utf8').trim()
/* Só a flor na capa: o logo completo já traz o nome escrito, e ao lado do
   título ele apareceria duas vezes. */
const marca = readFileSync(S + '/logo_mark_uri.txt', 'utf8').trim()
const STYLE = readFileSync(S + '/estilo-base.css', 'utf8')

/** O endereco do app, num lugar so: se um dia mudar, muda aqui. */
const APP_URL = 'femivita.online'
const AUTORA = 'Vivian Maruya'

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>The Squeeze Method — Instruction Manual</title>
<style>
${STYLE}

/* --- ajustes proprios do manual --- */
.capa{display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;}
.capa__logo{width:1.5in; margin-bottom:0.34in;}
.capa__tipo{font-size:10.5pt; letter-spacing:0.22em; text-transform:uppercase; color:#b08b86; margin-bottom:0.1in;}
.capa__titulo{font-family:Georgia,'Times New Roman',serif; font-size:30pt; line-height:1.12; margin:0 0 0.12in;}
.capa__sub{font-size:12.5pt; color:#8a6f6a; margin-bottom:0.5in;}
.capa__autora{font-size:10pt; color:#a08a86; letter-spacing:0.04em;}

h2.sub{margin-top:0;}
ol.steps{margin:0.18in 0 0; padding:0; list-style:none; counter-reset:passo;}
ol.steps li{counter-increment:passo; position:relative; padding-left:0.42in; margin-bottom:0.17in;
  font-size:12.4pt; line-height:1.62;}
ol.steps li::before{content:counter(passo); position:absolute; left:0; top:0.01in;
  width:0.27in; height:0.27in; border-radius:50%; background:#c25b4e; color:#fff;
  font-family:Georgia,serif; font-size:11pt; display:grid; place-items:center;}
.note{margin-top:0.24in; padding:0.16in 0.2in; border:1px solid #edcfca; border-radius:0.06in;}
.note p{font-size:11pt; line-height:1.6; margin:0;}
.dl{margin:0.16in 0 0; padding:0;}
.dl dt{font-size:11pt; font-weight:700; margin-top:0.14in;}
.dl dd{margin:0.03in 0 0; font-size:11.6pt; line-height:1.6;}
</style></head><body>

<div class="page capa">
  <img class="capa__logo" src="${marca}" alt="">
  <div class="capa__tipo">Instruction Manual</div>
  <h1 class="capa__titulo">The Squeeze Method</h1>
  <div class="capa__sub">Pelvic Power &amp; Wellness</div>
  <div class="capa__autora">${AUTORA}</div>
</div>

<div class="page">
  <h2 class="sub">What you receive</h2>
  <p>Your purchase includes two things, and they work together.</p>
  <dl class="dl">
    <dt>The book</dt>
    <dd>A 49-page guide explaining how the pelvic floor works, what the exercises
    do, and why the programme is built the way it is. It arrives as a PDF you can
    read on any phone, tablet or computer, and it is yours to keep.</dd>
    <dt>The app</dt>
    <dd>Where you actually train. It counts every squeeze, sets the pace, times
    your rest, and remembers exactly where you stopped. It is not downloaded from
    an app store — you open it in your phone's browser and add it to your home
    screen, where it behaves like any other app.</dd>
    <dt>Your e-mail</dt>
    <dd>There is no code to keep track of. The app is unlocked with the same
    e-mail address you used to buy — nothing is sent to you, and there is
    nothing to lose.</dd>
  </dl>
  <div class="note"><p><b>Nothing to keep.</b> If you ever remove the app and
  install it again, the same e-mail address lets you straight back in.</p></div>
</div>

<div class="page">
  <h2 class="sub">How to open the app</h2>
  <p>Four steps, once, on the phone you plan to train with.</p>
  <ol class="steps">
    <li>On your phone, open <b>${APP_URL}</b> in your browser.</li>
    <li>Enter the e-mail address you used to buy.</li>
    <li>Tap the <b>Share</b> button, then choose <b>Add to Home Screen</b>.</li>
    <li>The app appears with its own icon. It works without internet and keeps
    your progress on this phone — no account, no password, just your e-mail once.</li>
  </ol>
  <div class="note"><p>On Android the step is the same, but the menu is called
  <b>Install app</b> or <b>Add to Home screen</b>, in the browser's menu.</p></div>
</div>

<div class="page">
  <h2 class="sub">Questions</h2>
  <dl class="dl">
    <dt>Do I need internet to train?</dt>
    <dd>No. After the first time you open it, the app works entirely offline.
    It connects briefly, about once a week, to confirm your access is active.</dd>
    <dt>Can I use it on more than one device?</dt>
    <dd>Yes, up to three — a phone and a tablet, for example. Your progress is
    kept separately on each one.</dd>
    <dt>What if I forget which e-mail I used?</dt>
    <dd>Look for the receipt from your purchase — the address it was sent to is
    the one that works. If you still cannot get in, reply to that e-mail and we
    will sort it out.</dd>
    <dt>Is this medical advice?</dt>
    <dd>No. Both the book and the app are training guides. If you have a health
    condition, are under medical follow-up, or feel pain during the exercises,
    speak to a healthcare professional first.</dd>
  </dl>
  <div class="note"><p>Anything else — reply to your purchase e-mail and we will
  help.</p></div>
</div>

</body></html>`

writeFileSync(S + '/manual.html', html)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.emulateMedia({ media: 'print' })
await page.goto('file:///' + S.replace(/\\/g, '/') + '/manual.html', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)

/* A mesma conferencia do livro: um bloco que passa da margem so aparece no PDF,
   e a essa altura ja foi entregue. */
const over = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('.page').forEach((pg, i) => {
    const cs = getComputedStyle(pg)
    const r = pg.getBoundingClientRect()
    const limite = r.top + pg.clientHeight - parseFloat(cs.paddingBottom)
    let pior = r.top
    pg.querySelectorAll('*').forEach((el) => {
      if (getComputedStyle(el).position === 'absolute') return
      pior = Math.max(pior, el.getBoundingClientRect().bottom)
    })
    if (pior > limite + 1) out.push({ pagina: i + 1, sobra: +(pior - limite).toFixed(1) })
  })
  return out
})

await page.pdf({ path: S + '/manual.pdf', width: '6in', height: '9in', printBackground: true })
await browser.close()

console.log('paginas: 4 | transbordo:', over.length ? JSON.stringify(over) : 'nenhum')
console.log('manual.pdf gerado')
