# Orçamento de itens fora do escopo

Registro de referência. **Nada aqui está contratado ou em desenvolvimento.**

O escopo fechado de USD 200 está descrito no [README](README.md) e o que falta
para encerrá-lo está em [PENDENCIAS.md](PENDENCIAS.md). Este documento existe
para que, quando um destes itens for pedido, o valor já esteja definido — e para
deixar claro, desde já, o que não está incluído.

Princípio que rege a lista: **o que aumenta o preço é escopo novo, não o mesmo
trabalho mais barato.**

---

## Escopo fechado — USD 200

Do registro do projeto, seção 5.

### Incluso

- Até 3 níveis de exercícios, do iniciante ao avançado
- Cronômetro por exercício, com som e vibração
- Marcar concluído e acompanhar o progresso
- Funciona offline após a primeira abertura
- Instala na tela inicial do celular, iPhone e Android
- Cores e logo da cliente aplicadas
- Hospedagem publicada, conta no nome da cliente
- Ajustes durante o processo: a cliente testa, o desenvolvedor corrige

### Não incluso

- Ilustrações ou vídeos dos exercícios
- Contas de desenvolvedor de loja (não se aplica a PWA)
- Login de usuário
- Painel de administração para edição autônoma dos exercícios
- Vídeos hospedados
- Cobrança dentro do app
- Notificação de lembrete diário

---

## Tabela de valores

| # | Item | Por que está fora | Valor | Prazo |
|---|---|---|---|---|
| 1 | Notificação de lembrete diário | Listado como não incluso | USD 150 – 250 | 3 – 5 dias |
| 2 | Painel de administração | Listado como não incluso | USD 350 – 600 | 2 – 3 semanas |
| 3 | Login e progresso sincronizado entre aparelhos | Listado como não incluso | USD 400 – 700 | 2 – 3 semanas |
| 4 | Vídeos dos exercícios hospedados | Listado como não incluso | USD 150 – 250 + hospedagem | 1 semana |
| 5 | Integrar ilustrações ou animações | A cliente envia a arte pronta | USD 80 – 150 | 2 – 4 dias |
| 6 | Cobrança dentro do app | Listado como não incluso | USD 250 – 400 | 1 – 2 semanas |
| 7 | Português como idioma de venda | Segundo mercado, não segundo texto | USD 60 – 100 | 2 – 3 dias |
| 8 | Ampliar ou reestruturar o programa | Desenho de conteúdo novo | USD 60 – 120 | 2 – 4 dias |
| 9a | Ebook — roteiro comentado, ela escreve | Não é software; é conteúdo | USD 60 – 100 | 2 dias |
| 9b | Ebook — diagramação, ela entrega o texto | idem | USD 120 – 200 | 3 – 5 dias |
| 9c | Ebook — estrutura, edição do texto dela e diagramação | idem | USD 250 – 400 | 1 – 2 semanas |
| 9d | Ebook — escrito do zero e diagramado | idem | USD 500 – 800 | 2 – 3 semanas |
| 9e | Ebook — ilustrações dos exercícios (8 a 12, traço simples) | idem | USD 150 – 300 | 1 semana |
| 9f | Ebook — versão em inglês, se ela escrever em português | idem | USD 100 – 180 | 3 – 5 dias |

Valores coerentes com o orçamento original do app nativo completo, de
USD 1.200 – 2.000. Prazos contam a partir do depósito em Escrow.

---

## Detalhamento

### 1. Notificação de lembrete diário — USD 150 – 250

O item que mais parece simples e menos é.

Um PWA não agenda notificação local. O caminho real é Web Push: chaves VAPID,
um serviço de envio e um agendador rodando fora do aparelho — ou seja, deixa de
ser um app estático e passa a ter infraestrutura.

No iPhone há restrições a mais: só funciona a partir do iOS 16.4, **só se a
usuária tiver adicionado o app à tela de início**, e a permissão precisa ser
pedida dentro de um toque dela. Quem usar pela aba do Safari não recebe nada.

Inclui: serviço de push, tela de permissão, escolha de horário, agendamento e
cancelamento. Custo de hospedagem do agendador não incluso (há plano gratuito
que atende, com limites).

