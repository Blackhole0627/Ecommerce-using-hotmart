import type { Phase, SessionState, Workout } from '../types'

export interface EngineTick {
  phase: Phase
  /** 0 -> 1 dentro da fase atual. */
  progress: number
  /** Milissegundos restantes na fase atual. */
  remainingMs: number
}

export type Cue = 'contract' | 'hold' | 'release' | 'relax' | 'rest' | 'restEnding' | 'done'

export interface Timing {
  /** Subida. */
  contractMs: number
  /** Sustentação no topo. */
  holdMs: number
  /** Descida. */
  releaseMs: number
  /** Parada embaixo, antes da próxima repetição. */
  relaxMs: number
  /** Descanso entre séries. */
  restMs: number
}

/** Um treino da sessão, já com as durações resolvidas. */
export interface SessionStep {
  workout: Workout
  timing: Timing
}

export interface EngineEvents {
  /** Transição discreta (fase, série, repetição ou treino mudou). Vai para o React. */
  onChange: (state: SessionState) => void
  /** Quadro de animação. NÃO vai para o React: escreve direto no DOM. */
  onTick: (tick: EngineTick) => void
  /** Momento exato de uma transição, para som e vibração. */
  onCue: (cue: Cue) => void
  /**
   * Um treino da sequência terminou. Serve para gravar o progresso na hora,
   * e não só no fim da sessão inteira: se o app for descartado no meio do
   * segundo treino, o primeiro já está salvo.
   */
  onWorkoutDone: (stepIndex: number) => void
}

/**
 * Motor da sessão.
 *
 * Roda a SEQUÊNCIA de treinos do dia, não um treino só. O treino de força
 * emenda no de pulsação sozinho — descanso, um "prepare-se" curto e segue —
 * porque é assim no app de referência e é assim que a cliente descreveu:
 * "5 séries de 10 [...] logo em seguida o de pulsação". Parar no meio e pedir
 * um toque quebra a sessão justamente quando ela está com o telefone longe.
 *
 * Duas decisões sustentam o resto:
 *
 * 1. O tempo nunca é acumulado somando intervalos. Cada fase guarda o instante
 *    em que deveria ter começado, e o próximo início é "início + duração", não
 *    "agora". O atraso de um quadro não vira dívida do quadro seguinte, então
 *    uma sessão de dez minutos termina no segundo em que deveria terminar.
 *
 * 2. Só transições discretas viram estado do React. O movimento contínuo da
 *    bolinha sai por onTick e é escrito direto no DOM.
 */
export class SessionEngine {
  /** Contagem regressiva antes da primeira série, em milissegundos. */
  static readonly PREP_MS = 3000
  /** A partir de quanto tempo restante avisar que o descanso vai acabar. */
  static readonly REST_ENDING_MS = 3000

  private readonly steps: SessionStep[]
  private readonly events: EngineEvents

  private stepIndex = 0
  private phase: Phase = 'prep'
  private series = 1
  private rep = 1
  private paused = false

  /** Instante teórico de início da fase, na escala de performance.now(). */
  private phaseStart = 0
  private phaseDuration = 0
  private rafId: number | null = null
  /** Instante em que o usuário pausou, para deslocar phaseStart ao retomar. */
  private pausedAt = 0
  /** Evita repetir o aviso de "descanso acabando" dentro do mesmo descanso. */
  private restEndingFired = false
  /** O descanso corrente é a ponte para o próximo treino, não entre séries. */
  private bridging = false

  constructor(steps: SessionStep[], events: EngineEvents) {
    this.steps = steps
    this.events = events
  }

  private get workout(): Workout {
    return this.steps[this.stepIndex].workout
  }

  private get timing(): Timing {
    return this.steps[this.stepIndex].timing
  }

  /** `startSeries` retoma uma sessão interrompida no começo da série em que parou. */
  start(startSeries = 1) {
    this.stepIndex = 0
    this.phase = 'prep'
    this.series = Math.min(Math.max(1, startSeries), this.steps[0].workout.series)
    this.rep = 1
    this.paused = false
    this.beginPhase('prep', performance.now())
    this.loop()
  }

  pause() {
    if (this.paused || this.phase === 'done') return
    this.paused = true
    this.pausedAt = performance.now()
    this.stopLoop()
    this.emitChange()
  }

  resume() {
    if (!this.paused || this.phase === 'done') return
    // Desloca o início teórico pelo tempo parado: a fase continua de onde
    // estava, em vez de reiniciar ou de engolir o tempo em pausa.
    this.phaseStart += performance.now() - this.pausedAt
    this.paused = false
    this.emitChange()
    this.loop()
  }

