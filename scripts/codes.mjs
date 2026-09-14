/**
 * Administracao dos codigos de acesso, pela linha de comando.
 *
 * E aqui que se bloqueia alguem depois de um reembolso. Deliberadamente nao ha
 * pagina de administracao: seria outra tela para manter e mais uma superficie
 * exposta, e quem opera isto e o desenvolvedor, nao a cliente.
 *
 *   node scripts/codes.mjs health
 *   node scripts/codes.mjs new 100 --note "lote 1 - hotmart"
 *   node scripts/codes.mjs list
 *   node scripts/codes.mjs get     SQZ-ABCDE-FGHIJ
 *   node scripts/codes.mjs revoke  SQZ-ABCDE-FGHIJ --note "reembolso 03/09"
 *   node scripts/codes.mjs restore SQZ-ABCDE-FGHIJ
 *   node scripts/codes.mjs release SQZ-ABCDE-FGHIJ    (trocou de celular)
 *   node scripts/codes.mjs forget  SQZ-ABCDE-FGHIJ
 *
 * Endereco e token vem de LICENSE_API e LICENSE_ADMIN_TOKEN, ou de
 * .keys/LICENSE_ADMIN_TOKEN.txt.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API = (process.env.LICENSE_API ?? 'https://femivita.online').replace(/\/+$/, '')

const token = () => {
  if (process.env.LICENSE_ADMIN_TOKEN) return process.env.LICENSE_ADMIN_TOKEN.trim()
  const arquivo = resolve(raiz, '.keys/LICENSE_ADMIN_TOKEN.txt')
  if (existsSync(arquivo)) return readFileSync(arquivo, 'utf8').trim()
  return ''
}

const [, , acao, ...resto] = process.argv

// --note "texto" pode aparecer em qualquer posicao; o resto sao argumentos.
let note = ''
const args = []
for (let i = 0; i < resto.length; i++) {
  if (resto[i] === '--note') note = resto[++i] ?? ''
  else args.push(resto[i])
}

async function call(body) {
  const r = await fetch(`${API}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(body.action === 'health' ? {} : { Authorization: `Bearer ${token()}` }),
    },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error(`erro ${r.status}: ${data.error ?? 'sem detalhe'}`)
    if (data.error === 'unauthorized') {
      console.error('  confira LICENSE_ADMIN_TOKEN (ou .keys/LICENSE_ADMIN_TOKEN.txt)')
    }
    if (data.error === 'store_unavailable') {
      console.error('  o banco de codigos nao esta ligado — ver KV_REST_API_URL na Vercel')
    }
    process.exit(1)
  }
  return data
}

const linha = (c) =>
  [
    c.code.padEnd(17),
    c.status.padEnd(8),
    `${c.devices} aparelho(s)`.padEnd(16),
    c.note ?? '',
  ].join(' ')

switch (acao) {
  case 'health': {
    const h = await call({ action: 'health' })
    console.log(`servidor      ${API}`)
    console.log(`banco         ${h.store ? 'ok' : 'FALTANDO (KV_REST_API_URL / TOKEN)'}`)
    console.log(`chave privada ${h.signingKey ? 'ok' : 'FALTANDO (LICENSE_PRIVATE_KEY)'}`)
    console.log(`token admin   ${h.adminToken ? 'ok' : 'FALTANDO (LICENSE_ADMIN_TOKEN)'}`)
    console.log(`validade      ${h.licenceDays} dias`)
    console.log(`aparelhos     ${h.maxDevices} por codigo`)
    if (!h.ok) {
      console.log('\nEnquanto isso, NINGUEM consegue liberar o app. Configure antes de vender.')
      process.exit(1)
    }
    break
  }

  case 'new': {
    const quantidade = Number(args[0] ?? 0)
    if (!quantidade) {
      console.error('uso: node scripts/codes.mjs new <quantidade> [--note "texto"]')
      process.exit(1)
    }
    const { codes } = await call({ action: 'new', quantity: quantidade, note })
    // Arquivo pronto para subir na plataforma de venda. Guardar sempre: e a
    // unica copia fora do banco, e a plataforma so aceita a lista uma vez.
    mkdirSync(resolve(raiz, '.keys'), { recursive: true })
    const saida = resolve(raiz, `.keys/codigos-${new Date().toISOString().slice(0, 10)}.csv`)
    writeFileSync(saida, codes.join('\n') + '\n')
    console.log(codes.join('\n'))
    console.log(`\n${codes.length} codigo(s). Lista salva em ${saida}`)
    break
  }

  case 'add': {
    if (!args.length) {
      console.error('uso: node scripts/codes.mjs add SQZ-... [SQZ-... ...]')
      process.exit(1)
    }
    const r = await call({ action: 'add', codes: args, note })
    console.log(`cadastrados: ${r.added.length}`)
    if (r.rejected.length) console.log(`recusados:   ${r.rejected.join(', ')}`)
    break
  }

  case 'list': {
    const r = await call({ action: 'list' })
    for (const c of r.codes) console.log(linha(c))
    const ativos = r.codes.filter((c) => c.status === 'active').length
    const bloqueados = r.codes.filter((c) => c.status === 'revoked').length
    console.log(`\n${r.total} codigo(s): ${ativos} em uso, ${bloqueados} bloqueado(s)`)
    break
  }

  case 'get':
  case 'revoke':
  case 'restore':
  case 'release':
  case 'forget': {
    if (!args[0]) {
      console.error(`uso: node scripts/codes.mjs ${acao} SQZ-ABCDE-FGHIJ`)
      process.exit(1)
    }
    const r = await call({ action: acao, code: args[0], note })
    if (acao === 'forget') console.log(`${r.code} apagado`)
    else console.log(linha(r))
    if (acao === 'revoke') {
      console.log('\nO app fecha no proximo acesso a internet, e em no maximo 7 dias offline.')
    }
    break
  }

  default:
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?|^ \* ?/gm, ''))
    process.exit(acao ? 1 : 0)
}
