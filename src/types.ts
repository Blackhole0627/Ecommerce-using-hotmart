export type WorkoutType = 'strength' | 'pulse'

/** Postura da semana. É o eixo principal de progressão do programa. */
export type Posture = 'lying' | 'seated' | 'standing'

/** Tipo de contração: rápida (semanas 1-3) ou sustentada (semanas 4-6). */
export type Style = 'quick' | 'hold'

/**
 * Uma repetição tem quatro tempos, medidos do app de referência:
 *
 *   contract → hold → release → relax
 *   sobe       segura  desce     descansa
 *   0,4s       1,6s    0,4s      1,6s      = 4,0s por repetição
 *
 * O movimento não é um vaivém contínuo. A bolinha sobe rápido, FICA PARADA em
 * cima, desce rápido e FICA PARADA embaixo. São as duas paradas que tornam a
 * repetição contável — e que são o exercício em si: a contração é sustentada,
 * não um toque de passagem.
 */
export interface Workout {
  type: WorkoutType
  series: number
  reps: number
  restSeconds: number
  /** Tempo da subida, do relaxamento até a contração completa. */
  contractSeconds: number
  /** Tempo segurando a contração no topo. */
  holdSeconds: number
  /** Tempo da descida. */
  releaseSeconds: number
  /** Tempo relaxada embaixo, antes da próxima repetição. */
  relaxSeconds: number
}

export interface Week {
  week: number
  posture: Posture
  style: Style
  workouts: Workout[]
}

export interface Program {
  version: number
  note: string
  daysPerWeek: number
  weeks: Week[]
}

/** Fases da máquina de estados da execução. */
export type Phase =
  | 'prep' // contagem regressiva antes da primeira série
  | 'contract' // SQUEEZE — subindo
  | 'hold' // HOLD — sustentando no topo
  | 'release' // RELEASE — descendo
  | 'relax' // relaxada embaixo, entre uma repetição e a próxima
  | 'rest' // descanso entre séries
  | 'done' // treino concluído

export interface SessionState {
  /** Qual treino da sequência do dia está rodando (0 = força, 1 = pulsação). */
  stepIndex: number
  phase: Phase
  /** Série atual, base 1. */
  series: number
  /** Repetição atual dentro da série, base 1. */
  rep: number
  paused: boolean
  /** Duração da fase atual, em milissegundos. */
  phaseDurationMs: number
}
