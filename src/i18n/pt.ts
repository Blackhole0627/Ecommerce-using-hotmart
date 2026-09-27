/**
 * Textos em português (pt-BR).
 *
 * O app é publicado em inglês, para o público americano. Esta tradução existe
 * para a cliente revisar o conteúdo no idioma dela antes de aprovar, e fica
 * disponível em Ajustes → Idioma.
 */
import type { Dict } from './en'

export const pt: Dict = {
  common: {
    back: 'Voltar',
    settings: 'Ajustes',
    week: 'Semana',
    day: 'Dia',
    of: 'de',
    minute: 'min',
    second: 's',
  },

  home: {
    subtitle: 'Seu treino diário do assoalho pélvico',
    progressTitle: 'Seu progresso',
    weeksDone: (done: number, total: number) => `${done} de ${total} semanas`,
    percentDone: (n: number) => `${n}% concluído`,
    upNext: (week: number, day: number) => `Próximo: semana ${week}, dia ${day}`,
    allDone: 'Programa concluído. Pode recomeçar o ciclo quando quiser.',
    startHere: 'Comece por aqui',
    yourProgram: 'Seu programa',
    locked: 'Conclua a semana anterior',
    daysDone: (done: number, total: number) => `${done} de ${total} dias`,
    resumeTitle: 'Treino em andamento',
    resumeWhere: (week: number, day: number, series: number, workout: string) =>
      `Semana ${week}, dia ${day} · ${workout}. Você parou na série ${series}`,
    resumeCta: 'Continuar de onde parou',
    resumeDiscard: 'Recomeçar o dia',
    savedHere: 'Guardado neste celular. Sem conta, sem senha.',
    sequenceNote:
      'As semanas abrem em ordem. Cada uma se apoia na anterior: primeiro você aprende o movimento deitada, depois leva ele para sentada e em pé.',
  },

  intro: {
    eyebrow: 'Antes de começar',
    title: 'Encontre o músculo certo',
    lede: 'Todo o programa depende de uma coisa: contrair o assoalho pélvico e mais nada. Reserve alguns minutos aqui antes da primeira sessão.',
    steps: [
      {
        title: 'Localize',
        body: 'Imagine que você está segurando um gás e, ao mesmo tempo, interrompendo o xixi. Essa subida para dentro e para cima é o assoalho pélvico. Use isso apenas para identificar o músculo. Não pratique durante o xixi de verdade.',
      },
      {
        title: 'Veja o que mais se mexe',
        body: 'Apoie a mão na barriga. Se barriga, coxas ou glúteos endurecerem, você está usando os músculos errados. O movimento é interno e quase invisível por fora.',
      },
      {
        title: 'Continue respirando',
        body: 'Prender a respiração é o erro mais comum. Respire normalmente o tempo todo. No começo, ajuda contrair na hora de soltar o ar.',
      },
      {
        title: 'Solte por completo',
        body: 'Soltar importa tanto quanto apertar. Entre uma repetição e outra, deixe o músculo relaxar de verdade. Músculo que nunca solta não fica mais forte.',
      },
    ],
    postureTitle: 'Por que a postura muda',
    postureBody:
      'As semanas 1 a 3 repetem o mesmo treino deitada, depois sentada e depois em pé. A gravidade pesa um pouco mais a cada vez, então o mesmo movimento exige mais do músculo. A partir da semana 4 entra a contração sustentada de cinco segundos, passando de novo pelas três posições.',
    disclaimerTitle: 'Um aviso antes de começar',
    disclaimerBody:
      'Este app é um guia de treino, não orientação médica. Se você tem alguma condição de saúde, está em acompanhamento médico ou sente dor durante os exercícios, procure um profissional de saúde antes.',
    cta: 'Entendi, começar a semana 1',
    done: 'Lido',
  },

  posture: {
    lying: 'Deitada',
    seated: 'Sentada',
    standing: 'Em pé',
    lyingHint: 'Deite de costas, joelhos dobrados e pés apoiados. É a posição em que fica mais fácil sentir o músculo trabalhando.',
    seatedHint: 'Sente-se ereta em uma cadeira firme, pés no chão, peso igual dos dois lados.',
    standingHint: 'Em pé, pés na largura do quadril, joelhos soltos. A posição mais difícil, porque a gravidade joga contra.',
  },

  style: {
    quick: 'Contrações rápidas',
    hold: 'Contrações de 5 segundos',
    quickHint: 'Aperta, segura um instante e solta. Quatro segundos por repetição.',
    holdHint: 'Aperta, segura por cinco segundos e solta.',
  },

  workout: {
    strength: 'Treino de força',
    pulse: 'Treino de pulsação',
    sets: 'Séries',
    reps: 'Repetições',
    rest: 'Descanso',
    duration: 'Duração',
    hold: 'Sustentação',
    start: 'Iniciar treino',
    repeat: 'Fazer de novo',
    doneLabel: 'Concluído',
    bothNote:
      'Faça os dois treinos, na ordem em que aparecem. O dia conta como concluído quando o segundo terminar.',
    tips: {
      strengthQuick: [
        'Contraia com firmeza, segure enquanto a bolinha fica parada em cima e solte por completo.',
        'Respire normalmente. Prender o ar atrapalha o movimento.',
        'Barriga, coxas e glúteos ficam relaxados. O trabalho é interno.',
      ],
      strengthHold: [
        'Aperte, segure firme por cinco segundos e solte devagar.',
        'A sustentação deve ficar igual do início ao fim, não mais forte no começo.',
        'Se ainda não conseguir os cinco segundos completos, segure o que der e aumente com o tempo.',
      ],
      pulse: [
        'Aqui é leve e rápido, como uma piscadela. Não é força máxima.',
        'Mantenha o mesmo ritmo da primeira à última repetição.',
        'Se perder o controle do movimento, pause e recomece a série.',
      ],
    },
  },

  session: {
    squeeze: 'Aperta',
    hold: 'Segura',
    release: 'Solta',
    seriesOf: (current: number, total: number) => `Série ${current}/${total}`,
    repsOf: (current: number, total: number) => `${current}/${total} repetições`,
    restTime: 'Descanso',
    getReady: (workout: string) => `Prepare-se para o ${workout.toLowerCase()}`,
    pause: 'Pausar treino',
    resume: 'Retomar treino',
    exit: 'Sair do treino',
    completed: 'Treino concluído',
    pausedTitle: 'Pausado',
    pausedBody:
      'Seu lugar está guardado neste celular. Pode fechar o app e voltar depois. O treino continua nesta série, esperando.',
    soundOn: 'Desligar som',
    soundOff: 'Ligar som',
    vibrationOn: 'Desligar vibração',
    vibrationOff: 'Ligar vibração',
    iosNote: 'No iPhone o retorno é sonoro. Deixe o volume ligado e o modo silencioso desligado.',
  },

  finish: {
    workoutDone: 'Treino concluído',
    dayDone: (day: number) => `Dia ${day} concluído`,
    weekDone: (week: number) => `Semana ${week} concluída`,
    programDone: 'Programa concluído',
    nextWorkout: (workout: string) => `Ir para o ${workout.toLowerCase()}`,
    backToProgram: 'Voltar para o programa',
    later: 'Faço depois',
    dayUnlocked: (day: number) => `O dia ${day} está liberado.`,
    weekUnlocked: (week: number, posture: string) =>
      `A semana ${week} está liberada: mesmo treino, ${posture.toLowerCase()}.`,
    programDoneBody: 'Você fechou as seis semanas. Pode recomeçar o ciclo quando quiser.',
    sets: 'Séries',
    totalReps: 'Repetições',
  },

  settings: {
    title: 'Ajustes',
    duringWorkout: 'Durante o treino',
    sound: 'Som',
    soundHint: 'Um sinal a cada aperta e solta.',
    vibration: 'Vibração',
    vibrationHint: 'Um toque curto a cada transição.',
    vibrationUnsupported: 'O Safari do iPhone não oferece vibração. Aqui o retorno é só sonoro.',
    keepAwake: 'Manter a tela acesa',
    keepAwakeHint: 'Evita que a tela apague no meio da série.',
    keepAwakeApprox:
      'Neste aparelho o recurso é aproximado. Se a tela ainda apagar, aumente o tempo de bloqueio automático nos ajustes do celular.',
    pulseTitle: 'Ritmo da pulsação',
    pulseHint:
      'Na pulsação a repetição é um aperto curto seguido de uma pausa maior, cerca de um segundo ao todo. Escolha o ritmo que der para acompanhar.',
    pulseSlower: 'Mais devagar',
    pulseDefault: 'Padrão',
    pulseFaster: 'Mais rápido',
    holdTitle: 'Tempo de sustentação',
    holdHint: 'Por quanto tempo você segura a contração nas semanas 4 a 6.',
    language: 'Idioma',
    languageHint: 'O app é escrito para o público americano. O português está aqui para revisão.',
    progressTitle: 'Progresso',
    progressHint:
      'Seu progresso fica salvo neste aparelho. Não há conta nem senha, e nada sai do seu celular.',
    restart: 'Recomeçar o programa',
    confirmRestart: 'Apagar o progresso e voltar para a semana 1?',
    erase: 'Apagar',
    cancel: 'Cancelar',
    version: 'versão',
    installTitle: 'Instalar na tela inicial',
    installHint:
      'Instalado, ele abre em tela cheia, com ícone próprio, e funciona sem internet. O passo a passo fica sempre aqui, caso precise de novo.',
    installDone: 'Já instalado. Você está usando pela tela inicial.',
    accessTitle: 'Seu acesso',
    accessCode: (code: string) => `Código ${code}`,
    accessHint:
      'Guardado neste celular. O app confere online mais ou menos uma vez por semana; você não precisa fazer nada.',
  },

  install: {
    barTitle: 'Você está no navegador',
    barBody: 'Coloque o app na tela inicial para ele abrir sozinho e não sair do lugar.',
    barCta: 'Ver como',
    title: (name: string) => `Deixe o ${name} na tela inicial`,
    body: 'Ele ganha ícone próprio, abre em tela cheia, funciona sem internet e não é fechado pelo navegador no meio do treino. O seu progresso fica guardado neste celular de qualquer forma.',
    stepShare: 'Toque no botão de compartilhar, na barra do Safari.',
    stepAdd: 'Escolha',
    stepAddStrong: 'Adicionar à Tela de Início',
    stepConfirm: 'Confirme em',
    stepConfirmStrong: 'Adicionar',
    stepConfirmTail: '. Pronto.',
    cta: 'Adicionar à tela inicial',
    dismiss: 'Agora não',
  },

  gate: {
    eyebrow: 'Seu acesso',
    title: 'Digite o e-mail da sua compra',
    lede: 'Use o mesmo e-mail que você usou para comprar. Sem senha, sem procurar nada.',
    label: 'E-mail da compra',
    cta: 'Liberar o app',
    working: 'Conferindo…',
    once: 'Isso é feito uma vez só neste celular. Depois o app abre direto no seu programa, com ou sem internet.',
    help: 'Comprou com outro e-mail, ou recebeu um código de acesso? Pode digitar aqui também, funciona igual.',
    errors: {
      bad_code: 'Isso não parece um e-mail completo.',
      unknown_code: 'Não encontramos nenhuma compra com esse e-mail. Confira se não tem erro de digitação e se é o endereço que você usou na compra.',
      revoked: 'Este código não está mais ativo. Se achar que houve engano, responda o e-mail da compra.',
      device_limit: 'Este código já está em uso em três aparelhos, que é o limite. Responda o e-mail da compra que a gente libera um.',
      not_activated: 'Este código ainda não foi configurado neste aparelho.',
      offline: 'Sem conexão com a internet. A liberação precisa ser feita online, só desta vez.',
      store_unavailable: 'O serviço de ativação está indisponível no momento. Tente de novo em alguns minutos.',
      server_error: 'Algo deu errado do nosso lado. Tente de novo daqui a pouco.',
    },
  },

  blocked: {
    expiredTitle: 'Hora de conferir o acesso',
    expiredBody:
      'O app funciona sem internet, mas mais ou menos uma vez por semana ele precisa de um instante de conexão para confirmar que o seu acesso continua ativo. Conecte e toque no botão abaixo. O seu progresso não é afetado.',
    revokedTitle: 'Este acesso não está mais ativo',
    revokedBody:
      'O código deste celular foi cancelado, normalmente depois de um reembolso. Se achar que houve engano, responda o e-mail da compra que a gente verifica.',
    retry: 'Tentar de novo',
    retrying: 'Conferindo…',
    another: 'Usar outro código',
    stillOffline: 'Ainda sem conexão. Verifique a internet e tente mais uma vez.',
  },

  ebook: {
    homeEyebrow: 'Seu guia',
    homeTitle: 'Ebook The Squeeze Method',
    title: 'Seu ebook',
    lede: 'O guia de 49 páginas que acompanha a sua compra. Ele explica como o assoalho pélvico funciona, o que os exercícios fazem e por que o programa é montado desse jeito.',
    open: 'Abrir o ebook (PDF)',
    note: 'O ebook abre como PDF, para ler aqui ou salvar no celular. Ele também chegou anexado no e-mail da sua compra.',
    offlineNote: 'Abrir pela primeira vez pode precisar de um instante de internet. Depois disso ele fica guardado neste celular.',
  },

  legal: {
    groupTitle: 'Sobre e informações legais',
    updated: 'Última atualização: 11 de setembro de 2026',
    pages: {
      privacy: {
        title: 'Política de Privacidade',
        sections: [
          {
            h: 'O que esta política cobre',
            ps: [
              'Esta política explica quais informações o The Squeeze Method (femivita.online) trata quando você usa o app e o ebook. A versão curta: quase tudo fica no seu celular.',
            ],
          },
          {
            h: 'O que processamos',
            ps: [
              'Para liberar o app, conferimos o e-mail da compra ou o código de acesso que você digita, e o serviço de ativação guarda esse registro junto com um identificador anônimo de cada aparelho liberado (até três). É só isso que ele armazena.',
              'O seu progresso de treino e os seus ajustes ficam salvos apenas no seu aparelho. Eles nunca são enviados, e nós não conseguimos vê-los.',
            ],
          },
          {
            h: 'O que não fazemos',
            ps: [
              'O app não tem anúncios, analytics nem rastreadores. Não coletamos seu nome, sua localização nem informações de saúde, e não vendemos nem compartilhamos informações pessoais com ninguém.',
            ],
          },
          {
            h: 'Compras',
            ps: [
              'Os pagamentos são processados pela Hotmart, a plataforma onde você comprou o produto, sob a política de privacidade dela. Nós recebemos apenas o necessário para liberar o acesso: o e-mail vinculado à sua compra e os avisos de reembolso.',
            ],
          },
          {
            h: 'A conferência semanal',
            ps: [
              'Mais ou menos uma vez por semana o app fala com o nosso servidor para confirmar que o seu acesso continua ativo. Essa chamada leva o seu código de acesso e o identificador do aparelho, e nada além disso.',
            ],
          },
          {
            h: 'Suas escolhas',
            ps: [
              'Você pode pedir a exclusão do registro de ativação vinculado à sua compra a qualquer momento escrevendo para squeezemethod@gmail.com. Excluir o registro desativa o app nos seus aparelhos.',
            ],
          },
          {
            h: 'Mudanças',
            ps: [
              'Esta política pode ser atualizada conforme o produto evolui. A data acima sempre reflete a versão atual.',
            ],
          },
        ],
      },
      terms: {
        title: 'Termos de Uso',
        sections: [
          {
            h: 'O produto',
            ps: [
              'O The Squeeze Method é um produto digital: um app de treino do assoalho pélvico de seis semanas e um ebook que o acompanha, vendidos em compra única pela Hotmart.',
            ],
          },
          {
            h: 'Sua licença',
            ps: [
              'A sua compra dá uma licença pessoal e intransferível para usar o app em até três aparelhos seus e ler o ebook para uso próprio.',
              'Compartilhar o seu código de acesso ou e-mail da compra, ou copiar, revender ou republicar o app ou o ebook, não é permitido.',
            ],
          },
          {
            h: 'Reembolsos',
            ps: [
              'Os reembolsos seguem a política mostrada no momento da compra, na Hotmart. Quando uma compra é reembolsada, o acesso ao app termina.',
            ],
          },
          {
            h: 'Aviso de saúde',
            ps: [
              'O app e o ebook são guias educativos de treino, não aconselhamento médico. O Aviso de Isenção Médica faz parte destes termos.',
            ],
          },
          {
            h: 'Sem garantias',
            ps: [
              'Trabalhamos para manter o app disponível e correto, mas ele é fornecido "como está", sem garantias de nenhum tipo. Os resultados variam de pessoa para pessoa e não são garantidos.',
            ],
          },
          {
            h: 'Responsabilidade',
            ps: [
              'Na máxima extensão permitida por lei, a nossa responsabilidade total por qualquer questão relacionada ao produto fica limitada ao valor que você pagou por ele.',
            ],
          },
          {
            h: 'Contato',
            ps: ['Dúvidas sobre estes termos: squeezemethod@gmail.com.'],
          },
        ],
      },
      disclaimer: {
        title: 'Aviso de Isenção Médica',
        sections: [
          {
            h: '',
            ps: [
              'O The Squeeze Method, ou seja, o app e o ebook, é um programa educativo de treino. Ele não fornece aconselhamento médico e não substitui a avaliação, o diagnóstico nem o tratamento de um profissional de saúde.',
            ],
          },
          {
            h: 'Fale antes com um profissional se',
            ps: [
              'Você está grávida ou deu à luz há pouco tempo.',
              'Você passou por cirurgia pélvica ou abdominal.',
              'Você tem diagnóstico de alguma condição do assoalho pélvico, como prolapso ou músculos tensos demais (hipertônicos).',
              'Você sente dor pélvica no dia a dia.',
            ],
          },
          {
            h: 'Durante o treino',
            ps: [
              'Pare se sentir dor. Dor é informação, nunca algo para atravessar na marra.',
              'O treino do assoalho pélvico tem baixo risco quando feito do jeito certo, mas fazer mais do que o programa pede, ou contrair com dor, pode piorar algumas condições.',
            ],
          },
          {
            h: 'Resultados',
            ps: [
              'A melhora vem com prática constante ao longo de semanas, e os resultados variam de pessoa para pessoa. Nenhum resultado específico é prometido.',
            ],
          },
          {
            h: 'Emergências',
            ps: [
              'Se você tiver sintomas repentinos ou fortes, procure atendimento médico. Não use este app para decidir.',
            ],
          },
        ],
      },
    },
  },
}
