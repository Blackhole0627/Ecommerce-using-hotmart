# Login e progresso na nuvem — como ligar

O código está pronto e verificado (`npm run verify:auth`, 73 conferências). Ele
está **desligado** em produção: enquanto `VITE_LOGIN` não for `true`, o app se
comporta exatamente como antes (abre direto, progresso só no celular, nenhuma
chamada ao servidor).

Para ligar faltam três contas externas, que só o dono do projeto pode criar.

---

## Como funciona, em uma página

1. A compradora abre o app e vê **"Sign in to start training"**.
2. Digita o e-mail da compra → recebe um **código de 6 números** por e-mail →
   digita → entra. Ou toca em **Continuar com o Google**.
3. O servidor confere que aquele e-mail tem uma compra ativa (o mesmo registro
   que o webhook da Hotmart já grava) e devolve a sessão + a licença offline de
   sempre. Reembolso, limite de 3 aparelhos e uso sem internet continuam iguais.
4. O progresso sobe para a conta e desce em qualquer outro celular. Quem já
   treinava antes do login não perde nada: o progresso do aparelho sobe no
   primeiro login.
5. Em Ajustes → **Sua conta**: nome, foto (do Google), sair, excluir conta.

**Privacidade.** A tela de login nunca revela se um e-mail comprou o produto
(quem não comprou ouve a mesma resposta e simplesmente não recebe código). O
código é guardado só como hash, vale 10 minutos, uma vez, com no máximo 5
tentativas. Nenhuma informação de saúde é guardada: só quais treinos foram
concluídos e quando. A Política de Privacidade muda sozinha para a versão "com
conta" quando o login liga.

---

## 1. Google (botão "Continuar com o Google")

Crie na conta Google **da cliente** (o projeto deve ser dela):

1. https://console.cloud.google.com → **Criar projeto** (ex.: `squeeze-method`).
2. **APIs e serviços → Tela de permissão OAuth**
   - Tipo: **Externo**
   - Nome do app: `The Squeeze Method`
   - E-mail de suporte: `squeezemethod@gmail.com`
   - Domínio autorizado: `femivita.online`
   - Escopos: só os padrão (`openid`, `email`, `profile`). São escopos não
     sensíveis: **não precisa** de verificação do Google.
   - No fim, clique em **Publicar app** (sem isso, só "usuários de teste"
     conseguem entrar).
3. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**
   - Tipo: **Aplicativo da Web**
   - Origens JavaScript autorizadas: `https://femivita.online`
     (e o endereço de preview da Vercel, se for testar por lá)
   - URIs de redirecionamento: **deixe vazio** (o botão usa janela, não
     redirecionamento)
4. Copie o **ID do cliente** (`xxxx.apps.googleusercontent.com`).

> O Google é opcional. Sem ele, o login por código no e-mail funciona sozinho,
> e o botão simplesmente não aparece.

---

## 2. Envio do código por e-mail (Resend)

1. https://resend.com → criar conta (plano gratuito: 3.000 e-mails/mês, 100/dia).
2. **Domains → Add domain** → `femivita.online`.
3. A Resend mostra 3 ou 4 registros DNS (SPF, DKIM, MX de retorno). Coloque
   cada um no **DNS da Hostinger** (onde o domínio está registrado):
   hPanel → Domínios → femivita.online → **DNS / Nameservers** → adicionar
   registro. Copie tipo, nome e valor exatamente como a Resend mostra.
4. Volte na Resend e clique **Verify**. Pode levar de minutos a algumas horas.
5. **API Keys → Create API Key** (permissão: *Sending access*). Copie a chave
   (`re_...`): ela só aparece uma vez.

> Os registros DNS **não** mexem no site: o app continua apontando para a
> Vercel. São só para o e-mail sair com o nome `femivita.online` e não cair no
> spam.

---

## 3. Variáveis na Vercel

Projeto `squeeze-method` → **Settings → Environment Variables**:

