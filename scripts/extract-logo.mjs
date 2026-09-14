/**
 * Recorta o logo da cliente do arquivo original, com fundo transparente.
 *
 * O que ela mandou é uma prévia em WebP de 1024px: a marca e o texto, chapados
 * em duas cores, sobre o creme da paleta. Para usar dentro do app o creme
 * precisa virar transparência — e um corte por limiar deixaria a borda serrilhada
 * num desenho que é quase todo curva.
 *
 * Então a transparência é calculada, não recortada. Cada pixel da prévia é uma
 * mistura entre o creme do fundo e uma das duas cores chapadas:
 *
 *     p = α·C + (1 − α)·F
 *
 * Conhecendo F (o creme) e as duas candidatas a C (o coral e o verde), dá para
 * resolver α por projeção e ficar com a cor original mais o canal alfa exato.
 * A borda sai suave, do jeito que ela desenhou.
 *
 * Gera dois arquivos em public/brand:
 *   logo-mark.png     — só a flor, para o ícone do app e o cabeçalho
 *   logo-lockup.png   — a flor com o nome, para a tela inicial
 *
 * Uso: npm run logo
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const origem = resolve(here, '../brand/previewlogoapp.webp')
const destino = resolve(here, '../public/brand')

/** As duas cores chapadas do logo, amostradas no arquivo dela. */
const CORES = [
  [239, 107, 88], // coral — pétalas e o nome
  [43, 147, 139], // verde — folhas e a linha de baixo
]

const { data, info } = await sharp(origem).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info

/**
 * O creme do fundo vem do próprio arquivo — mas da cor MAIS FREQUENTE, não do
 * pixel do canto. A prévia tem uma vinheta de fundo, e o canto está onze tons
 * mais claro que o creme de verdade; usá-lo como referência empurrava um fiapo
 * de alfa por cima da imagem inteira e o recorte saía do tamanho da tela.
 */
const contagem = new Map()
for (let i = 0; i < data.length; i += channels) {
  const chave = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
  contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
}
let dominante = 0
let maior = -1
for (const [chave, n] of contagem) {
  if (n > maior) {
    maior = n
    dominante = chave
  }
}
const FUNDO = [(dominante >> 16) & 255, (dominante >> 8) & 255, dominante & 255]
console.log(`  fundo detectado: rgb(${FUNDO.join(', ')})`)

/**
 * Projeta o pixel sobre a reta fundo→cor e devolve quanto dele é cor.
 * O resíduo diz o quanto a projeção mentiu, e é o que escolhe entre as duas.
 */
const projetar = (p, cor) => {
  let num = 0
  let den = 0
  for (let k = 0; k < 3; k++) {
    const eixo = cor[k] - FUNDO[k]
    num += (p[k] - FUNDO[k]) * eixo
    den += eixo * eixo
  }
  const alfa = Math.max(0, Math.min(1, num / den))
  let residuo = 0
  for (let k = 0; k < 3; k++) {
    const esperado = FUNDO[k] + alfa * (cor[k] - FUNDO[k])
    residuo += (p[k] - esperado) ** 2
  }
  return { alfa, residuo }
}

const saida = Buffer.alloc(width * height * 4)
const p = [0, 0, 0]

for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
  p[0] = data[i]
  p[1] = data[i + 1]
  p[2] = data[i + 2]

  let melhor = null
  let melhorCor = CORES[0]
  for (const cor of CORES) {
    const r = projetar(p, cor)
    if (!melhor || r.residuo < melhor.residuo) {
      melhor = r
      melhorCor = cor
    }
  }

  // Abaixo de ~6% o pixel é a vinheta do fundo com ruído de compressão, e
  // não desenho: o coral e o verde estão a ~170 unidades do creme, então 6%
  // ainda é menos de dez tons de distância.
  const alfa = melhor.alfa < 0.06 ? 0 : melhor.alfa
  saida[j] = melhorCor[0]
  saida[j + 1] = melhorCor[1]
  saida[j + 2] = melhorCor[2]
  saida[j + 3] = Math.round(alfa * 255)
}

const rgba = { raw: { width, height, channels: 4 } }

/** Menor retângulo que contém desenho, dentro de uma faixa de linhas. */
const recortar = (deY, ateY) => {
  let x0 = width
  let x1 = -1
  let y0 = height
  let y1 = -1
  for (let y = deY; y < ateY; y++) {
    for (let x = 0; x < width; x++) {
      if (saida[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

await mkdir(destino, { recursive: true })

// A flor termina antes do texto; 620 é o vale em branco entre os dois.
const marca = recortar(0, 620)
const lockup = recortar(0, height)

for (const [arquivo, caixa] of [
  ['logo-mark.png', marca],
  ['logo-lockup.png', lockup],
]) {
  await sharp(saida, rgba)
    .extract(caixa)
    .png({ compressionLevel: 9 })
    .toFile(resolve(destino, arquivo))
  console.log(`  ${arquivo}  ${caixa.width}x${caixa.height}`)
}

console.log('\nLogo recortado em public/brand.')
