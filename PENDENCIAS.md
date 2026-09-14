# Pendências

O app está funcional e verificado. Tudo que ainda depende de decisão da cliente
está listado aqui, com o valor provisório que está no ar enquanto isso.

---

## 1. Idioma do app — RESOLVIDO

Confirmado com a cliente: **quem compra é americana.** O app fica em inglês
(en-US), como já está, e nada muda.

O português continua disponível em **Ajustes → Idioma**, para ela revisar o
conteúdo no idioma dela antes de aprovar. Os dois arquivos ficam lado a lado em
`src/i18n/` — se um texto existir em um e faltar no outro, o projeto nem compila.

A decisão vale para além do app: a página de vendas e o ebook também precisam
sair em inglês, porque têm que estar no idioma de quem compra. E a plataforma de
pagamento precisa ser uma que a compradora americana reconheça na hora de
digitar o cartão.

---

## 2. Nome do app — RESOLVIDO

O nome veio escrito no logo que você mandou: **"The Squeeze Method"**, com
**"Pelvic Power & Wellness"** embaixo. É isso que está no ar, no ícone e no
manifesto. O nome curto, o que aparece embaixo do ícone na tela inicial, é
**"Squeeze"** — o iOS corta perto de 12 caracteres.

Se em algum momento você quiser mudar, é uma linha em `src/brand.ts`.

---

## 3. Logo e cores — RESOLVIDO

Aplicados a partir do arquivo que você enviou (`brand/previewlogoapp.webp`).

**As três cores, amostradas da sua arte:**

| | | |
|---|---|---|
| coral | `#EF6B58` | pétalas e o nome |
| verde | `#2B938B` | folhas e a linha de baixo |
| areia | `#EEE2D6` | o fundo |

Todo o resto da paleta é derivado dessas três, clareando na direção do branco
para os fundos e escurecendo para os tons de ênfase. Nada foi inventado fora
delas. O cinza-azulado que o app tinha antes saiu inteiro: a tinta agora é
marrom quente, porque preto frio sobre creme fica sujo.

`npm run logo` recorta o fundo creme da sua arte e gera a flor e o logo
completo com transparência; `npm run assets` gera os ícones a partir da flor.
Refazer, se você trocar a arte, são esses dois comandos.

**Um cuidado com o arquivo.** O que você mandou é uma prévia de 1024 pixels.
Está ótimo para o app — na tela do celular ele nunca aparece maior do que isso.
Para o ebook, para impressão ou para um banner grande, peça a quem gerou o logo
o arquivo **vetorial** (SVG, AI ou PDF). Vetor não perde qualidade em nenhum
tamanho; a prévia perde.

**E uma coisa que não dá para fazer:** você sugeriu tirar ideias do ebook que me
mandou. Aquele PDF é de outra autora, com nome e capa dela. Peguei dele só a
estrutura numérica do treino, que não se protege; o desenho, os textos e as
imagens são dela. Tudo que está no app é original ou seu. Vale conferir se o
ebook que você vai vender também está.

---

## 4. Duração das semanas 4 a 6 — vale conferir na prática

Você pediu: aperta, **segura 5 segundos** e solta, repetindo a mesma sequência de
5 séries × 10 repetições.

Está implementado exatamente assim. Só que a conta fica pesada:

| | Semanas 1–3 | Semanas 4–6 |
|---|---|---|
| Treino de força | 6 min 23 s | **9 min 13 s** |
| Treino de pulsação | 2 min 13 s | 2 min 13 s |
| **Total por dia** | **8 min 36 s** | **11 min 26 s** |

Cerca de 11 minutos e meio por dia, e 50 contrações sustentadas de 5 segundos
é bastante volume para a maioria das pessoas.

Não mudei nada por conta própria — é o seu programa. Mas deixei **Ajustes →
Tempo de sustentação** com 3, 5 e 8 segundos para você sentir a diferença
testando. Se depois quiser baixar as repetições nessas semanas (10 → 5, por
exemplo), é um número em `src/data/program.json`.

Os outros tempos da repetição (subida, descida e a parada embaixo) vieram da
medição da gravação, não de palpite: 0,4 s para subir, 0,4 s para descer e
1,6 s parada embaixo. O descanso entre séries continua em 45 s.

Nas semanas 1 a 3 a sustentação é de 1,6 s, também medida — e é por isso que
uma série de dez leva exatamente 40 segundos, como na gravação.

---

## 5. Ordem das posturas nas semanas 4 a 6

