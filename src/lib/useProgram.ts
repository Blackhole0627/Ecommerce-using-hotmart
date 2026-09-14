import { useCallback, useEffect, useMemo, useState } from 'react'
import programJson from '../data/program.json'
import type { Program, Style, Week, Workout } from '../types'
import type { Timing } from './engine'
import {
  DEFAULT_SETTINGS,
  load,
  save,
  reset as resetStorage,
  todayISO,
  workoutKey,
  type Progress,
  type Settings,
} from './storage'

const program = programJson as Program

export type Status = 'locked' | 'available' | 'done'

export interface DayView {
  week: number
  day: number
  status: Status
  /** Quantos dos treinos do dia já foram concluídos. */
  completedWorkouts: number
}

export interface WeekView extends Week {
  status: Status
  days: DayView[]
  completedDays: number
}

export function useProgram() {
  const [progress, setProgress] = useState<Progress>(() => load())

  useEffect(() => {
    save(progress)
  }, [progress])

  const isWorkoutDone = useCallback(
    (week: number, day: number, type: string) =>
      progress.completedWorkouts.includes(workoutKey(week, day, type)),
    [progress.completedWorkouts],
  )

  const daysPerWeek = program.daysPerWeek

  /**
   * Progressão em dois níveis.
   *
   * Dentro da semana, o dia seguinte abre ao concluir o anterior. Entre
   * semanas, a semana seguinte abre quando todos os dias da anterior fecharam.
   *
   * Isso importa mais neste programa do que no anterior: as semanas não são
   * variações de volume, são a MESMA série em posturas cada vez mais difíceis.
   * Pular direto para "em pé" sem ter firmado o movimento deitada é justamente
   * o caminho para treinar o músculo errado.
   */
  const weeks: WeekView[] = useMemo(() => {
    let previousWeekDone = true

    return program.weeks.map((week) => {
      const days: DayView[] = []
      let previousDayDone = true
      let completedDays = 0

      for (let day = 1; day <= daysPerWeek; day++) {
        const completedWorkouts = week.workouts.filter((w) =>
          isWorkoutDone(week.week, day, w.type),
        ).length
        const dayDone = completedWorkouts === week.workouts.length
        if (dayDone) completedDays++

        const status: Status = !previousWeekDone
          ? 'locked'
          : dayDone
            ? 'done'
            : previousDayDone
              ? 'available'
              : 'locked'

        days.push({ week: week.week, day, status, completedWorkouts })
        previousDayDone = dayDone
      }

      const weekDone = completedDays === daysPerWeek
      const status: Status = weekDone ? 'done' : previousWeekDone ? 'available' : 'locked'
      previousWeekDone = weekDone

      return { ...week, status, days, completedDays }
    })
  }, [isWorkoutDone, daysPerWeek])

  const completeWorkout = useCallback(
    (week: number, day: number, type: string) => {
      setProgress((prev) => {
        const key = workoutKey(week, day, type)
        if (prev.completedWorkouts.includes(key)) return prev

        const completedWorkouts = [...prev.completedWorkouts, key]

        const weekDef = program.weeks.find((w) => w.week === week)
        const dayNowDone =
          weekDef?.workouts.every((w) => completedWorkouts.includes(workoutKey(week, day, w.type))) ??
          false

        return {
          ...prev,
          completedWorkouts,
          dayCompletedAt: dayNowDone
            ? { ...prev.dayCompletedAt, [`${week}-${day}`]: todayISO() }
            : prev.dayCompletedAt,
        }
      })
    },
    [],
  )

  /** Guarda onde a sessão está, para sobreviver ao app ser descartado. */
  const saveSession = useCallback(
    (week: number, day: number, startIndex: number, series: number) => {
      setProgress((prev) => {
        const a = prev.activeSession
        if (a && a.week === week && a.day === day && a.startIndex === startIndex && a.series === series) {
          return prev
        }
        return {
          ...prev,
          activeSession: { week, day, startIndex, series, updatedAt: Date.now() },
        }
      })
    },
    [],
  )

  /** A sessão acabou, ou a usuária saiu de propósito: não há o que retomar. */
  const clearSession = useCallback(() => {
    setProgress((prev) => (prev.activeSession ? { ...prev, activeSession: null } : prev))
  }, [])

  const markIntroRead = useCallback(() => {
    setProgress((prev) => (prev.introRead ? prev : { ...prev, introRead: true }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setProgress((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  const resetAll = useCallback(() => {
    resetStorage()
    setProgress({
      completedWorkouts: [],
      dayCompletedAt: {},
      introRead: false,
      activeSession: null,
      settings: DEFAULT_SETTINGS,
    })
  }, [])

  const doneWeeks = weeks.filter((w) => w.status === 'done').length
  const totalWorkouts = program.weeks.length * daysPerWeek * 2
  const percent = Math.round((progress.completedWorkouts.length / totalWorkouts) * 100)

  /** Primeiro dia ainda não concluído, em todo o programa. */
  const upNext = useMemo(() => {
    for (const week of weeks) {
      const day = week.days.find((d) => d.status === 'available')
      if (day) return { week, day }
    }
    return null
  }, [weeks])

  /**
   * Converte um treino nas durações que o motor consome, já aplicando as
   * preferências da usuária sobre o ritmo da pulsação e o tempo de sustentação.
   */
  const timingFor = useCallback(
    (workout: Workout, style: Style): Timing => {
      // Pulsação: mesma estrutura de quatro tempos do treino de força, só que
      // muito mais curta — aperto rápido e pausa longa. A preferência define a
      // duração da repetição inteira, e as quatro fases são escaladas na mesma
      // proporção, para o ritmo mudar sem perder o formato medido na gravação.
      if (workout.type === 'pulse') {
        const natural =
          workout.contractSeconds +
          workout.holdSeconds +
          workout.releaseSeconds +
          workout.relaxSeconds
        const escala = (progress.settings.pulseSeconds / natural) * 1000
        return {
          contractMs: workout.contractSeconds * escala,
          holdMs: workout.holdSeconds * escala,
          releaseMs: workout.releaseSeconds * escala,
          relaxMs: workout.relaxSeconds * escala,
          restMs: workout.restSeconds * 1000,
        }
      }

      // Só as semanas 4-6 seguem a preferência de sustentação. Nas semanas 1-3
      // a sustentação é de 1,6s, medida na gravação de referência — deixar a
      // preferência mandar ali transformaria a semana 1 num treino de 5s.
      const holdSeconds = style === 'hold' ? progress.settings.holdSeconds : workout.holdSeconds

      return {
        contractMs: workout.contractSeconds * 1000,
        holdMs: holdSeconds * 1000,
        releaseMs: workout.releaseSeconds * 1000,
        relaxMs: workout.relaxSeconds * 1000,
        restMs: workout.restSeconds * 1000,
      }
    },
    [progress.settings.pulseSeconds, progress.settings.holdSeconds],
  )

  /** Duração estimada de um treino, em segundos. */
  const estimateSeconds = useCallback(
    (workout: Workout, style: Style): number => {
      const t = timingFor(workout, style)
      const repMs = t.contractMs + t.holdMs + t.releaseMs + t.relaxMs
      const workMs = workout.series * workout.reps * repMs
      const restMs = (workout.series - 1) * t.restMs
      return Math.round((workMs + restMs + PREP_MS) / 1000)
    },
    [timingFor],
  )

  /**
   * Sequência de treinos a partir de um índice: é o que o motor consome.
   * Começar pelo treino de força devolve os dois, e eles emendam sozinhos.
   */
  const stepsFrom = useCallback(
    (week: WeekView, startIndex: number) =>
      week.workouts.slice(startIndex).map((workout) => ({
        workout,
        timing: timingFor(workout, week.style),
      })),
    [timingFor],
  )

  return {
    stepsFrom,
    weeks,
    daysPerWeek,
    settings: progress.settings,
    introRead: progress.introRead,
    activeSession: progress.activeSession,
    saveSession,
    clearSession,
    doneWeeks,
    percent,
    upNext,
    isWorkoutDone,
    completeWorkout,
    markIntroRead,
    updateSettings,
    resetAll,
    timingFor,
    estimateSeconds,
  }
}

const PREP_MS = 3000

export function formatDuration(totalSeconds: number, minuteLabel: string, secondLabel: string): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}${secondLabel}`
  return s === 0 ? `${m} ${minuteLabel}` : `${m} ${minuteLabel} ${s}${secondLabel}`
}

export { program }
