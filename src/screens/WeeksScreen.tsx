import { APP } from '../brand'
import {
  IconCheck,
  IconChevronRight,
  IconLock,
  IconLying,
  IconSeated,
  IconSettings,
  IconStanding,
} from '../components/icons'
import { InstallHint } from '../components/InstallHint'
import { useT } from '../i18n'
import type { WeekView } from '../lib/useProgram'
import type { ActiveSession } from '../lib/storage'
import type { Posture } from '../types'
import './WeeksScreen.css'

const POSTURE_ICON: Record<Posture, typeof IconLying> = {
  lying: IconLying,
  seated: IconSeated,
  standing: IconStanding,
}

interface Props {
  weeks: WeekView[]
  daysPerWeek: number
  percent: number
  doneWeeks: number
  introRead: boolean
  upNext: { week: WeekView; day: { week: number; day: number } } | null
  /** Sessão interrompida que ainda vale a pena retomar. */
  resumable: { session: ActiveSession; week: WeekView } | null
  onResume: () => void
  onDiscardResume: () => void
  onOpenIntro: () => void
  onOpenDay: (week: number, day: number) => void
  onOpenSettings: () => void
  onOpenEbook: () => void
}

export function WeeksScreen({
  weeks,
  daysPerWeek,
  percent,
  doneWeeks,
  introRead,
  upNext,
  resumable,
  onResume,
  onDiscardResume,
  onOpenIntro,
  onOpenDay,
  onOpenSettings,
  onOpenEbook,
}: Props) {
  const t = useT()

  return (
    <div className="screen weeks">
      <header className="weeks__header">
        {/*
          O logo da cliente entra como imagem, e não redesenhado em texto: o
          nome e a frase fazem parte do desenho dela, com a letra e o
          espaçamento dela. O <h1> continua existindo para leitores de tela e
          para o título da página — só não é ele que aparece.
        */}
        <h1 className="weeks__brand">
          <img
            className="weeks__logo"
            src="/brand/logo-lockup.png"
            alt={`${APP.name} — ${APP.tagline}`}
            width={621}
            height={485}
          />
        </h1>
        <button className="icon-btn" onClick={onOpenSettings} aria-label={t.common.settings}>
          <IconSettings />
        </button>
      </header>

      {/*
        Enquanto o app estiver rodando pela aba do navegador, o convite para
        instalar fica aqui — fora do corpo rolável, logo abaixo do cabeçalho,
        onde não some ao rolar a lista de semanas.
      */}
      <InstallHint />

      <div className="screen__body">
        {/*
          Sessão interrompida — a PRIMEIRA coisa da tela.

          O iOS descarta a página de um app em segundo plano, e isso acontece
          justo depois de pausar e largar o telefone. Quando a faixa ficava
          abaixo do "Start here", quem voltava batia os olhos na tela inicial e
          concluía, com razão, que o treino tinha sumido. O que a pessoa
          precisa ver primeiro é o caminho de volta.
        */}
        {resumable && (
          <section className="resume">
            <div className="resume__body">
              <span className="resume__eyebrow">{t.home.resumeTitle}</span>
              <span className="resume__where">
                {t.home.resumeWhere(
                  resumable.session.week,
                  resumable.session.day,
                  resumable.session.series,
                  t.workout[
                    resumable.week.workouts[resumable.session.startIndex]?.type ?? 'strength'
                  ],
                )}
              </span>
              <span className="resume__saved">{t.home.savedHere}</span>
            </div>
            <div className="resume__actions">
              <button className="btn btn--primary resume__go" onClick={onResume}>
                {t.home.resumeCta}
              </button>
              <button className="btn btn--quiet resume__drop" onClick={onDiscardResume}>
                {t.home.resumeDiscard}
              </button>
            </div>
          </section>
        )}

        {/*
          "Start here" fica no topo, antes do programa — a cliente pediu que
          identificar o músculo certo abrisse o app. Enquanto não for aberto,
          o card aparece destacado; depois vira uma linha discreta.
        */}
        <button
          className={`start-here${introRead ? ' start-here--read' : ''}`}
          onClick={onOpenIntro}
        >
          <span className="start-here__body">
            <span className="start-here__eyebrow">{t.home.startHere}</span>
            <span className="start-here__title">{t.intro.title}</span>
          </span>
          {introRead ? (
            <span className="badge badge--teal">{t.intro.done}</span>
          ) : (
            <span className="start-here__chevron" aria-hidden="true">
              <IconChevronRight />
            </span>
          )}
        </button>

        <section className="card weeks__progress" aria-label={t.home.progressTitle}>
          <div className="weeks__progress-top">
            <strong>{t.home.weeksDone(doneWeeks, weeks.length)}</strong>
            <span>{t.home.percentDone(percent)}</span>
          </div>
          <div
            className="weeks__bar"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="weeks__progress-hint">
            {upNext ? t.home.upNext(upNext.day.week, upNext.day.day) : t.home.allDone}
          </p>
          {/* "Salvo onde?" foi pergunta literal da cliente. A resposta fica
              onde o progresso aparece, e não só enterrada em Ajustes — mas
              não duas vezes na mesma tela: com o treino interrompido em cima,
              a faixa de retomar já respondeu. */}
          {!resumable && <p className="weeks__progress-saved">{t.home.savedHere}</p>}
        </section>

        {/*
          O ebook, na mesma linguagem discreta do "Start here" já lido: a
          compra é "app + ebook", então o livro precisa de uma porta na tela
          inicial — só em Ajustes ninguém acharia.
        */}
        <button className="start-here start-here--read" onClick={onOpenEbook}>
          <span className="start-here__body">
            <span className="start-here__eyebrow">{t.ebook.homeEyebrow}</span>
            <span className="start-here__title">{t.ebook.homeTitle}</span>
          </span>
          <span className="start-here__chevron" aria-hidden="true">
            <IconChevronRight />
          </span>
        </button>

        <h2 className="weeks__section-title">{t.home.yourProgram}</h2>

        <ol className="weeks__list">
          {weeks.map((week) => {
            const locked = week.status === 'locked'
            const PostureIcon = POSTURE_ICON[week.posture]

            return (
              <li key={week.week} className={`week week--${week.status}`}>
                <div className="week__head">
                  <span className="week__mark" aria-hidden="true">
                    {week.status === 'done' ? (
                      <IconCheck />
                    ) : locked ? (
                      <IconLock />
                    ) : (
                      <PostureIcon />
                    )}
                  </span>

                  <div className="week__headings">
                    <span className="week__eyebrow">
                      {t.common.week} {week.week}
                    </span>
                    <span className="week__posture">{t.posture[week.posture]}</span>
                    <span className="week__meta">
                      {locked
                        ? t.home.locked
                        : `${t.style[week.style]} · ${t.home.daysDone(week.completedDays, daysPerWeek)}`}
                    </span>
                  </div>
                </div>

                {/*
                  Os 7 dias da semana são iguais entre si: a progressão está na
                  postura, não no volume. Por isso viram fichas pequenas em vez
                  de cards grandes — o que a usuária precisa saber é quantos já
                  fez, não o que muda de um dia para o outro.
                */}
                {!locked && (
                  <ol className="week__days">
                    {week.days.map((day) => (
                      <li key={day.day}>
                        <button
                          className={`day-chip day-chip--${day.status}`}
                          disabled={day.status === 'locked'}
                          onClick={() => onOpenDay(week.week, day.day)}
                          aria-label={`${t.common.week} ${week.week}, ${t.common.day} ${day.day}`}
                        >
                          {day.status === 'done' ? <IconCheck width={15} height={15} /> : day.day}
                          {day.status === 'available' && day.completedWorkouts > 0 && (
                            <span className="day-chip__half" aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            )
          })}
        </ol>

        <p className="weeks__note">{t.home.sequenceNote}</p>
      </div>
    </div>
  )
}
