import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const S = dirname(fileURLToPath(import.meta.url))
const blocks = JSON.parse(readFileSync(S + '/blocks.json', 'utf8'))
const logo = readFileSync(S + '/logo_uri.txt', 'utf8').trim()
const anat = 'data:image/png;base64,' + readFileSync(S + '/anat_final.png').toString('base64')

// the closing legal note is rendered on the final page, not flowed (it was
// stranding alone on a near-empty page)
let closingLegal = ''
{
  const li = blocks.findIndex(b => b.type === 'note' && typeof b.text === 'string'
                                   && b.text.startsWith('This guide is for educational'))
  if (li >= 0){ closingLegal = blocks[li].text; blocks.splice(li, 1) }
}
/*
 * A folha de estilo base, e so ela.
 *
 * Antes isto lia o sample.html inteiro — 280 KB extraidos do ebook da Catia — e
 * recortava o <style> de dentro. Guardar aquele arquivo junto do projeto seria
 * guardar o livro dela inteiro; o que a construcao precisa sao 5 KB de CSS.
 * Extraido uma vez para estilo-base.css, conferido que nao carrega texto nenhum
 * do livro.
 */
let STYLE = readFileSync(S + '/estilo-base.css', 'utf8')
STYLE += `
  /* --- additions for the full book --- */
  .chap{position:relative; z-index:2; margin-top:0.34in; margin-bottom:0.06in;}
  /* larger type: her readers are older women who may have trouble seeing */
  p{font-size:12.4pt; line-height:1.66;}
  .front p{font-size:12.2pt; line-height:1.66;}
  ul.marca li{font-size:12pt; line-height:1.58;}
  .sub{font-size:17pt;}
  .brush p{font-size:17.5pt; line-height:1.3;}
  .note p{font-size:11pt; line-height:1.6;}
  .recap li{font-size:11.4pt; line-height:1.54;}
  .recap__t{font-size:8pt;}
  .toc li{font-size:11.4pt;}
  .toc .t{font-weight:500;}
  .fig .cap{font-size:9.4pt;}
  .cta__txt{font-size:11.6pt; line-height:1.6;}
  .cta__legal{font-size:9pt;}
  .steps{position:relative; z-index:2; margin:0.18in 0 0; padding:0; list-style:none; counter-reset:st; text-align:left;}
  .steps li{position:relative; counter-increment:st; padding:0 0 0.15in 0.48in;
            font-family:var(--serif); font-size:12.4pt; line-height:1.56; color:var(--maroon);}
  .steps li::before{content:counter(st); position:absolute; left:0; top:0.01in; width:0.31in; height:0.31in;
            display:grid; place-items:center; border-radius:50%; background:var(--coral); color:#fff;
            font-family:var(--sans); font-size:9pt; font-weight:700;}
  .chap--top{margin-top:0 !important;}
  .chap__div{width:0.7in; height:0; border-top:1px solid var(--coral); opacity:.4; margin:0 auto 0.16in;}
  .recap{position:relative; z-index:2; margin:0.24in 0 0.08in; padding:0.17in 0.2in 0.15in;
         background:#fff8f6; border:1px solid #f3cfc8; border-radius:0.1in; box-shadow:0 2px 8px rgba(109,42,41,.06);}
  .recap__t{display:block; margin-bottom:0.09in; font-family:var(--sans); font-size:7.4pt; font-weight:700;
            letter-spacing:0.2em; text-transform:uppercase; color:var(--coral-deep);}
  .recap ul{margin:0; padding:0; list-style:none;}
  .recap li{position:relative; padding:0 0 0.07in 0.26in; font-family:var(--serif); font-size:10.2pt;
            line-height:1.5; color:var(--maroon);}
  .recap li:last-child{padding-bottom:0;}
  .recap li::before{content:"\\2665"; position:absolute; left:0.02in; top:0.015in; color:var(--coral); font-size:8pt;}
  .note{position:relative; z-index:2; margin:0.2in 0; padding:0.15in 0.17in; background:#fff6f4;
        border:1px solid #f1c3bd; border-left:3px solid var(--coral); border-radius:0.08in;}
  .note p{margin:0; font-size:10pt; line-height:1.55; color:var(--maroon-soft); font-family:var(--serif);}
  .toc__title{position:relative; z-index:2; font-family:var(--display); font-weight:600; font-size:28pt; color:var(--maroon); text-align:center; margin:0.1in 0 0.05in;}
  .toc{position:relative; z-index:2; list-style:none; margin:0.16in 0 0; padding:0;}
  .toc li{display:flex; align-items:baseline; gap:0.1in; padding:0.075in 0; border-bottom:1px solid rgba(200,120,120,.28); font-size:10.6pt;}
  .toc .n{flex:0 0 auto; width:0.5in; font-family:var(--display); font-size:13pt; color:var(--coral); font-weight:600;}
  .toc .t{flex:1; color:var(--maroon); font-family:var(--serif);}
  .toc .pg{color:var(--maroon-soft); font-size:9pt; font-variant-numeric:tabular-nums;}
  .page--cta{display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;}
  .cta__flor{width:2in; margin-bottom:0.2in;}
  .cta__legal{max-width:3.7in; margin:0.34in 0 0; font-family:var(--serif); font-size:8.4pt;
              line-height:1.5; color:var(--maroon-soft);}
  .cta__title{font-family:var(--display); font-weight:600; font-size:26pt; color:var(--maroon); margin:0 0 0.1in; line-height:1.08;}
  .cta__txt{font-family:var(--serif); font-size:10.6pt; line-height:1.62; color:var(--maroon-soft); max-width:3.6in; margin:0 0 0.22in;}
  .cta__link{padding:0.12in 0.3in; border-radius:999px; background:var(--coral); color:#fff; font-family:var(--sans); font-size:10pt; font-weight:700; letter-spacing:.03em;}
`

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const RUN = '<div class="run"><span class="run__line"></span><span class="run__txt" translate="no">THE SQUEEZE METHOD</span><span class="run__line"></span></div>'
function badge(n){ return '<svg class="badge" viewBox="0 0 60 46" aria-hidden="true"><rect x="6" y="6" width="48" height="34" rx="7" fill="#e8556a" filter="url(#brush)"/>'
  + `<text x="30" y="29" text-anchor="middle" font-family="Montserrat,sans-serif" font-size="15" font-weight="700" fill="#fff">${n}</text></svg>` }
