import { IconCheck } from '../components/icons'
import { Waves } from '../components/Waves'
import { useT } from '../i18n'
import type { Posture, Workout } from '../types'
import './FinishScreen.css'

interface Props {
  week: number
  day: number
  /** Treinos que a sessão acabou de percorrer — normalmente força e pulsação. */
  workouts: Workout[]
  dayCompleted: boolean
  weekCompleted: boolean
  programCompleted: boolean
  /** Postura da semana que acabou de abrir, quando uma semana foi concluída. */
  nextPosture: Posture | null
  onBackToProgram: () => void
}

export function FinishScreen({
  week,
  day,
  workouts,
  dayCompleted,
  weekCompleted,
  programCompleted,
  nextPosture,
  onBackToProgram,
}: Props) {
  const t = useT()
  // A sessão roda os dois treinos emendados, então o resumo soma os dois.
  const totalSets = workouts.reduce((n, w) => n + w.series, 0)
  const totalReps = workouts.reduce((n, w) => n + w.series * w.reps, 0)

  const title = programCompleted
    ? t.finish.programDone
    : weekCompleted
      ? t.finish.weekDone(week)
      : dayCompleted
        ? t.finish.dayDone(day)
        : t.finish.workoutDone

  const subtitle = programCompleted
    ? t.finish.programDoneBody
    : weekCompleted && nextPosture
      ? t.finish.weekUnlocked(week + 1, t.posture[nextPosture])
      : dayCompleted
        ? t.finish.dayUnlocked(day + 1)
        : workouts.map((w) => t.workout[w.type]).join(' · ')

  return (
    <div className="screen finish">
      <Waves />

      {/* A flor do logo, grande e quase apagada atrás do resumo. É a única
          tela do app onde não há nada a fazer além de comemorar, e é onde a
          marca dela pode aparecer sem atrapalhar o treino. */}
      <img className="finish__bloom" src="/brand/logo-mark.png" alt="" aria-hidden="true" />

      <div className="finish__body">
        <div className="finish__mark" aria-hidden="true">
          <IconCheck width={44} height={44} />
        </div>

        <h1 className="finish__title">{title}</h1>
        <p className="finish__subtitle">{subtitle}</p>

        <dl className="finish__stats">
          <div>
            <dt>{t.finish.sets}</dt>
            <dd>{totalSets}</dd>
          </div>
          <div>
            <dt>{t.finish.totalReps}</dt>
            <dd>{totalReps}</dd>
          </div>
        </dl>

        {/*
          Um botão só. Não há mais "ir para o próximo treino": os dois já
          rodaram emendados, que é como a cliente descreveu e como o app de
          referência faz.
        */}
        <div className="finish__actions">
          <button className="btn btn--primary" onClick={onBackToProgram}>
            {t.finish.backToProgram}
          </button>
        </div>
      </div>
    </div>
  )
}