| Variável | Valor | Para quê |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_...` | envia o código |
| `AUTH_MAIL_FROM` | `The Squeeze Method <login@femivita.online>` | remetente (opcional, este é o padrão) |
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | o servidor confere o token do Google |
| `VITE_GOOGLE_CLIENT_ID` | o mesmo ID | o app desenha o botão |
| `AUTH_REQUIRED` | `true` | fecha a porta lateral (ver abaixo) |
| `VITE_LOGIN` | `true` | **liga o login no app** |

`LICENSE_PRIVATE_KEY`, `REDIS_URL` e `HOTMART_HOTTOK` já existem e são
reaproveitados: a sessão é derivada da chave das licenças, e conta e progresso
moram no mesmo banco.

Variáveis que começam com `VITE_` entram **na hora de construir**: depois de
mudar, é preciso **publicar de novo**.

---

## 4. Ordem para ligar (sem derrubar ninguém)

1. **Confira o banco antes de tudo.** Com o login ligado, toda entrada depende
   do Redis. Confirme que a conta do Redis (`REDIS_URL`) é da cliente, não do
   desenvolvedor anterior. Se for dele, crie um novo na conta dela e troque a
   variável **antes** de seguir.
2. **Troque o `HOTMART_HOTTOK`** (o anterior é conhecido pelo desenvolvedor
   antigo): gere um novo no webhook da Hotmart e atualize na Vercel.
3. Cadastre `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID` e
   publique. Nada muda para quem usa (o login ainda está desligado).
4. Teste num **deploy de preview** com `VITE_LOGIN=true` só no ambiente
   *Preview*: entrar com código, entrar com Google, abrir em dois celulares.
5. Faça uma **compra de teste** com cupom de 100% e entre com o e-mail dela.
6. Ligue em produção: `VITE_LOGIN=true` e `AUTH_REQUIRED=true` no ambiente
   *Production*, e publique.
7. Avise as compradoras atuais: na próxima abertura o app pede para entrar uma
   vez com o e-mail da compra. O progresso delas sobe para a conta sozinho.

**Por que `AUTH_REQUIRED`.** Sem ele, `/api/activate` continuaria aceitando um
e-mail "solto": quem soubesse o e-mail de uma compradora pularia o login
chamando a rota direto. Com ele, ativar por e-mail exige a sessão daquele
e-mail. Os códigos manuais `SQZ-XXXXX-XXXXX` continuam valendo (eles já são o
segredo).

**Voltar atrás**: apague `VITE_LOGIN` (ou ponha `false`) e `AUTH_REQUIRED`, e
publique. O app volta a abrir direto; as contas e o progresso ficam guardados
para quando ligar de novo.

---

## Suporte

| Ela diz | O que fazer |
| --- | --- |
| "não chegou o código" | spam/promoções; confirmar que é o e-mail do comprovante; o limite é 5 códigos por hora |
| "comprei com outro e-mail" | ela entra com o e-mail da compra; se quiser usar o Google com outro Gmail, o app pede o e-mail da compra uma vez e liga os dois |
| "troquei de celular e não abre" | limite de 3 aparelhos: `npm run codes release <e-mail>` |
| "quero apagar meus dados" | ela mesma em Ajustes → Sua conta → Excluir; ou pelo e-mail de suporte |

---

## Verificação

```bash
npm run verify:auth
```

Constrói o app com login ligado (em `dist-auth-test/`, o `dist` normal não é
tocado), roda as rotas reais de `api/` contra um Redis, uma Resend e um Google
de mentira, e dirige o app num iPhone simulado: entrada por código e por
Google, tokens forjados recusados, porta lateral fechada, dois celulares
sincronizando, progresso antigo subindo, sair, reembolso e exclusão. Usa
chaves descartáveis: **não precisa** da chave privada de produção.

`SHOTS=1 npm run verify:auth` também guarda capturas das telas novas em
`screenshots/login-*.png`.

## Onde está cada parte

| Arquivo | O que faz |
| --- | --- |
| `api/auth.ts` | pedir código, conferir código, entrar com Google |
| `api/account.ts` | perfil, progresso (junta no servidor), excluir conta |
| `api/_auth.ts` | sessão, código, limites, envio, verificação do Google |
| `api/_merge.ts` | regra de junção do progresso (usada pelo app e pelo servidor) |
| `src/lib/sync.ts` | sincronização no aparelho |
| `src/lib/useAuth.ts`, `session.ts`, `auth.ts`, `google.ts` | conta no aparelho |
| `src/screens/LoginScreen.tsx` | a tela de entrar |
| `src/components/AccountCard.tsx` | "Sua conta" em Ajustes |
| `scripts/verify-auth.mjs` | a verificação ponta a ponta |