function foot(n){ return `<div class="foot"><span class="foot__name" translate="no">FEMIVITA</span><span class="foot__rule"></span>${badge(n)}</div>` }
const brushBG = h => `<svg class="bg" preserveAspectRatio="none" viewBox="0 0 600 ${h}"><rect x="8" y="10" width="584" height="${h-20}" rx="12" fill="#e8556a" filter="url(#brushbig)"/></svg>`

function bhtml(b, atTop){
  switch(b.type){
    case 'opener': return `<div class="chap${atTop?' chap--top':''}">${atTop?'':'<div class="chap__div"></div>'}${b.eyebrow?`<div class="eyebrow">${esc(b.eyebrow)}</div>`:''}<div class="heart">&#9829;</div><h2 class="title">${esc(b.title)}</h2><hr class="rule-orn"></div>`
    case 'lead': return `<p class="lead">${esc(b.text)}</p>`
    case 'p': return `<p>${esc(b.text)}</p>`
    case 'sub': return `<h3 class="sub">${esc(b.text)}</h3>`
    case 'ul': return `<ul class="marca">${b.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`
    case 'brush': return `<div class="brush">${brushBG(200)}<p>${esc(b.text)}</p></div>`
    case 'note': return `<div class="note"><p>${esc(b.text)}</p></div>`
    case 'recap': return `<div class="recap"><span class="recap__t">In short</span><ul>${b.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`
    case 'fig': return `<div class="fig"><img src="${anat}" alt="Female pelvic anatomy, labelled"><span class="cap">${esc(b.cap)}</span></div>`
  }
  return ''
}

// ---- measure ----
const SVGDEFS = '<svg width="0" height="0" style="position:absolute"><defs>'
  + '<filter id="brush"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>'
  + '<filter id="brushbig"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="3" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="17"/></filter></defs></svg>'

