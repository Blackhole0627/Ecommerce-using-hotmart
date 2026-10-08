/**
 * O progresso sincronizado e a regra de juncao entre duas copias dele.
 *
 * Este arquivo e importado pelos DOIS lados: pelo servidor (api/account.ts) e
 * pelo app (src/lib/sync.ts). E de proposito: se o celular e o servidor
 * juntassem de jeitos diferentes, duas copias nunca convergiriam. Por isso
 * aqui nao entra nada de navegador nem de Node, so funcoes puras.
 *
 * A regra, em duas linhas:
 *
 *   mesma "era"   -> uniao: um treino concluido em qualquer aparelho vale
 *   eras diferentes -> vence a mais nova inteira: "recomecar o programa"
 *                      num aparelho zera os outros, em vez de ser desfeito
 *                      pela uniao na proxima sincronizacao
 *
 * Uniao porque concluir treino so acumula: nao existe "desconcluir". Com isso
 * dois aparelhos que salvam ao mesmo tempo nao perdem nada; o pior caso e um
 * treino aparecer no outro aparelho uma sincronizacao depois.
 */

export interface SyncedSettings {
  sound: boolean
  vibration: boolean
  keepScreenOn: boolean
  language: 'en' | 'pt'
  pulseSeconds: number
  holdSeconds: number
}

export interface SyncedProgress {
  /** Sobe a cada "recomecar o programa". Ver a regra no topo. */
  epoch: number
  completedWorkouts: string[]
  dayCompletedAt: Record<string, string>
  introRead: boolean
  /** Null quando o aparelho nunca mexeu nos ajustes: ai vale o do outro lado. */
  settings: SyncedSettings | null
  /** Quando os ajustes mudaram: entre dois aparelhos, vence o ajuste mais recente. */
  settingsUpdatedAt: number
}

/** Limites que tambem barram lixo enviado de proposito para o servidor. */
const MAX_WORKOUTS = 400
const WORKOUT_KEY = /^\d{1,2}-\d{1,2}-(strength|pulse)$/
const DAY_KEY = /^\d{1,2}-\d{1,2}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Chaves em ordem fixa: duas copias iguais tem de virar o mesmo texto. */
const sortedDays = (days: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(days).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)))

const finite = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null

export function sanitizeSettings(raw: unknown): SyncedSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const pulse = finite(s.pulseSeconds, 0.3, 3)
  const hold = finite(s.holdSeconds, 1, 20)
  if (
    typeof s.sound !== 'boolean' ||
    typeof s.vibration !== 'boolean' ||
    typeof s.keepScreenOn !== 'boolean' ||
    (s.language !== 'en' && s.language !== 'pt') ||
    pulse === null ||
    hold === null
  ) {
    return null
  }
  return {
    sound: s.sound,
    vibration: s.vibration,
    keepScreenOn: s.keepScreenOn,
    language: s.language,
    pulseSeconds: pulse,
    holdSeconds: hold,
  }
}

/**
 * Aceita qualquer coisa e devolve um progresso bem formado. O que nao passar
 * no formato e descartado item a item, nao o documento inteiro: uma chave
 * estranha nao pode custar o progresso legitimo que vem junto.
 */
export function sanitizeProgress(raw: unknown): SyncedProgress {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const workouts = Array.isArray(p.completedWorkouts)
    ? [...new Set(p.completedWorkouts.filter((k): k is string => typeof k === 'string' && WORKOUT_KEY.test(k)))]
    : []

  const days: Record<string, string> = {}
  if (p.dayCompletedAt && typeof p.dayCompletedAt === 'object') {
    for (const [k, v] of Object.entries(p.dayCompletedAt as Record<string, unknown>)) {
      if (DAY_KEY.test(k) && typeof v === 'string' && ISO_DATE.test(v)) days[k] = v
    }
  }

  return {
    epoch: finite(p.epoch, 0, 1e6) ?? 0,
    completedWorkouts: workouts.slice(0, MAX_WORKOUTS).sort(),
    dayCompletedAt: sortedDays(days),
    introRead: p.introRead === true,
    settings: sanitizeSettings(p.settings),
    settingsUpdatedAt: finite(p.settingsUpdatedAt, 0, 1e15) ?? 0,
  }
}

/** Junta duas copias. Simetrica: merge(a, b) e merge(b, a) dao o mesmo resultado. */
export function mergeProgress(a: SyncedProgress, b: SyncedProgress): SyncedProgress {
  if (a.epoch !== b.epoch) return a.epoch > b.epoch ? a : b

  const days: Record<string, string> = { ...a.dayCompletedAt }
  for (const [k, v] of Object.entries(b.dayCompletedAt)) {
    // A data mais antiga vence: e quando o dia foi concluido pela primeira vez.
    if (!days[k] || v < days[k]) days[k] = v
  }

  // Empate de horario e decidido pelo conteudo, para a juncao continuar
  // simetrica mesmo nesse caso raro.
  const newerSettings =
    a.settingsUpdatedAt !== b.settingsUpdatedAt
      ? a.settingsUpdatedAt > b.settingsUpdatedAt
        ? a
        : b
      : JSON.stringify(a.settings) >= JSON.stringify(b.settings)
        ? a
        : b

  return {
    epoch: a.epoch,
    completedWorkouts: [...new Set([...a.completedWorkouts, ...b.completedWorkouts])]
      .sort()
      .slice(0, MAX_WORKOUTS),
    dayCompletedAt: sortedDays(days),
    introRead: a.introRead || b.introRead,
    settings: newerSettings.settings ?? (newerSettings === a ? b.settings : a.settings),
    settingsUpdatedAt: Math.max(a.settingsUpdatedAt, b.settingsUpdatedAt),
  }
}

/** Duas copias sao iguais? Usado para nao gravar nem reenviar o que nao mudou. */
export const sameProgress = (a: SyncedProgress, b: SyncedProgress): boolean =>
  JSON.stringify(a) === JSON.stringify(b)
