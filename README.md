# The Squeeze Method

Aplicativo web instalável (PWA) que guia a execução dos exercícios do assoalho
pélvico. Abre por link, instala na tela inicial do iPhone e do Android, e
funciona sem internet depois da primeira abertura.

Escrito em **inglês (en-US)**, para o público americano. O português está
disponível em Ajustes → Idioma, para revisão da cliente.

## A marca

Nome, frase e cores vêm do logo da cliente, em `brand/previewlogoapp.webp`.

| | | |
|---|---|---|
| coral | `#EF6B58` | pétalas e o nome |
| verde | `#2B938B` | folhas e a linha de baixo |
| areia | `#EEE2D6` | o fundo |

Todo o resto da paleta é derivado dessas três. `npm run logo` calcula a
transparência do fundo creme da arte — por projeção, não por limiar, para a
borda curva não serrilhar — e escreve a flor e o logo completo em
`public/brand`. `npm run assets` gera os ícones a partir da flor.

O ebook explica. O app guia a execução. São coisas separadas de propósito.

---

## O programa

Seis semanas. O volume é o mesmo em todas: **5 séries × 10 repetições**, com 45 s
de descanso, seguidas do treino de pulsação. A progressão vem de outros dois
eixos.

| Semana | Postura | Sustentação | Duração do dia |
|---|---|---|---|
| 1 | Deitada | 1,6 s | 8 min 36 s |
| 2 | Sentada | 1,6 s | 8 min 36 s |
| 3 | Em pé | 1,6 s | 8 min 36 s |
| 4 | Em pé | 5 s | 11 min 26 s |
| 5 | Deitada | 5 s | 11 min 26 s |
| 6 | Sentada | 5 s | 11 min 26 s |

### O ritmo de uma repetição

Medido quadro a quadro na gravação de referência, não deduzido do livro:

```
  sobe        segura em cima      desce       fica embaixo
  0,4 s   →      1,6 s        →   0,4 s   →      1,6 s      = 4,0 s
```

O movimento não é um vaivém contínuo. A bolinha sobe rápido, **para** em cima,
desce rápido e **para** embaixo. As duas paradas são o exercício — a contração
é sustentada, não um toque de passagem — e são o que torna cada repetição
contável de relance. Uma série de dez leva exatamente 40 segundos, como na
gravação.

Nas semanas 4 a 6 muda um único número: a parada de cima vai de 1,6 s para 5 s.
`npm run verify:engine` trava esses valores contra a medição.

**Por que a postura é a progressão:** o exercício é literalmente o mesmo, mas a
gravidade pesa mais a cada posição. Deitada é a mais fácil para sentir o músculo;
em pé é a mais difícil. Por isso as semanas abrem em ordem, e o dia seguinte só
abre quando o anterior fecha.

Antes da semana 1 há a tela **"Find the right muscle"**, com a orientação de
identificar o assoalho pélvico. É a única parte educativa do app, e existe porque
sem ela o resto não funciona.

---

## Rodando o projeto

Requer Node 18 ou superior.

```bash
npm install
npm run dev        # desenvolvimento, em http://localhost:5173
npm run build      # gera dist/
npm run preview    # serve dist/ em http://localhost:4173
```

## Verificações

```bash
npm run verify:engine    # cronômetro: contagem e duração exatas, sem navegador
npm run verify:offline   # abre offline, mantém progresso   (precisa do preview no ar)
npm run verify:install   # instala mesmo no iPhone e no Android, item por item do pedido
npm run verify:resume    # pausar, sair do app e voltar sem perder o treino
npm run verify:license   # a porta de acesso: liberar, renovar, bloquear   (precisa do build)
npm run screenshots      # percorre o app num iPhone simulado e salva em screenshots/
```

`verify:engine` roda o motor dos 12 treinos em tempo virtual, com quadros
irregulares e uma janela de oito segundos com a tela congelada, e confere que
cada um termina no segundo exato, com a contagem certa de séries, repetições e
sustentações.

`verify:resume` reproduz o relato de "pausei e o treino sumiu" num iPhone
emulado, com relógio acelerado: sai do app no meio da série, confere que o
treino pausa em vez de continuar correndo sozinho, descarta a página no meio da
pulsação e cobra que voltar caia na pulsação — e não cinco séries atrás, no
começo do treino de força.

