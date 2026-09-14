/**
 * Verificação do motor do treino, sem navegador.
 *
 * Simula requestAnimationFrame e performance.now em tempo virtual, com quadros
 * irregulares e uma janela longa de tela congelada, e confere que a contagem
 * de séries e repetições sai exata e que o tempo total não deriva.
 *
 * Cobre os dois tipos de semana: contração rápida (1-3) e sustentada (4-6).
 *
 * Uso: node scripts/verify-engine.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const program = JSON.parse(readFileSync(resolve(here, '../src/data/program.json'), 'utf8'))

// --- Relógio virtual -------------------------------------------------------

let now = 0
let callbacks = []

globalThis.performance = { now: () => now }
globalThis.requestAnimationFrame = (fn) => {
  callbacks.push(fn)
  return callbacks.length
}
globalThis.cancelAnimationFrame = () => {
  callbacks = []
}

/** Avança o relógio em passos de `step` ms até cobrir `ms`. */
function advance(ms, step) {
  const target = now + ms
  while (now < target) {
    now = Math.min(now + step, target)
    const pending = callbacks
    callbacks = []
    for (const fn of pending) fn()
  }
}

// engine.ts é TypeScript. Compilado aqui com o esbuild que já vem com o Vite,
// em vez de tirar os tipos na mão com expressão regular — o motor é a peça
// mais delicada do app e não faz sentido testá-lo através de um tradutor
// improvisado que pode engasgar num tipo de união e mascarar um problema real.
const { transform } = await import('esbuild')
const source = readFileSync(resolve(here, '../src/lib/engine.ts'), 'utf8')
const { code } = await transform(source, { loader: 'ts', format: 'esm', target: 'node18' })
const { SessionEngine } = await import(
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
)

// --- Casos -----------------------------------------------------------------