Você escreveu: "uma semana em pé, outra deitada e outra sentada". Segui essa
ordem literalmente — semana 4 em pé, 5 deitada, 6 sentada.

Vale notar que ela inverte a lógica das semanas 1 a 3, que vão da posição mais
fácil (deitada) para a mais difícil (em pé). Nas semanas 4 a 6, a sustentação de
5 segundos já é novidade, e ela estreia na postura mais difícil.

**Se preferir** repetir a mesma progressão (deitada → sentada → em pé), é trocar
três palavras em `src/data/program.json`. Me diga e eu troco.

---

## 6. Sete dias por semana

Você não disse quantos dias tem cada semana. Está como **7 dias**, um treino por
dia, com o dia seguinte abrindo ao concluir o anterior.

É um número em `src/data/program.json` (`daysPerWeek`).

---

## 7. Ritmo do treino de pulsação — resolvido pela medição

Não era preciso adivinhar: o ritmo foi medido quadro a quadro na gravação.
Uma repetição de pulsação leva **1,05 s**, e não é meio aperto e meio solta —
é um **aperto curto (0,5 s) seguido de uma pausa maior (0,55 s)**.

O padrão do app é esse. Em **Ajustes → Ritmo da pulsação** há 1,4 s / **1,05 s
(padrão)** / 0,8 s, caso você queira mais devagar ou mais rápido; as quatro
fases são escaladas juntas, então o formato do movimento não se perde.

---

## 8. Conteúdo escrito — revisar

Todo o texto do app é original, escrito para ele. Nada foi copiado do PDF.

Vale sua revisão, principalmente:
- **"Find the right muscle"** (`src/i18n/en.ts`, chave `intro`) — a tela que você
  pediu para abrir o app, com a orientação de identificar o músculo.
- **As dicas de execução** de cada treino (chave `workout.tips`).
- **O aviso de saúde** no fim da tela de introdução. Recomendo manter: o público
  é americano, o assunto é saúde, e ele não promete cura nem resultado.

---

## 9. Direito autoral — resolvido

Você confirmou que o PDF foi enviado por engano e que só quer o método de
exercício. É o que foi usado: **apenas a estrutura numérica** (séries,
repetições, descanso, posturas), que não é obra protegida. Nenhuma linha de texto
do PDF entrou no app.

Fica um ponto ligado ao item 2: se o ebook que você vai vender tiver nome
próprio, o app deveria levar o **nome dele**, para os dois se reconhecerem como o
mesmo produto.

---

## 10. Retorno do teste da cliente — resolvido

Do teste dela em 28/08, três coisas foram corrigidas:

- **"não passou logo pra pulsação"**: os dois treinos agora emendam sozinhos,
  com descanso e um "prepare-se" curto entre eles. Sem toque nenhum, como na
  gravação de referência.
- **"quando eu pausei sumiu"**: a sessão passou a ser gravada a cada série. Se o
  celular descartar o app, a tela inicial oferece continuar de onde parou. Cada
  treino também é gravado assim que termina.
- **"não fica um ícone clicável?"**: o passo a passo de instalação agora fica
  sempre em Ajustes. Antes, dispensar a dica uma vez fechava a única porta.

Os números que ela reconfirmou já estavam certos: 5 séries de 10 no aperta e
solta com 45 s, e 5 de 10 na pulsação com 20 s.

---

## 11. Publicação — domínio resolvido, conta ainda não

O app está no ar no domínio da cliente: **https://femivita.online** (o `www`
redireciona para lá). O domínio é dela, registrado na Hostinger, e continua no
nome dela — só os registros de DNS apontam para a Vercel.

O endereço provisório saiu do ar a pedido dela ("não quero meu nome no
domínio"). O projeto passou a se chamar `squeeze-method`, e o endereço de
reserva é `squeeze-method.vercel.app`.

`app.femivita.online` está registrado no projeto e sem registro de DNS. Fica
pronto para quando a raiz do domínio for usada por uma página de vendas: aí é um
CNAME e o app muda de endereço sem downtime.

**Falta**: transferir o projeto da Vercel e o repositório do GitHub para contas
**no nome da cliente**. É a última linha do escopo fechado que continua aberta.
O repositório ainda se chama `VIVIAN-app` e deve ser renomeado junto.

---

## Do lado do desenvolvedor

- Ajustar a proposta na plataforma para USD 200
- Começar a contar o prazo a partir do depósito em Escrow
- Pagamento sempre via Escrow, nunca por fora