`verify:license` sobe o próprio servidor e não precisa do preview: ele executa
as rotas reais de `api/` contra um banco de mentira e dirige o app publicado no
navegador — confere que o programa não aparece sem licença, que um código
revogado fecha o app, que ficar offline não estica o prazo e que apagar o
progresso não tranca a usuária para fora.

Os outros que usam navegador precisam do preview no ar, e aceitam `BASE_URL`
para rodar contra o site publicado. Como o app agora exige licença, eles semeiam
uma antes de navegar — e para isso precisam da chave privada em `.keys/`
(ver [ACESSO.md](ACESSO.md)).

## Controle de acesso

O app só abre com um código de compra, e o acesso pode ser cortado depois de um
reembolso. A operação inteira — configurar, gerar os códigos para a plataforma
de venda, bloquear alguém, atender suporte — está em **[ACESSO.md](ACESSO.md)**.

O resumo: `npm run codes new 100` gera os códigos, `npm run codes revoke SQZ-...`
bloqueia. O app confere a licença sozinho, sem internet, e ela vence em 7 dias —
ficar offline não preserva o acesso, é o que o faz vencer.

## Publicação na Vercel

O projeto já traz `vercel.json` configurado.

1. Suba o repositório para uma conta **no nome da cliente** (GitHub/GitLab).
2. Em vercel.com, também **na conta da cliente**, importe o repositório.
3. A Vercel detecta Vite sozinha. Não é preciso configurar nada.
4. O endereço sai como `nome-do-projeto.vercel.app`.

Domínio próprio é opcional (~USD 12/ano), pago direto no registrador e apontado
em Settings → Domains. O registro fica no nome da cliente.

> **Conta, repositório e domínio no nome da cliente, não do desenvolvedor.**
> É o mesmo motivo pelo qual conta de loja não deve ficar no nome de terceiro:
> trocar de desenvolvedor não pode custar o produto.

---

## Onde mexer em cada coisa

| Quero mudar | Arquivo |
|---|---|
| Nome, frase, cores da marca | `src/brand.ts` e `src/styles/theme.css` |
| Semanas, posturas, séries, repetições, descanso | `src/data/program.json` |
| Qualquer texto do app (inglês) | `src/i18n/en.ts` |
| Qualquer texto do app (português) | `src/i18n/pt.ts` |
| Idioma padrão | `src/i18n/index.ts` (`DEFAULT_LANGUAGE`) |
| A arte da marca | `brand/previewlogoapp.webp`, depois `npm run logo && npm run assets` |

O programa inteiro cabe em **um JSON de 6 objetos**. Ajuste da cliente é edição
de um arquivo, não reescrita do app.

Os dois idiomas são checados pelo TypeScript: se um texto existir em `en.ts` e
faltar em `pt.ts`, o projeto não compila. Não há como esquecer uma tradução e
descobrir em produção.

---

## Como está montado

```
src/
  brand.ts              identidade: nome, frase, cores  ← ponto único da marca
  data/program.json     as 6 semanas, suas posturas e treinos
  i18n/                 en.ts (principal), pt.ts (revisão), index.ts
  lib/
    engine.ts           máquina de estados do treino e o cronômetro
    audio.ts            beeps em Web Audio, com o destravamento do iOS
    haptics.ts          vibração, detectada (não existe no iPhone)
    wakelock.ts         manter a tela acesa, com alternativa para iOS antigo
    storage.ts          progresso e preferências em localStorage
    useProgram.ts       progresso, travamento de semanas e dias, durações
    platform.ts         iOS/Android/instalado
  screens/
    WeeksScreen         as 6 semanas, as fichas dos 7 dias e a retomada
    IntroScreen         "Find the right muscle"  ← pedido da cliente
    DayScreen           postura, números, dicas, iniciar
    SessionScreen       execução da sessão inteira  ← tela principal
    FinishScreen        conclusão do treino, do dia, da semana
    SettingsScreen      som, vibração, tela acesa, ritmo, sustentação, idioma
  components/
    Ball                a bolinha e o trilho squeeze/release
    InstallHint         convite de instalação (passo a passo no iOS)
```

### Três decisões que sustentam o resto

**O cronômetro não acumula intervalos.** Cada fase guarda o instante em que
deveria ter começado, e a próxima começa em `início + duração`, não em `agora`.
O treino mais longo do programa dura 9 min 13 s; somando `setInterval` a essa
altura o desvio já seria visível. O motor também recupera fases vencidas de uma
vez só, para o caso de a tela apagar no meio.