### 2. Painel de administração — USD 350 – 600

Hoje o programa inteiro é um JSON de seis objetos, e alterar semanas, séries,
repetições ou descanso é editar um arquivo — trabalho de minutos, coberto pelos
ajustes do escopo atual.

Um painel para a cliente editar sozinha é outro produto: exige autenticação,
banco de dados, telas de edição, validação (impedir que uma série de 0
repetições quebre o cronômetro) e publicação das mudanças para quem já tem o
app instalado. Sai do estático e passa a ter backend, com custo mensal.

Recomendação: só faz sentido se ela pretender mudar o programa com frequência.
Para ajustes ocasionais, pedir a alteração sai muito mais barato.

### 3. Login e progresso sincronizado — USD 400 – 700

Hoje o progresso vive em `localStorage`, no aparelho. Sem conta, sem senha, sem
servidor — e sem nenhum dado pessoal saindo do celular, o que mantém o app fora
do alcance da CCPA.

Sincronizar entre aparelhos exige contas, autenticação, banco, recuperação de
senha, resolução de conflito entre dois aparelhos e política de privacidade
compatível. E muda o app de categoria: passa a guardar dado pessoal de saúde de
usuárias americanas, o que traz obrigação regulatória que hoje não existe.

### 4. Vídeos dos exercícios hospedados — USD 150 – 250 + hospedagem

Vídeo não cabe no plano gratuito da Vercel nem no cache offline. Precisa de um
serviço de streaming, com custo mensal por banda.

Inclui: player, integração com cada treino e controle de qualidade por conexão.
A produção dos vídeos é da cliente.

### 5. Integrar ilustrações ou animações — USD 80 – 150

A cliente envia a arte pronta. O trabalho é otimizar, integrar às telas de
treino e garantir que não pese no carregamento offline.

Se as imagens vierem em formato adequado (SVG ou PNG otimizado) fica na ponta
baixa; se vierem como fotos grandes ou PSD, na alta.

### 6. Cobrança dentro do app — USD 250 – 400

Uma vantagem real do PWA: por não passar pelas lojas, **não há a comissão da
Apple**. Dá para usar Stripe direto, com taxa de cartão apenas.

Inclui: integração de pagamento, liberação de conteúdo após a compra e recibo.
Exige conta Stripe no nome da cliente e, dependendo do modelo, CNPJ ou entidade
americana.

Vale lembrar a recomendação original: vender o ebook fora do app continua sendo
o caminho mais simples e mais barato.

### 7. Português como idioma de venda — USD 60 – 100

A estrutura dos dois idiomas já existe e o português já está escrito, mas como
**ferramenta de revisão** — para a cliente ler o app inteiro no idioma dela
antes de aprovar. Está incluído no valor atual, sem custo.

Transformar isso em idioma de venda é outra coisa: revisão profissional do
texto, testes nos dois idiomas a cada alteração e manutenção em dobro daí em
diante. Se a intenção for vender também para brasileiras, é um segundo mercado.

### 8. Ampliar ou reestruturar o programa — USD 60 – 120

O programa de 6 semanas atual está dentro do escopo: são seis objetos em um
JSON, e definir o próprio programa é direito da cliente.

Passa a ser escopo novo quando muda a estrutura: mais semanas, treinos
diferentes a cada dia dentro da mesma semana, trilhas paralelas por objetivo
(pós-parto, menopausa) ou níveis que se desbloqueiam por critério.

### 9. Ebook — USD 60 a 800, conforme quanto ela escreve

O único item da lista que não é software. Entra aqui porque ela perguntou
("vc faz ebook?") e porque é o que está travando o lançamento: sem ebook, o app
não tem o que acompanhar.

**Premissa de tamanho**, para os valores significarem alguma coisa: 30 a 40
páginas, 6.000 a 9.000 palavras. É o tamanho de um ebook-isca de nicho — o
suficiente para justificar o preço e curto o bastante para ser lido.

**Se ela quiser o formato do ebook de referência**, os números mudam. Aquele PDF
tem 106 páginas, mas o volume vem do desenho, não do texto: são 100 imagens
embutidas, nenhuma fonte, ou seja, cada página é uma figura — e boa parte delas
são aberturas de capítulo em foto de página inteira, sem uma linha de texto. O
texto real cabe na mesma faixa de 6.000 a 9.000 palavras.

