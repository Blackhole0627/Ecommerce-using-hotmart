# Controle de acesso — manual de operação

O app só abre para quem comprou, e o acesso pode ser cortado depois de um
reembolso. Este arquivo é o passo a passo de quem opera isso.

Quem só quer saber **como bloquear alguém agora**, vai direto para
[Reembolso](#reembolso-como-bloquear-alguém).

---

## Como funciona, em uma página

Cada compra recebe um **código** no formato `SQZ-ABCDE-FGHIJ`. Na primeira vez
que abre o app, a compradora digita (ou toca num link que já preenche) o código.
O servidor confere, registra o aparelho e devolve um **bilhete assinado com
validade de 7 dias**. O app guarda esse bilhete e passa a conferi-lo sozinho,
sem internet.

A decisão que sustenta tudo está no prazo. O caminho óbvio seria guardar um
"sim" e confiar nele para sempre, revalidando quando houvesse rede — só que aí
quem pede reembolso e fica offline de propósito fica com o app para sempre.
Aqui é o contrário: **ficar sem internet não preserva o acesso, é o que o faz
vencer**.

Na prática:

| Situação | O que acontece |
| --- | --- |
| Comprou, usa o app com internet de vez em quando | Renova sozinho, em segundo plano. Nunca vê nada disso. |
| Comprou, ficou uma semana inteira sem internet | Uma tela pedindo para conectar. Um toque e volta. O progresso fica intacto. |
| Pediu reembolso e abriu o app com internet | Fecha **na hora**. |
| Pediu reembolso e ficou offline de propósito | Fecha em **no máximo 7 dias**. |
| Pediu reembolso e reinstalou o app | Fecha **na hora** — não há bilhete para reaproveitar. |
| Atrasou o relógio do celular para esticar o prazo | O app percebe e exige conferência online. |

O prazo de 7 dias acompanha a garantia oferecida na venda. Dá para mudar na
variável `LICENSE_DAYS` sem tocar em código.

**O que isto não é.** Nenhuma proteção que roda no navegador da compradora é
inviolável — o programa está no aparelho dela, e quem tem conhecimento e
paciência consegue desmontar. O objetivo é que não valha o esforço, nunca que
seja impossível. Proteção absoluta exigiria servir o treino do servidor a cada
sessão, o que acabaria com o uso sem internet que o ebook anuncia.

---

## Ligar e desligar a porta

A porta é **ligada por padrão**. Para o app abrir para qualquer pessoa, como
antes, defina no projeto da Vercel:

```
VITE_REQUIRE_LICENSE=false
```

e publique de novo. Para religar, apague a variável (ou ponha `true`) e publique.

Isso existe para separar duas mudanças que não podem acontecer no mesmo dia:
**mudar o app de hospedagem** e **começar a exigir código**. São dois riscos
diferentes; juntos viram um site fora do ar sem ninguém saber qual dos dois
derrubou. Mudar a hospedagem com a porta desligada, conferir que tudo abre, e só
então ligar a porta.

É decidido na hora de compilar, não em tempo de execução: nenhuma resposta de
servidor, cabeçalho ou valor guardado no aparelho consegue ligar ou desligar
isto. E desligar exige escrever a variável à mão — nunca acontece por
esquecimento.

> Com a porta ligada e o banco **não** configurado, ninguém consegue liberar o
> app — nem quem já pagou. Confira o `health` antes de ligar.

## Configuração (uma vez só)

### 1. Banco de códigos

Na Vercel: **Storage → Create → KV** (ou um Redis da Upstash). Conectado ao
projeto, ele já injeta `KV_REST_API_URL` e `KV_REST_API_TOKEN`. O plano gratuito
sobra para o volume desta venda.

### 2. Chaves

```bash
npm run keys
```

Grava a chave **pública** em `src/lib/license-key.ts` (vai para o git — é pública
de propósito, com ela só dá para *conferir* uma licença, nunca para *emitir*) e a
**privada** em `.keys/`, que está no `.gitignore`.

Na Vercel, em Settings → Environment Variables, cadastre o que o comando
imprimiu:

| Variável | Para quê |
| --- | --- |
| `LICENSE_PRIVATE_KEY` | assina os bilhetes. **Nunca** no git. |
| `LICENSE_ADMIN_TOKEN` | protege `/api/admin`. |
| `LICENSE_DAYS` | validade do bilhete offline. Opcional, padrão 7. |
| `LICENSE_MAX_DEVICES` | aparelhos por código. Opcional, padrão 3. |

> Trocar a chave privada invalida **todas** as licenças já emitidas — todo mundo
> que comprou seria bloqueado. Só gere de novo se ela vazar.

### 3. Conferir

```bash
npm run codes health
```

Tem de dizer `ok` nas três linhas. **Enquanto não disser, ninguém consegue
liberar o app** — inclusive quem já pagou. Confira isto antes de qualquer venda.

---

## Vender

```bash
npm run codes new 100 --note "lote 1 - hotmart"
```

Imprime os códigos e salva a lista em `.keys/codigos-AAAA-MM-DD.csv`. **Guarde o
arquivo**: é a única cópia fora do banco.

Na Hotmart ou na Kiwify, o caminho é o mesmo — a plataforma tem um campo de
"lista de códigos" (ou "chaves de acesso") no produto; sobe o CSV e ela entrega
um código por venda, automaticamente. Nenhuma integração é necessária, e é por
isso que não há webhook aqui: um a menos para quebrar.

**Vale mandar o link com o código dentro:**

```
https://femivita.online/#c=SQZ-ABCDE-FGHIJ
```

O campo já vem preenchido e ela só toca no botão. Cada passo de digitação em
celular custa conversão, e ela vai rodar anúncio.

---

## Reembolso: como bloquear alguém

```bash
npm run codes revoke SQZ-ABCDE-FGHIJ --note "reembolso 03/09"
```

Pronto. O app fecha no próximo acesso à internet dela, e em no máximo 7 dias se
ela ficar offline.

Para desfazer (bloqueou o código errado, a compradora voltou atrás):

```bash
npm run codes restore SQZ-ABCDE-FGHIJ
```

---

## Suporte

| Ela diz | Comando |
| --- | --- |
| "meu código não funciona" | `npm run codes get SQZ-...` — mostra situação e nº de aparelhos |
| "troquei de celular e não abre" | `npm run codes release SQZ-...` — zera os aparelhos, o código continua valendo |
| "quero ver todos os códigos" | `npm run codes list` |
| "perdi meu código" | Está em Ajustes → Seu acesso, dentro do app dela |

O limite é de **3 aparelhos por código**. Existe porque sem ele um código
circularia entre cem pessoas, e o sistema só resolveria o reembolso, não o
compartilhamento. Três cobre celular, tablet e a troca de aparelho.

---

## Verificação

```bash
npm run build && npm run verify:license
```

Sobe um servidor próprio, executa as rotas reais de `api/` (com um Redis de
mentira no lugar do banco) e dirige o app de verdade no navegador. Confere,
entre outras coisas: o programa não aparece sem licença, um código revogado
fecha o app, uma licença vencida offline bloqueia, atrasar o relógio não estica
o prazo, um bilhete adulterado ou copiado para outro aparelho não abre, e
apagar o progresso não tranca a usuária para fora.

Precisa da chave privada em `.keys/` (ou em `LICENSE_PRIVATE_KEY`).

---

## Três armadilhas que já estão tratadas

Ficam registradas porque nenhuma delas dá erro visível — todas falham em
silêncio, parecendo funcionar.

1. **O service worker guardaria a resposta da licença em cache.** Um `200`
   guardado faria a revogação parar de funcionar sem ninguém perceber: por fora,
   tudo continuaria normal. `/api/` é `NetworkOnly` e está no
   `navigateFallbackDenylist` (`vite.config.ts`), com `no-store` também no
   `vercel.json`.
2. **"Recomeçar o programa" apagaria a licença.** O botão limpa a chave
   `kegel-pelvic:v2`; se a licença morasse lá, quem zerasse o próprio treino se
   trancaria para fora. Ela vive em `kegel-pelvic:lic`, separada.
3. **Um texto sem tradução quebraria o build, não a tela.** O dicionário em
   inglês define o formato e o português tem de encaixar nele, então uma frase
   nova precisa entrar em `en.ts` **e** `pt.ts`. É proposital.

---

## Onde está cada parte

| Arquivo | O que faz |
| --- | --- |
| `api/_lib.ts` | códigos, banco, assinatura ES256, emissão |
| `api/activate.ts` | troca o código por um bilhete assinado |
| `api/renew.ts` | renovação silenciosa; não registra aparelho novo |
| `api/admin.ts` | gerar, listar, revogar, liberar |
| `src/lib/license.ts` | conferência offline da assinatura, no aparelho |
| `src/lib/useLicense.ts` | a política inteira, num lugar só |
| `src/screens/GateScreen.tsx` | a tela do código |
| `src/screens/BlockedScreen.tsx` | prazo vencido / acesso cancelado |
| `scripts/codes.mjs` | a operação do dia a dia |
| `scripts/verify-license.mjs` | a verificação ponta a ponta |
