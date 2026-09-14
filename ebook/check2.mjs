import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
const S = dirname(fileURLToPath(import.meta.url))
const b=await chromium.launch(); const p=await b.newPage()
await p.emulateMedia({media:'print'})
await p.goto('file:///'+S+'/ebook2.html',{waitUntil:'networkidle'})
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500)
const rep=await p.evaluate(()=>{
  const out=[]
  document.querySelectorAll('.page').forEach((pg,i)=>{
    const cs=getComputedStyle(pg), padB=parseFloat(cs.paddingBottom)
    const r=pg.getBoundingClientRect(), usable=r.top+pg.clientHeight-padB
    let maxB=r.top, worst=''
    const walk=el=>{for(const ch of el.children){const s=getComputedStyle(ch); if(s.position==='absolute')continue; const cr=ch.getBoundingClientRect(); if(cr.bottom>maxB){maxB=cr.bottom;worst=ch.className||ch.tagName}}}
    walk(pg)
    out.push({i, over:+(maxB-usable).toFixed(1), worst})
  })
  return out
})
const bad=rep.filter(r=>r.over>2)
console.log('pages',rep.length,'| overflowing',bad.length)
bad.slice(0,40).forEach(r=>console.log(`  page idx${r.i} over ${r.over}px (${r.worst})`))
await p.pdf({path:S+'/ebook2.pdf', width:'6in', height:'9in', printBackground:true, preferCSSPageSize:true})
await b.close(); console.log('ebook2.pdf written')
