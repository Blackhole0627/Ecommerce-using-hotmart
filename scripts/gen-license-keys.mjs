/**
 * Gera o par de chaves das licencas (ECDSA P-256, algoritmo ES256).
 *
 * Roda UMA vez, na configuracao. A chave publica e commitada em
 * src/lib/license-key.ts — ela e publica de proposito, e o app precisa dela
 * para conferir a assinatura sem internet. A chave privada NUNCA entra no git:
 * ela vive so na variavel de ambiente LICENSE_PRIVATE_KEY, na Vercel.
 *
 * Trocar a chave invalida todas as licencas ja emitidas: todo mundo que comprou
 * seria bloqueado. So gere de novo se a privada vazar.
 *
 *   node scripts/gen-license-keys.mjs [pasta-de-saida]
 */
import { webcrypto as crypto } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const saida = process.argv[2] ? resolve(process.argv[2]) : resolve(raiz, '.keys')

const b64 = (buf) => Buffer.from(buf).toString('base64')

const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
])

const privada = b64(await crypto.subtle.exportKey('pkcs8', par.privateKey))
const publica = await crypto.subtle.exportKey('jwk', par.publicKey)

// A JWK publica so precisa destes campos para verificar. O resto do que o
// WebCrypto exporta (key_ops, ext) atrapalha o importKey de alguns navegadores.
const jwk = { kty: publica.kty, crv: publica.crv, x: publica.x, y: publica.y }

const arquivo = `/**
 * Chave PUBLICA das licencas (ES256). Gerado por scripts/gen-license-keys.mjs.
 *
 * Isto aqui e publico de proposito e pode ser lido por qualquer pessoa que abra
 * o app: com ela da para CONFERIR uma licenca, nunca para EMITIR uma. Emitir
 * exige a chave privada, que fica so na Vercel.
 *
 * Nao edite a mao.
 */
export const LICENSE_PUBLIC_JWK: JsonWebKey = ${JSON.stringify(jwk, null, 2)
  .split('\n')
  .join('\n')}
`

writeFileSync(resolve(raiz, 'src/lib/license-key.ts'), arquivo)

mkdirSync(saida, { recursive: true })
writeFileSync(resolve(saida, 'LICENSE_PRIVATE_KEY.txt'), privada + '\n')

// Um token de administracao junto, para nao precisar inventar um depois.
const admin = b64(crypto.getRandomValues(new Uint8Array(24))).replace(/[+/=]/g, '')
writeFileSync(resolve(saida, 'LICENSE_ADMIN_TOKEN.txt'), admin + '\n')

console.log('chave publica gravada em  src/lib/license-key.ts  (commitar)')
console.log('chave privada gravada em  ' + resolve(saida, 'LICENSE_PRIVATE_KEY.txt') + '  (NAO commitar)')
console.log('')
console.log('Na Vercel, em Settings > Environment Variables:')
console.log('')
console.log('  LICENSE_PRIVATE_KEY = ' + privada)
console.log('')
console.log('  LICENSE_ADMIN_TOKEN = ' + admin)
console.log('')
