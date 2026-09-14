/**
 * Progresso e preferências, em localStorage.
 *
 * Não há conta nem servidor: o escopo fechado é explícito quanto a isso. O
 * progresso vive no aparelho — o que também mantém o app fora do alcance da
 * CCPA, já que nenhum dado pessoal é coletado ou enviado.
 *
 * Toda leitura é defensiva: localStorage lança em aba privada de alguns
 * navegadores e pode voltar com lixo se a usuária trocar de versão do app.
 */
import { DEFAULT_LANGUAGE, type Language } from '../i18n'

/**
 * v2: o programa deixou de ser 7 dias de volume crescente e passou a 6 semanas
 * por postura e tipo de contração. As chaves antigas não têm como migrar, e a
 * troca de versão descarta o progresso anterior em vez de exibir algo errado.
 */
const KEY = 'kegel-pelvic:v2'

export interface Settings {
  sound: boolean
  vibration: boolean
  keepScreenOn: boolean
  language: Language
  /**
   * Ritmo do treino de pulsação: segundos de uma repetição INTEIRA, do começo
   * de um aperto ao começo do próximo. O padrão, 1,05 s, é o que foi medido na
   * gravação de referência. As quatro fases são escaladas proporcionalmente.
   */
  pulseSeconds: number
  /** Tempo sustentando a contração nas semanas 4 a 6. A cliente pediu 5s. */
  holdSeconds: number
}

/**
 * Onde a usuária parou, quando uma sessão foi interrompida.
 *
 * Existe por um motivo concreto: o iOS descarta a página de um app em segundo
 * plano, e o momento em que isso acontece é justamente depois de pausar e
 * largar o telefone. Sem isto, um treino de seis minutos interrompido no meio
 * simplesmente sumia e voltava para a tela inicial.
 *
 * Guarda a SÉRIE, não a repetição: retomar no meio de uma série seria retomar
 * no meio de uma contração. Voltar ao começo da série é honesto e é onde a
 * pessoa consegue reencontrar o ritmo.
 */
export interface ActiveSession {
  week: number
  day: number
  /** Índice do treino dentro do dia por onde a sessão começou. */
  startIndex: number
  /** Série em que parou, base 1. */
  series: number
  /** Instante em que foi salvo, para não oferecer retomar um treino de ontem. */
  updatedAt: number
}

export interface Progress {
  /** Chaves "semana-dia-tipo", ex.: "1-1-strength". Um treino concluído cada. */
  completedWorkouts: string[]
  /** Data ISO (YYYY-MM-DD) de cada dia concluído, para acompanhar a constância. */
  dayCompletedAt: Record<string, string>
  /** A tela "Find the right muscle" já foi aberta. */
  introRead: boolean
  /** Sessão interrompida, se houver. */
  activeSession: ActiveSession | null
  settings: Settings
}

/** Depois disso, retomar não faz sentido: é outro dia, outro treino. */
export const RESUME_MAX_AGE_MS = 12 * 60 * 60 * 1000

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  vibration: true,
  keepScreenOn: true,
  language: DEFAULT_LANGUAGE,
  pulseSeconds: 1.05,
  holdSeconds: 5,
}

const EMPTY: Progress = {
  completedWorkouts: [],
  dayCompletedAt: {},
  introRead: false,
  activeSession: null,
  settings: DEFAULT_SETTINGS,
}

export const workoutKey = (week: number, day: number, type: string) => `${week}-${day}-${type}`
export const dayKey = (week: number, day: number) => `${week}-${day}`

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<Progress>
    return {
      completedWorkouts: Array.isArray(parsed.completedWorkouts) ? parsed.completedWorkouts : [],
      dayCompletedAt:
        parsed.dayCompletedAt && typeof parsed.dayCompletedAt === 'object'
          ? parsed.dayCompletedAt
          : {},
      introRead: parsed.introRead === true,
      activeSession: validSession(parsed.activeSession),
      // Espalhar sobre os padrões: uma preferência nova em versão futura não
      // chega indefinida para quem já tinha dados salvos.
      settings: migrate({ ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) }),
    }
  } catch {
    return { ...EMPTY }
  }
}

/**
 * Uma sessão só vale a pena retomar se for recente e estiver bem formada.
 * Um treino de ontem parado na série 3 não é uma oferta útil, é uma confusão.
 */
function validSession(raw: unknown): ActiveSession | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<ActiveSession>
  if (
    typeof s.week !== 'number' ||
    typeof s.day !== 'number' ||
    typeof s.startIndex !== 'number' ||
    typeof s.series !== 'number' ||
    typeof s.updatedAt !== 'number'
  ) {
    return null
  }
  if (Date.now() - s.updatedAt > RESUME_MAX_AGE_MS) return null
  return s as ActiveSession
}

/**
 * Ajustes salvos antes da mudança de significado de pulseSeconds.
 *
 * Antes o número era a duração de MEIO ciclo (0,35 / 0,5 / 0,75); agora é a
 * repetição inteira (0,8 / 1,05 / 1,4). Sem esta conversão, quem já tinha
 * ajustes salvos veria a pulsação rodar no dobro da velocidade.
 */
function migrate(settings: Settings): Settings {
  if (settings.pulseSeconds < 0.8) {
    const dobro = settings.pulseSeconds * 2
    const opcoes = [0.8, 1.05, 1.4]
    const perto = opcoes.reduce((a, b) => (Math.abs(b - dobro) < Math.abs(a - dobro) ? b : a))
    return { ...settings, pulseSeconds: perto }
  }
  return settings
}

export function save(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Cota estourada ou storage bloqueado. O treino continua funcionando na
    // memória; só não sobrevive ao fechamento. Não vale interromper por isso.
  }
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* idem */
  }
}

export const todayISO = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