const CONTENT_W = 449            // 6in - 2*0.66in
const b = await chromium.launch()
const page = await b.newPage()
await page.emulateMedia({ media: 'print' })
const flowHTML = RUN + blocks.map(bhtml).join('') + '<div id="__end"></div>'
await page.setContent(`<!doctype html><html><head><meta charset="utf-8">`
  + `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Montserrat:wght@500;600;700&display=swap">`
  + `<style>${STYLE}</style></head><body>${SVGDEFS}`
  + `<div style="width:${CONTENT_W}px; padding:0; position:relative">${flowHTML}</div></body></html>`,
  { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)

const meas = await page.evaluate(() => {
  const flow = document.querySelector('div[style*="width"]')
  const kids = [...flow.children]           // [run, ...blocks, #__end]
  const tops = kids.map(k => k.offsetTop)
  const headerH = tops[1] - tops[0]
  const heights = []
  for (let i = 1; i < kids.length - 1; i++) heights.push(tops[i+1] - tops[i])
  return { headerH, heights }
})

// ---- pack ----
const CONTENT_H = 727.7          // 9in - 0.7in - 0.72in  (padding top/bottom)
const FOOTER_SAFE = 16   // badge only intrudes ~6px above the padding edge
const AVAIL = CONTENT_H - meas.headerH - FOOTER_SAFE
const H = meas.heights

const pages = []; let cur = []; let curH = 0
const flush = () => { if (cur.length){ pages.push(cur); cur = []; curH = 0 } }
for (let i = 0; i < blocks.length; i++){
  const bl = blocks[i], h = H[i]
  if (bl.type === 'opener'){                                    // chapters flow on (no forced page break)
    const leadH = (i + 1 < blocks.length && blocks[i + 1].type === 'lead') ? H[i + 1] : 0
    if (cur.length && (curH + h + Math.min(leadH, 150) > AVAIL)) flush()   // keep the title with its opening text
    cur.push(i); curH += h; continue
  }
  if (bl.type === 'sub'){                                       // keep heading with the start of its text
    const nextH = (i + 1 < blocks.length) ? H[i + 1] : 0
    if (curH + h + Math.min(nextH, 150) > AVAIL - 16) flush()
  }
  if (curH + h > AVAIL && cur.length) flush()
  cur.push(i); curH += h
}
flush()

// post-pass: never end a page on a bare heading — push it to the next page
for (let i = 0; i < pages.length - 1; i++){
  const pg = pages[i]
  const lastIdx = pg[pg.length - 1]
  if (blocks[lastIdx].type === 'sub' || blocks[lastIdx].type === 'opener'){ pg.pop(); pages[i + 1].unshift(lastIdx) }
}

// ---- assemble ----
const BODY_START = 4

function buildTOC(pages){
  const openerPage = {}
  pages.forEach((pg, pi) => { pg.forEach(bi => { if (blocks[bi].type === 'opener') openerPage[bi] = BODY_START + pi }) })
  return blocks.map((bl, i) => ({ bl, i })).filter(x => x.bl.type === 'opener')
    .map(x => ({ label: (x.bl.eyebrow || '').startsWith('Chapter') ? x.bl.eyebrow.replace('Chapter ', '') : '',
                 title: x.bl.title, pg: openerPage[x.i] }))
}

function assemble(pages){
  const tocItems = buildTOC(pages)
  let out = `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>The Squeeze Method — ebook</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Montserrat:wght@500;600;700&display=swap">
<style>${STYLE}</style></head><body>${SVGDEFS}\n`

  out += `<div class="page cover">
  <img class="cover__logo" src="${logo}" alt="Femivita">
  <h1 class="cover__title" translate="no">The Squeeze<br>Method</h1>
  <p class="cover__sub">A Woman&rsquo;s Guide to Pelvic Floor<br>Strength, Confidence &amp; Pleasure</p>
  <div class="cover__orn"></div>
  <div class="cover__tag" translate="no">Pelvic Power &amp; Wellness</div>
</div>\n`

  out += `<div class="page">${RUN}
  <div class="eyebrow">Before You Begin</div><div class="heart">&#9829;</div>
  <h2 class="title">A Note on<br>How to Use This</h2><hr class="rule-orn">
  <p class="lead">This book is a guide to understanding your body. It is educational, and it is not medical advice &mdash; it does not diagnose, treat, or cure any condition.</p>
  <p>If you are under medical care, have had pelvic surgery, or feel pain during any of the exercises, talk to a healthcare professional before you begin. Pain is information; it is never something to push through.</p>
  <p>Read it in whatever order feels right, and come back to any chapter whenever a question comes up. When you are ready to practice, the app guides every session, counts for you, and keeps your place &mdash; the book explains, and the app is where you train.</p>
  ${foot(2)}
</div>\n`

  out += `<div class="page">${RUN}
  <h2 class="toc__title">Contents</h2>
  <ul class="toc">
  ${tocItems.map(t => `<li><span class="n">${t.label || '&#9829;'}</span><span class="t">${esc(t.title)}</span><span class="pg">${t.pg}</span></li>`).join('\n  ')}
  </ul>
  ${foot(3)}
</div>\n`

  pages.forEach((pg, pi) => {
    out += `<div class="page">${RUN}\n  ${pg.map((bi, j) => bhtml(blocks[bi], j === 0)).join('\n  ')}\n  ${foot(BODY_START + pi)}\n</div>\n`
  })

  const howNum = BODY_START + pages.length
  out += `<div class="page">${RUN}
  <div class="eyebrow">Before you close this book</div><div class="heart">&#9829;</div>
  <h2 class="title">How to Open<br>the App</h2><hr class="rule-orn">
  <p class="lead">The book explains. The app is where you train &mdash; it counts every squeeze and remembers where you stopped.</p>
  <ol class="steps">
    <li>On your phone, open <b translate="no">femivita.online</b> in your browser.</li>
    <li>Enter the e-mail address you used to buy. You do this once, on this phone.</li>
    <li>Tap the <b>Share</b> button, then choose <b>Add to Home Screen</b>.</li>
    <li>The app appears with its own icon. It works without internet and keeps your progress on this phone &mdash; no account, no password, just your e-mail once.</li>
  </ol>
  <div class="note"><p>Nothing to keep and nothing to lose: the same e-mail lets you back in if you ever reinstall the app.</p></div>
  ${foot(howNum)}
</div>
`

  out += `<div class="page page--cta">
  <img class="cta__flor" src="${logo}" alt="">
  <h2 class="cta__title">Now open<br>the app</h2>
  <p class="cta__txt">You do not need more time than you already have. A few quiet minutes, most days, in a place only you ever need to know about &mdash; that is the whole of it.</p>
  <p class="cta__txt">Big changes start with small decisions. Do something for yourself today.</p>
  <span class="cta__link" translate="no">femivita.online</span>
  ${closingLegal ? `<p class="cta__legal">${esc(closingLegal)}</p>` : ''}
  ${foot(howNum + 1)}
</div>\n`

  out += `<script>(function(){var W=576;function f(){var v=document.documentElement.clientWidth||innerWidth;var s=Math.min(1,(v-24)/W);document.documentElement.style.setProperty('--pagezoom',s>0?s:1);}f();addEventListener('resize',f);addEventListener('orientationchange',f);})();</script>\n</body></html>`
  return out
}

// ---- verify against real layout and repair any overflow ----
let html = assemble(pages)
for (let iter = 0; iter < 8; iter++){
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  const over = await page.evaluate(() => {
    const out = []
    document.querySelectorAll('.page').forEach((pg, i) => {
      const cs = getComputedStyle(pg), padB = parseFloat(cs.paddingBottom)
      const r = pg.getBoundingClientRect(), usable = r.top + pg.clientHeight - padB
      let maxB = r.top
      for (const ch of pg.children){
        if (getComputedStyle(ch).position === 'absolute') continue
        const cr = ch.getBoundingClientRect(); if (cr.bottom > maxB) maxB = cr.bottom
      }
      out.push({ i, over: +(maxB - usable).toFixed(1) })
    })
    return out
  })
  const bad = over.filter(o => o.over > 1 && o.i >= 3 && o.i < 3 + pages.length)
  if (!bad.length){ console.log('repair pass', iter, '— no overflow'); break }
  for (const o of bad){
    const bi = o.i - 3
    if (pages[bi].length < 2) continue
    const moved = pages[bi].pop()
    if (bi + 1 < pages.length) pages[bi + 1].unshift(moved)
    else pages.push([moved])
  }
  console.log('repair pass', iter, '— moved', bad.length, 'block(s)')
  html = assemble(pages)
}

await b.close()
writeFileSync(S + '/ebook2.html', html)
console.log('headerH', meas.headerH.toFixed(1), 'AVAIL', AVAIL.toFixed(1))
console.log('body pages', pages.length, '| total', 3 + pages.length + 2)