Então a escrita não muda de preço; a diagramação sim. Cem páginas desenhadas é
outro trabalho:

- **Diagramação em formato "revista"**, 90 a 110 páginas, com aberturas de
  capítulo em foto: **+ USD 100 – 200** sobre 9b, 9c ou 9d.
- **Licença das fotos**: não incluída. Banco de imagens custa de USD 10 a 50 por
  foto avulsa, ou uma assinatura mensal. Um ebook desses usa de 15 a 30 fotos.
  Foto de banco tem licença; foto tirada do Google, não.

**Uma vantagem técnica sobre a referência, sem custo a mais:** diagramando em
HTML e imprimindo em PDF, o texto sai como texto de verdade — dá para buscar,
copiar, aumentar sem borrar, e leitor de tela consegue ler. O PDF de referência
é imagem em toda página: 20 MB, nada selecionável, inacessível. O nosso sai
menor e melhor, com a mesma cara.

**As quatro formas, da menor para a maior:**

- **9a, roteiro comentado.** Um sumário capítulo a capítulo, com o que cada um
  precisa responder, quantas palavras e em que ordem. Ela escreve. É o menor
  passo que destrava alguém parado, e o relato dela é exatamente esse: "estou
  tentando fazer mais não tá ficando bom".
- **9b, diagramação.** Ela entrega o texto final; sai um PDF na marca dela —
  capa, tipografia, cores, respiro, numeração. Não inclui reescrever nada.
- **9c, estrutura e edição.** Ela escreve como sabe, eu organizo, corto, ligo os
  capítulos e diagramo. O texto continua sendo dela, na voz dela.
- **9d, escrito do zero.** Eu escrevo a partir do programa das 6 semanas e de
  uma conversa com ela sobre a história dela, e diagramo.

**Dois pontos que mudam o preço, e precisam ser perguntados antes de fechar:**

1. **Em que idioma.** O app está em inglês, para americanas, a pedido dela. Um
   ebook em português com um app em inglês são dois produtos diferentes na mesma
   sacola. Se ela escrever em português e o produto for para o mercado
   americano, some 9f — e não é tradução literal, é adaptação.
2. **É conteúdo de saúde.** Escrever significa assinar embaixo do que está
   escrito. Nada de promessa terapêutica, nada de "cura incontinência"; texto
   orientado a treino, com o mesmo aviso que já está no app. É parte do motivo
   de 9d custar o que custa.

**E o que não dá para fazer, em nenhuma das quatro:** aproveitar o PDF que ela
mandou. É de outra autora, com nome e capa dela. A estrutura numérica do treino
não se protege e já foi usada; o texto, o desenho e as imagens são dela.

---

## Propostas — o que dá para acrescentar

Diferente do resto do documento. Os itens 1 a 9 são coisas que a cliente pediu
ou que ficaram de fora do escopo desde o começo. Os de baixo são **sugestões
minhas**: ninguém pediu, e o app está completo sem nenhuma delas.

| # | Item | O que resolve | Valor | Prazo |
|---|---|---|---|---|
| 10 | Página de vendas no domínio dela | Ela não tem como vender nada hoje | USD 200 – 350 | 1 semana |
| 11 | Voz guiando o treino, na voz dela | O treino é feito de olhos fechados; hoje exige olhar a tela | USD 180 – 320 | 1 semana |
| 12 | Check-in de progresso, semanas 0, 3 e 6 | Prova para a usuária de que funcionou — e de onde saem os depoimentos | USD 150 – 250 | 4 – 6 dias |
| 13 | Sequência de dias e marcos | Constância é o que decide o resultado neste tipo de treino | USD 120 – 220 | 3 – 5 dias |
| 14 | Início personalizado, cinco perguntas | Sobe o valor percebido na primeira abertura | USD 80 – 150 | 2 – 4 dias |
| 15 | Lembrete diário pelo calendário (.ics) | Faz quase o que o item 1 faz, sem infraestrutura nenhuma | USD 60 – 100 | 1 – 2 dias |
| 16 | Modo discreto: tela apagada, só áudio | É um produto íntimo, usado em lugar público | USD 60 – 120 | 2 dias |
| 17 | Modo noturno | O treino é feito deitada, e boa parte à noite | USD 80 – 150 | 2 – 3 dias |
| 18 | Guia de respiração junto da bolinha | Metade da técnica é a respiração, e hoje ela só está escrita | USD 120 – 220 | 3 – 5 dias |
| 20 | Ilustrações das três posturas | Hoje são ícones; postura errada é o erro mais comum | USD 150 – 300 | 1 semana |
| 21 | Um segundo programa (pós-parto ou menopausa) | Outro produto para a mesma cliente que já comprou | USD 200 – 400 | 1 – 2 semanas |
| 22 | Texto maior e mais contraste | O público desse treino não é de vinte anos | USD 80 – 150 | 2 – 3 dias |