**A animação não passa pelo React.** A posição da bolinha sai direto no DOM, em
uma única variável CSS (`--t`), e o React só é acordado quando fase, série ou
repetição mudam. Renderizar a árvore 60 vezes por segundo durante dez minutos
esquentaria o aparelho sem necessidade.

**O dia inteiro é uma sessão só.** O treino de força emenda no de pulsação
sozinho — descanso, um "prepare-se" curto e segue — como no app de referência e
como a cliente descreveu ("logo em seguida o de pulsação"). Parar no meio para
pedir um toque quebra a sessão justamente quando o telefone está longe da mão.

**Uma sessão interrompida pode ser retomada.** O iOS descarta a página de um app
em segundo plano, e isso acontece logo depois de pausar e largar o telefone.
A posição é gravada a cada série, e a tela inicial oferece continuar de onde
parou. Cada treino também é gravado assim que termina, não no fim da sessão.

**A pulsação não usa o trilho.** Ali a repetição inteira leva 1,05 s; uma bolinha
percorrendo o trilho nesse tempo vira um borrão. Ela fica no centro e só encolhe
e muda de cor, que é o que o olho acompanha em movimento rápido. O ritmo também
é um aperto curto seguido de pausa, não meio a meio.

**As ondas do rodapé respondem à bolinha.** Não são fundo parado: sobem cerca de
10 px quando a bolinha desce e voltam quando ela sobe, passando um pouco do ponto
antes de assentar — o peso de líquido deslocado. Também medido na gravação, e
preso à fase do treino, não a `--t`: na gravação elas ficam imóveis durante as
sustentações e durante o descanso.

**A bolinha encolhe ao apertar, não cresce.** Medido na gravação nos dois modos:
contrair fecha, não incha. Estava invertido, e isso fazia o "aperta" parecer uma
expansão.

### As armadilhas de plataforma, e onde cada uma foi tratada

| Armadilha | Onde |
|---|---|
| Safari só destrava áudio dentro do gesto do usuário — e o primeiro beep vem depois | `lib/audio.ts`, chamado em `App.tsx` no toque de "Start workout" |
| `navigator.vibrate` não existe no iPhone, em nenhuma versão | `lib/haptics.ts`; o controle some e a tela avisa que o retorno é sonoro |
| Tela apagando no meio de uma série de dez minutos | `lib/wakelock.ts`, com vídeo mudo em loop para iOS sem a API |
| Desvio do cronômetro em sessões longas | `lib/engine.ts`, deltas contra `performance.now()` |
| iOS não tem convite de instalação | `components/InstallHint.tsx`, passo a passo desenhado |
| Botão fixo sob a barra de gestos do iPhone | `viewport-fit=cover` + `env(safe-area-inset-*)` |
| iOS descarta a página em segundo plano e o treino se perdia | `lib/storage.ts` + a faixa de retomada na tela inicial |
| A dica de instalação some depois de dispensada uma vez | seção fixa em Ajustes → Instalar na tela inicial |
| `scale` multiplica as translações do `transform` | `components/Ball.css`, escala dentro da própria cadeia |

---

## O que está incluído

- 6 semanas, cada uma com 7 dias de treino de força e de pulsação
- Progressão por postura (deitada, sentada, em pé) e por sustentação
- Cronômetro por exercício, com som e vibração
- Descanso automático entre séries, com retomada automática
- Progresso salvo no aparelho; semanas e dias abrem em ordem
- Funciona offline depois da primeira abertura
- Instala na tela inicial no iPhone e no Android
- Inglês e português
- Código de acesso por compra, com bloqueio depois de reembolso ([ACESSO.md](ACESSO.md))

## O que não está incluído

Conta com e-mail e senha, painel de administração com tela (a operação é por
linha de comando), vídeos ou ilustrações dos exercícios, cobrança dentro do app,
notificação de lembrete diário, e o conteúdo educativo completo — esse é o
ebook. A única exceção é a tela de identificação do músculo, pedida pela
cliente.

## Privacidade

Nenhum dado pessoal é coletado. Não há conta, nome, e-mail nem senha, e nenhuma
informação de saúde sai do aparelho: progresso e preferências ficam em
`localStorage`.

O controle de acesso é a única coisa que fala com um servidor, e o que trafega
é só o **código da compra** e um **identificador aleatório do aparelho** — que é
guardado apenas como hash, e não é impressão digital do navegador nem tem
relação com a pessoa. Nada disso identifica quem está usando, nem o que ela
treinou.

---

Pendências abertas: veja [PENDENCIAS.md](PENDENCIAS.md).