let failures = 0
const check = (label, actual, expected, tolerance = 0) => {
  const ok = Math.abs(actual - expected) <= tolerance
  if (!ok) failures++
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${label}: ${actual}${ok ? '' : ` (esperado ${expected})`}`)
}

let longest = { label: '', seconds: 0 }

for (const week of program.weeks) {
  for (const workout of week.workouts) {
    const timing = {
      contractMs: workout.contractSeconds * 1000,
      holdMs: workout.holdSeconds * 1000,
      releaseMs: workout.releaseSeconds * 1000,
      relaxMs: workout.relaxSeconds * 1000,
      restMs: workout.restSeconds * 1000,
    }

    now = 0
    callbacks = []

    let contracts = 0
    let holds = 0
    let releases = 0
    let relaxes = 0
    let rests = 0
    let doneAt = null

    const engine = new SessionEngine([{ workout, timing }], {
      onChange: () => {},
      onTick: () => {},
      onWorkoutDone: () => {},
      onCue: (cue) => {
        if (cue === 'contract') contracts++
        if (cue === 'hold') holds++
        if (cue === 'release') releases++
        if (cue === 'relax') relaxes++
        if (cue === 'rest') rests++
        if (cue === 'done') doneAt = now
      },
    })

    engine.start()

    const repSeconds =
      workout.contractSeconds +
      workout.holdSeconds +
      workout.releaseSeconds +
      workout.relaxSeconds
    const expectedTotal =
      3 + workout.series * workout.reps * repSeconds + (workout.series - 1) * workout.restSeconds

    // Quadros irregulares (13ms, ~75fps) para não coincidir com as durações.
    advance(4000, 13)
    // Tela congelada: 8 segundos sem nenhum quadro, como quando o app vai para
    // segundo plano. O motor tem que recuperar todas as fases vencidas.
    now += 8000
    advance((expectedTotal + 5) * 1000, 17)

    const label = `semana ${week.week} (${week.posture}/${week.style}) ${workout.type} ${workout.series}x${workout.reps}`
    console.log(`\n${label}`)

    const expectedReps = workout.series * workout.reps
    check('contrações', contracts, expectedReps)
    check('sustentações', holds, workout.holdSeconds ? expectedReps : 0)
    check('solturas', releases, expectedReps)
    check('relaxamentos', relaxes, workout.relaxSeconds ? expectedReps : 0)
    check('descansos', rests, workout.series - 1)
    // Tolerância de um quadro: o término cai no primeiro quadro após o instante
    // teórico, nunca depois disso, por mais longa que seja a sessão.
    check(
      'duração total (s)',
      doneAt === null ? -1 : +(doneAt / 1000).toFixed(2),
      expectedTotal,
      0.02,
    )

    if (expectedTotal > longest.seconds) longest = { label, seconds: expectedTotal }
  }
}

// --- Pausa -----------------------------------------------------------------

console.log('\npausa e retomada')
{
  const workout = { type: 'strength', series: 2, reps: 3, restSeconds: 10 }
  const timing = { contractMs: 1000, holdMs: 0, releaseMs: 1000, relaxMs: 0, restMs: 10000 }
  now = 0
  callbacks = []

  let contracts = 0
  let doneAt = null
  const engine = new SessionEngine([{ workout, timing }], {
    onChange: () => {},
    onTick: () => {},
    onWorkoutDone: () => {},
    onCue: (c) => {
      if (c === 'contract') contracts++
      if (c === 'done') doneAt = now
    },
  })
  engine.start()

  advance(6000, 16)
  engine.pause()
  now += 30000 // meia hora parada não deve virar tempo de treino
  engine.resume()
  advance(40000, 16)

  check('contrações', contracts, 6)
  // 3s prep + 6 reps x 2s + 1 descanso de 10s = 25s de treino, + 30s parada.
  check('duração incluindo a pausa (s)', +(doneAt / 1000).toFixed(2), 55, 0.02)
}

// --- Sequência do dia: força emenda na pulsação sem toque ------------------

console.log('\nsequência do dia (força → pulsação), sem toque no meio')
{
  const semana = program.weeks[0]
  const steps = semana.workouts.map((w) => ({
    workout: w,
    timing: {
      contractMs: w.contractSeconds * 1000,
      holdMs: w.holdSeconds * 1000,
      releaseMs: w.releaseSeconds * 1000,
      relaxMs: w.relaxSeconds * 1000,
      restMs: w.restSeconds * 1000,
    },
  }))

  now = 0
  callbacks = []
  const concluidos = []
  let doneAt = null
  let preps = 0

  const engine = new SessionEngine(steps, {
    onChange: (st) => {
      if (st.phase === 'prep' && !preps) preps = 1
    },
    onTick: () => {},
    onWorkoutDone: (i) => concluidos.push(i),
    onCue: (c) => {
      if (c === 'done') doneAt = now
    },
  })
  engine.start()

  const dur = (st) =>
    3 +
    st.workout.series * st.workout.reps *
      ((st.timing.contractMs + st.timing.holdMs + st.timing.releaseMs + st.timing.relaxMs) / 1000) +
    (st.workout.series - 1) * (st.timing.restMs / 1000)

  // forca + ponte de descanso + prep + pulsacao
  const esperado =
    dur(steps[0]) + steps[0].workout.restSeconds + 3 + (dur(steps[1]) - 3)

  advance(4000, 13)
  now += 8000 // tela congelada no meio, como quando o app vai para 2o plano
  advance((esperado + 10) * 1000, 17)

  check('os dois treinos terminaram', concluidos.length, 2)
  check('na ordem certa (força, depois pulsação)', concluidos.join(',') === '0,1' ? 1 : 0, 1)
  check('a sessão inteira terminou (s)', doneAt === null ? -1 : +(doneAt / 1000).toFixed(2), esperado, 0.02)
  const m2 = Math.floor(esperado / 60)
  console.log(`  (sessão do dia: ${m2}min ${Math.round(esperado % 60)}s, sem nenhum toque)`)
}

// --- Retomada de uma sessão interrompida -----------------------------------

console.log('\nretomada: começar pela série em que parou')
{
  const workout = { type: 'strength', series: 5, reps: 10, restSeconds: 45 }
  const timing = { contractMs: 400, holdMs: 1600, releaseMs: 400, relaxMs: 1600, restMs: 45000 }
  now = 0
  callbacks = []
  let contracoes = 0
  let doneAt = null
  const engine = new SessionEngine([{ workout, timing }], {
    onChange: () => {},
    onTick: () => {},
    onWorkoutDone: () => {},
    onCue: (c) => {
      if (c === 'contract') contracoes++
      if (c === 'done') doneAt = now
    },
  })
  engine.start(4) // parou na série 4 de 5
  advance(400 * 1000, 17)

  // Restam as séries 4 e 5: 2 x 10 repetições e um descanso entre elas.
  check('repetições restantes', contracoes, 20)
  check('duração do que restou (s)', +(doneAt / 1000).toFixed(2), 3 + 20 * 4 + 45, 0.02)
}

// --- Sessão mais longa do programa -----------------------------------------

const m = Math.floor(longest.seconds / 60)
const s = Math.round(longest.seconds % 60)
console.log(`\nTreino mais longo: ${longest.label} — ${m}min ${s}s`)
console.log('(é o que justifica o wake lock; ver README)')

// --- Ritmo, contra a medição da gravação de referência ---------------------
//
// Medido quadro a quadro na gravação: a bolinha sobe, fica ~1,6s em cima,
// desce e fica ~1,6s embaixo — 4,0s por repetição, e 40s para uma série de
// dez. Este caso existe para que uma mudança de ritmo nunca passe despercebida:
// se alguém mexer nos tempos do JSON, a conta quebra aqui.
console.log('\nritmo contra a gravação de referência')
const quick = program.weeks.find((w) => w.style === 'quick').workouts[0]
const cycle =
  quick.contractSeconds + quick.holdSeconds + quick.releaseSeconds + quick.relaxSeconds
check('segundos por repetição (semanas 1-3)', +cycle.toFixed(2), 4.0, 0.001)
check('duração de uma série de 10 (s)', +(quick.reps * cycle).toFixed(1), 40.0, 0.001)
check('sustentação das semanas 4-6 (s)', program.weeks.find((w) => w.style === 'hold').workouts[0].holdSeconds, 5)

// A pulsação também foi medida: aperto curto, pausa longa, 1,05s ao todo.
// O formato importa tanto quanto o total — metade aperto e metade pausa seria
// o mesmo 1,05s e continuaria errado.
const pulse = program.weeks[0].workouts[1]
const pulseCycle =
  pulse.contractSeconds + pulse.holdSeconds + pulse.releaseSeconds + pulse.relaxSeconds
check('segundos por repetição (pulsação)', +pulseCycle.toFixed(2), 1.05, 0.001)
check(
  'fração da repetição em repouso',
  +(pulse.relaxSeconds / pulseCycle).toFixed(2),
  0.52,
  0.02,
)

console.log(
  failures === 0 ? '\nTodos os casos passaram.' : `\n${failures} verificação(ões) falharam.`,
)
process.exit(failures === 0 ? 0 : 1)