**Ordem recomendada, e ela não começa no app.** Enquanto não houver ebook e
página de vendas, melhorar o app é melhorar um produto que ainda não tem como
ser comprado. Primeiro o 9 e o 10; depois o 11, que é o que diferencia o app de
qualquer PDF concorrente.

**Por que o 11 custa pouco perto do que entrega:** a parte difícil de áudio no
iPhone já está feita. O Safari só deixa o AudioContext sair de "suspended"
dentro do gesto da usuária, e o primeiro som toca uns 40 segundos depois do
toque — `audio.unlock()` já roda de forma síncrona no botão de iniciar, com
ganho, liga/desliga e retomada ao voltar para o app. A voz entra no mesmo
`onCue` que os beeps usam hoje. O custo está na gravação, não no código: a
faixa de preço é o tamanho do roteiro (só inglês e os avisos essenciais, ou os
dois idiomas com a contagem das repetições em voz alta, que dobra o número de
faixas).

**O item 15 concorre com o item 1, de propósito.** Web Push exige chaves VAPID,
serviço de envio, agendador fora do aparelho e, no iPhone, só funciona com o app
instalado na tela de início. Um arquivo de calendário faz o lembrete tocar sem
nada disso. Vale oferecer os dois e deixar ela escolher.

**Por que 17 e 22 custam tão pouco:** os dois já estão meio construídos. O tema
inteiro do app sai de variáveis em `theme.css` — a paleta da cliente foi trocada
mexendo só nelas, então um segundo tema é o mesmo exercício. E o tamanho do texto
já é relativo em toda a interface.

**O 18 é o que mais muda o treino.** O app diz "respire normalmente" e "contraia
ao soltar o ar" em texto, e é a instrução que mais se perde na prática — quem
está acompanhando a bolinha prende a respiração sem perceber. Um anel que
acompanha a bolinha marcando inspira/expira transforma o conselho em algo que se
segue sem pensar. O motor já emite as fases; o anel é mais uma coisa lendo o
mesmo relógio.

**O 21 não é uma melhoria, é um segundo produto.** As 6 semanas atuais servem
quem quer fortalecer. Pós-parto e menopausa são duas outras portas de entrada,
com o mesmo motor e o mesmo app — muda o JSON do programa e o texto. É a forma
mais barata que existe de ela ter o que vender para quem já comprou uma vez.

**Uma coisa que eu não recomendo, e por isso não está na tabela:** medir uso com
analytics. O app hoje não coleta nada, diz isso em três telas, e isso é
argumento de venda num produto íntimo — além de manter o app fora do alcance da
CCPA. Trocar essa confiança por números que ela não vai usar é mau negócio.

---

---

## O que continua incluído, sem custo

Para não haver dúvida do outro lado da linha:

- Ajustar séries, repetições, descanso, sustentação e postura das 6 semanas
- Trocar qualquer texto do app, nos dois idiomas
- Aplicar logo, cores e nome definitivo quando chegarem
- Corrigir qualquer defeito encontrado nos testes da cliente
- Publicar e republicar quantas vezes for preciso
- Ajustes de layout, espaçamento e cor durante o processo

"Ajustes durante o processo" é corrigir e afinar o que foi construído. Redesenhar
o que já foi aprovado, ou trocar a estrutura do produto, é escopo novo.