  stop() {
    this.stopLoop()
  }

  get state(): SessionState {
    return {
      stepIndex: this.stepIndex,
      phase: this.phase,
      series: this.series,
      rep: this.rep,
      paused: this.paused,
      phaseDurationMs: this.phaseDuration,
    }
  }

  private durationFor(phase: Phase): number {
    switch (phase) {
      case 'prep':
        return SessionEngine.PREP_MS
      case 'contract':
        return this.timing.contractMs
      case 'hold':
        return this.timing.holdMs
      case 'release':
        return this.timing.releaseMs
      case 'relax':
        return this.timing.relaxMs
      case 'rest':
        return this.timing.restMs
      case 'done':
        return 0
    }
  }

  private beginPhase(phase: Phase, at: number) {
    this.phase = phase
    this.phaseStart = at
    this.phaseDuration = this.durationFor(phase)
    if (phase === 'rest') this.restEndingFired = false
    if (phase !== 'prep') this.events.onCue(phase)
    this.emitChange()
  }

  /**
   * Decide a próxima fase. "at" é o instante TEÓRICO da virada, não "now" —
   * é isso que impede o desvio de se acumular ao longo da sessão.
   */
  private advance(at: number) {
    switch (this.phase) {
      case 'prep':
        this.beginPhase('contract', at)
        return

      case 'contract':
        this.beginPhase(this.timing.holdMs > 0 ? 'hold' : 'release', at)
        return

      case 'hold':
        this.beginPhase('release', at)
        return

      case 'release':
        // A repetição ainda não acabou: falta o tempo relaxada embaixo.
        if (this.timing.relaxMs > 0) {
          this.beginPhase('relax', at)
          return
        }
        this.finishRep(at)
        return

      case 'relax':
        this.finishRep(at)
        return

      case 'rest':
        if (this.bridging) {
          // Fim da ponte entre um treino e o outro: entra o próximo com um
          // "prepare-se" curto, exatamente como na gravação de referência.
          this.bridging = false
          this.stepIndex += 1
          this.series = 1
          this.rep = 1
          this.beginPhase('prep', at)
          return
        }
        this.beginPhase('contract', at)
        return

      case 'done':
        return
    }
  }

  /** Fecha a repetição corrente e decide o que vem depois. */
  private finishRep(at: number) {
    if (this.rep < this.workout.reps) {
      this.rep += 1
      this.beginPhase('contract', at)
      return
    }
    // Série concluída.
    if (this.series < this.workout.series) {
      this.series += 1
      this.rep = 1
      // Sem descanso configurado, emenda direto na próxima série.
      this.beginPhase(this.timing.restMs > 0 ? 'rest' : 'contract', at)
      return
    }
    // Treino concluído. Grava agora, antes de qualquer coisa mais acontecer.
    this.events.onWorkoutDone(this.stepIndex)

    if (this.stepIndex < this.steps.length - 1) {
      // Ainda há treino pela frente: descansa e emenda, sem pedir toque.
      if (this.timing.restMs > 0) {
        this.bridging = true
        this.beginPhase('rest', at)
      } else {
        this.stepIndex += 1
        this.series = 1
        this.rep = 1
        this.beginPhase('prep', at)
      }
      return
    }

    // Última repetição do último treino: a sessão acabou.
    this.beginPhase('done', at)
    this.stopLoop()
  }

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop)
    const now = performance.now()

    let elapsed = now - this.phaseStart

    // "while", não "if": se a tela apagou ou a aba foi para segundo plano, o
    // rAF congela e uma volta pode cobrir várias fases vencidas de uma vez.
    let guard = 0
    while (elapsed >= this.phaseDuration && this.phase !== 'done' && guard++ < 100000) {
      this.advance(this.phaseStart + this.phaseDuration)
      elapsed = now - this.phaseStart
    }

    if (this.phase === 'done') {
      this.stopLoop()
      this.events.onTick({ phase: 'done', progress: 1, remainingMs: 0 })
      return
    }

    const remainingMs = this.phaseDuration - elapsed

    if (
      this.phase === 'rest' &&
      !this.restEndingFired &&
      remainingMs <= SessionEngine.REST_ENDING_MS
    ) {
      this.restEndingFired = true
      this.events.onCue('restEnding')
    }

    this.events.onTick({
      phase: this.phase,
      progress: this.phaseDuration > 0 ? Math.min(1, elapsed / this.phaseDuration) : 1,
      remainingMs: Math.max(0, remainingMs),
    })
  }

  private stopLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private emitChange() {
    this.events.onChange(this.state)
  }
}
