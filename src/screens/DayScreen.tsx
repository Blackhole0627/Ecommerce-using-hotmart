import { IconArrowLeft, IconCheck, IconLying, IconPlay, IconSeated, IconStanding } from '../components/icons'
import { useT } from '../i18n'
import { formatDuration, type WeekView } from '../lib/useProgram'
import type { Posture, Style, Workout } from '../types'
import './DayScreen.css'

const POSTURE_ICON: Record<Posture, typeof IconLying> = {
  lying: IconLying,
  seated: IconSeated,
  standing: IconStanding,
}

interface Props {
  week: WeekView
  day: number
  isWorkoutDone: (week: number, day: number, type: string) => boolean
  estimateSeconds: (workout: Workout, style: Style) => number
  holdSeconds: number
  onStart: (workoutIndex: number) => void
  onBack: () => void
}

export function DayScreen({
  week,
  day,
  isWorkoutDone,
  estimateSeconds,
  holdSeconds,
  onStart,
  onBack,
}: Props) {
  const t = useT()
  const PostureIcon = POSTURE_ICON[week.posture]
  const postureHint = t.posture[`${week.posture}Hint` as const]

  return (
    <div className="screen day">
      <header className="day__header">
        <button className="icon-btn icon-btn--filled" onClick={onBack} aria-label={t.common.back}>
          <IconArrowLeft />
        </button>
        <span className="day__eyebrow">
          {t.common.week} {week.week} · {t.common.day} {day}
        </span>
      </header>

      <div className="screen__body">
        <h1 className="day__title">{t.posture[week.posture]}</h1>

        <div className="day__badges">
          <span className="badge badge--teal">{t.style[week.style]}</span>
        </div>

        {/*
          A postura é a instrução mais importante da tela: nas semanas 1-3 o
          treino é literalmente o mesmo, e só a posição muda. Por isso ela vem
          antes dos números, com o desenho e o texto de como se posicionar.
        */}
        <section className="posture">
          <span className="posture__icon" aria-hidden="true">
            <PostureIcon width={26} height={26} />
          </span>
          <p className="posture__hint">{postureHint}</p>
        </section>

        <h2 className="day__section-title">{t.home.yourProgram}</h2>

        <div className="day__workouts">
          {week.workouts.map((workout, index) => {
            const done = isWorkoutDone(week.week, day, workout.type)
            const seconds = estimateSeconds(workout, week.style)
            const isHold = workout.type === 'strength' && week.style === 'hold'

            const tips = isHold
              ? t.workout.tips.strengthHold
              : workout.type === 'strength'
                ? t.workout.tips.strengthQuick
                : t.workout.tips.pulse

            return (
              <article key={workout.type} className={`workout${done ? ' workout--done' : ''}`}>
                <div className="workout__head">
                  <h3 className="workout__title">{t.workout[workout.type]}</h3>
                  {done && (
                    <span className="workout__done" aria-label={t.workout.doneLabel}>
                      <IconCheck width={16} height={16} />
                    </span>
                  )}
                </div>

                <dl className="workout__stats">
                  <div>
                    <dt>{t.workout.sets}</dt>
                    <dd>{workout.series}</dd>
                  </div>
                  <div>
                    <dt>{t.workout.reps}</dt>
                    <dd>{workout.reps}</dd>
                  </div>
                  {isHold ? (
                    <div>
                      <dt>{t.workout.hold}</dt>
                      <dd>
                        {holdSeconds}
                        {t.common.second}
                      </dd>
                    </div>
                  ) : (
                    <div>
                      <dt>{t.workout.rest}</dt>
                      <dd>
                        {workout.restSeconds}
                        {t.common.second}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>{t.workout.duration}</dt>
                    <dd>{formatDuration(seconds, t.common.minute, t.common.second)}</dd>
                  </div>
                </dl>

                <ul className="workout__tips">
                  {tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>

                <button className="btn btn--primary" onClick={() => onStart(index)}>
                  <IconPlay width={18} height={18} />
                  {done ? t.workout.repeat : t.workout.start}
                </button>
              </article>
            )
          })}
        </div>

        <p className="day__note">{t.workout.bothNote}</p>
      </div>
    </div>
  )
}
