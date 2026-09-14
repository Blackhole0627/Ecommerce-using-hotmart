/**
 * Gera os ícones do PWA a partir do logo da cliente.
 *
 * A flor recortada (public/brand/logo-mark.png, ver scripts/extract-logo.mjs)
 * é centralizada sobre a areia da paleta dela. Sem texto: aos 48px reais de um
 * ícone na tela inicial, "The Squeeze Method" vira um borrão, e o nome já
 * aparece embaixo do ícone, escrito pelo próprio sistema.
 *
 * Dois recortes diferentes:
 *
 * - normal, quadrado e opaco de ponta a ponta. O iOS arredonda o ícone por
 *   conta própria; se o arquivo já vier com cantos arredondados e transparentes,
 *   o iPhone preenche o resto com preto.
 * - maskable, com a flor menor. O Android recorta a borda em formatos
 *   diferentes por fabricante, e só o círculo central dos 80% é garantido.
 *
 * Uso: npm run assets   (depois de npm run logo)
 */
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const iconsDir = resolve(here, '../public/icons')
const marca = resolve(here, '../public/brand/logo-mark.png')

/** A areia do logo dela. O ícone nasce do mesmo fundo em que ela desenhou. */
const AREIA = '#EEE2D6'

const targets = [
  { file: 'icon-192.png', size: 192, ocupacao: 0.74 },
  { file: 'icon-512.png', size: 512, ocupacao: 0.74 },
  { file: 'maskable-512.png', size: 512, ocupacao: 0.56 },
  { file: 'apple-touch-icon.png', size: 180, ocupacao: 0.74 },
]

await mkdir(iconsDir, { recursive: true })

for (const { file, size, ocupacao } of targets) {
  // A flor é mais alta que larga; a ocupação vale para a altura, que é o que
  // define se ela cabe no círculo seguro do Android.
  const altura = Math.round(size * ocupacao)
  const flor = await sharp(marca).resize({ height: altura }).toBuffer()
  const { width: larguraFlor } = await sharp(flor).metadata()

  await sharp({
    create: { width: size, height: size, channels: 4, background: AREIA },
  })
    .composite([
      {
        input: flor,
        left: Math.round((size - larguraFlor) / 2),
        // Sobe 2% do lado: a flor tem o peso embaixo, nas folhas, e centralizada
        // pela caixa ela parece estar caindo dentro do ícone.
        top: Math.round((size - altura) / 2 - size * 0.02),
      },
    ])
    // Opaco de ponta a ponta: qualquer transparência que sobrasse das bordas
    // suaves da flor viraria preto no iPhone, que não compõe o ícone da tela
    // inicial sobre nada.
    .flatten({ background: AREIA })
    .png({ compressionLevel: 9 })
    .toFile(resolve(iconsDir, file))

  console.log(`  ${file}  ${size}x${size}`)
}

console.log('\nÍcones gerados em public/icons, a partir do logo da cliente.')
