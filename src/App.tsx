import { useCallback, useEffect, useMemo, useState } from 'react'
import { WeeksScreen } from './screens/WeeksScreen'
import { DayScreen } from './screens/DayScreen'
import { IntroScreen } from './screens/IntroScreen'
import { SessionScreen } from './screens/SessionScreen'
import { FinishScreen } from './screens/FinishScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { LegalScreen, type LegalPage } from './screens/LegalScreen'
import { EbookScreen } from './screens/EbookScreen'
import { GateScreen, GateSplash } from './screens/GateScreen'
import { BlockedScreen } from './screens/BlockedScreen'
import { LoginScreen } from './screens/LoginScreen'
import { useProgram } from './lib/useProgram'
import { useLicense } from './lib/useLicense'
import { useAuth } from './lib/useAuth'
import { useCloudSync } from './lib/sync'
import { renameAccount } from './lib/auth'
import { LOGIN_ENABLED } from './lib/session'
import { audio } from './lib/audio'
import { I18nContext, dictionaries, localeTag } from './i18n'

/**
 * Navegação.
 *
 * Sem router: são seis telas e um fluxo linear. Uma biblioteca de rotas aqui
 * seria peso a mais no cache offline para resolver um problema que não existe.
 * O histórico do navegador é tratado à mão, para o botão "voltar" do Android
 * não fechar o app no meio de um treino.
 */
type View =
  | { name: 'weeks' }
  | { name: 'intro' }
  | { name: 'day'; week: number; day: number }
  | { name: 'session'; week: number; day: number; startIndex: number; startSeries: number }
  | { name: 'finish'; week: number; day: number; startIndex: number }
  | { name: 'settings' }
  | { name: 'ebook' }
  | { name: 'legal'; page: LegalPage }

export function App() {
  const {
    progress,
    replaceProgress,
    weeks,
    daysPerWeek,
    settings,
    introRead,
    activeSession,
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
    stepsFrom,
    estimateSeconds,
  } = useProgram()

  const [view, setView] = useState<View>({ name: 'weeks' })
  const t = dictionaries[settings.language]

  /**
   * A licença. Nada do programa aparece antes dela: a verificação acontece aqui
   * em cima, e não dentro de cada tela, para não existir um caminho de navegação
   * que entre pela lateral e pule a porta.
   */
  /**
   * Com o login ligado, a conta vem antes da licenca: sem conta, a tela de
   * login; com conta, a licenca e pedida sozinha com a sessao. A licenca
   * continua sendo quem decide se o app abre (reembolso, uso offline).
   */
  const auth = useAuth()
  const signedIn = LOGIN_ENABLED && auth.session !== null
  const licence = useLicense({
    autoEmail: LOGIN_ENABLED ? auth.session?.user.email : undefined,
    onAuthLost: auth.signOut,
  })
  const sync = useCloudSync({
    enabled: signedIn && licence.state.status === 'ok',
    progress,
    replace: replaceProgress,
    onUser: auth.updateUser,
    onSignedOut: auth.signOut,
  })
  /** Sem conta, a unica tela alem do login e a politica de privacidade. */
  const [signedOutView, setSignedOutView] = useState<'login' | 'privacy'>('login')

  const currentWeek = 'week' in view ? weeks.find((w) => w.week === view.week) : undefined

  // O idioma do documento acompanha a escolha: leitores de tela pronunciam o
  // texto com a fonética certa, e o navegador oferece tradução corretamente.
  useEffect(() => {
    document.documentElement.lang = localeTag[settings.language]
  }, [settings.language])

  // O botão físico de voltar do Android deve voltar uma tela, não sair do app.
  useEffect(() => {
    history.replaceState({ view: view.name }, '')
    const onPop = () => {
      setView((current) => {
        if (current.name === 'weeks') return current
        // As páginas legais abrem a partir de Ajustes; voltar devolve para lá.
        if (current.name === 'legal') return { name: 'settings' }
        if (
          current.name === 'day' ||
          current.name === 'settings' ||
          current.name === 'intro' ||
          current.name === 'ebook'
        ) {
          return { name: 'weeks' }
        }
        return 'week' in current
          ? { name: 'day', week: current.week, day: current.day }
          : { name: 'weeks' }
      })
      history.pushState({}, '')
    }
    window.addEventListener('popstate', onPop)
    history.pushState({}, '')
    return () => window.removeEventListener('popstate', onPop)
  }, [view.name])

  const startSession = useCallback(
    (week: number, day: number, startIndex: number, startSeries = 1) => {
      // O gesto que inicia o treino é o único momento garantido para destravar
      // o áudio no iOS. Depois disso o Safari recusa, e sem som o iPhone fica
      // sem nenhum retorno. Por isso isto acontece aqui, e de forma síncrona.
      audio.unlock()
      setView({ name: 'session', week, day, startIndex, startSeries })
    },
    [],
  )

  /** A semana da sessão que ficou pela metade, se ela ainda existir. */
  const resumable = useMemo(() => {
    if (!activeSession) return null
    const week = weeks.find((w) => w.week === activeSession.week)
    if (!week || week.status === 'locked') return null
    return { session: activeSession, week }
  }, [activeSession, weeks])

  const screen = () => {
    if (view.name === 'settings') {
      return (
        <SettingsScreen
          settings={settings}
          onChange={updateSettings}
          onReset={resetAll}
          onBack={() => setView({ name: 'weeks' })}
          onOpenLegal={(page) => setView({ name: 'legal', page })}
          account={
            signedIn && auth.session
              ? {
                  user: auth.session.user,
                  sync: sync.status,
                  onRename: async (name) => {
                    const user = await renameAccount(name)
                    if (user) auth.updateUser(user)
                    return Boolean(user)
                  },
                  onSignOut: auth.signOut,
                  onDelete: auth.deleteAccount,
                }
              : undefined
          }
        />
      )
    }

    if (view.name === 'legal') {
      return <LegalScreen page={view.page} onBack={() => setView({ name: 'settings' })} />
    }

    if (view.name === 'ebook') {
      return <EbookScreen onBack={() => setView({ name: 'weeks' })} />
    }

    if (view.name === 'intro') {
      return (
        <IntroScreen
          onRead={markIntroRead}
          onBack={() => setView({ name: 'weeks' })}
          onStart={() =>
            upNext
              ? setView({ name: 'day', week: upNext.day.week, day: upNext.day.day })
              : setView({ name: 'weeks' })
          }
        />
      )
    }

    if (view.name === 'session' && currentWeek) {
      return (
        <SessionScreen
          key={`${view.week}-${view.day}-${view.startIndex}`}
          posture={currentWeek.posture}
          steps={stepsFrom(currentWeek, view.startIndex)}
          startSeries={view.startSeries}
          settings={settings}
          onSettings={updateSettings}
          onWorkoutDone={(stepIndex) => {
            const w = currentWeek.workouts[view.startIndex + stepIndex]
            if (w) completeWorkout(view.week, view.day, w.type)
          }}
          // O índice guardado é o do treino em andamento, não o de onde a
          // sessão começou: quem parou na pulsação retoma na pulsação.
          onProgress={(series, stepIndex) =>
            saveSession(view.week, view.day, view.startIndex + stepIndex, series)
          }
          onFinish={() => {
            clearSession()
            setView({ name: 'finish', week: view.week, day: view.day, startIndex: view.startIndex })
          }}
          onExit={() => {
            // Sair de propósito não é ser interrompida: não há o que retomar.
            clearSession()
            setView({ name: 'day', week: view.week, day: view.day })
          }}
        />
      )
    }

    if (view.name === 'finish' && currentWeek) {
      const workouts = currentWeek.workouts.slice(view.startIndex)
      const dayCompleted = currentWeek.workouts.every((w) =>
        isWorkoutDone(view.week, view.day, w.type),
      )
      const weekCompleted = currentWeek.status === 'done'
      const programCompleted = weeks.every((w) => w.status === 'done')
      const nextWeek = weeks.find((w) => w.week === view.week + 1) ?? null

      return (
        <FinishScreen
          week={view.week}
          day={view.day}
          workouts={workouts}
          dayCompleted={dayCompleted}
          weekCompleted={weekCompleted}
          programCompleted={programCompleted}
          nextPosture={nextWeek?.posture ?? null}
          onBackToProgram={() => setView({ name: 'weeks' })}
        />
      )
    }

    if (view.name === 'day' && currentWeek) {
      return (
        <DayScreen
          week={currentWeek}
          day={view.day}
          isWorkoutDone={isWorkoutDone}
          estimateSeconds={estimateSeconds}
          holdSeconds={settings.holdSeconds}
          onStart={(index) => startSession(view.week, view.day, index)}
          onBack={() => setView({ name: 'weeks' })}
        />
      )
    }

    return (
      <WeeksScreen
        weeks={weeks}
        daysPerWeek={daysPerWeek}
        percent={percent}
        doneWeeks={doneWeeks}
        introRead={introRead}
        upNext={upNext}
        resumable={resumable}
        onResume={() => {
          if (!resumable) return
          const { session } = resumable
          startSession(session.week, session.day, session.startIndex, session.series)
        }}
        onDiscardResume={clearSession}
        onOpenIntro={() => setView({ name: 'intro' })}
        onOpenDay={(week, day) => setView({ name: 'day', week, day })}
        onOpenSettings={() => setView({ name: 'settings' })}
        onOpenEbook={() => setView({ name: 'ebook' })}
        account={signedIn && auth.session ? { name: auth.session.user.name } : undefined}
      />
    )
  }

  /** Tudo que aparece no lugar do programa enquanto o acesso não está liberado. */
  const gate = () => {
    if (LOGIN_ENABLED && !auth.session) {
      if (signedOutView === 'privacy') {
        return <LegalScreen page="privacy" onBack={() => setSignedOutView('login')} />
      }
      return (
        <LoginScreen
          language={settings.language}
          onSignedIn={(session) => {
            auth.signedIn(session)
            // A licenca ja foi guardada pelo login; isto so a le e abre o app.
            void licence.recheck()
          }}
          onOpenPrivacy={() => setSignedOutView('privacy')}
        />
      )
    }
    if (licence.state.status === 'checking') return <GateSplash />
    if (licence.state.status === 'blocked') {
      return (
        <BlockedScreen
          reason={licence.state.reason}
          onRetry={licence.retry}
          onUseAnother={LOGIN_ENABLED ? auth.signOut : licence.useAnother}
          anotherLabel={LOGIN_ENABLED ? t.blocked.signOut : undefined}
          busy={licence.busy}
          stillOffline={licence.stillOffline}
        />
      )
    }
    // Logada e ainda sem licenca: o pedido automatico esta a caminho.
    if (LOGIN_ENABLED) return <GateSplash />
    return (
      <GateScreen
        code={licence.code}
        onCodeChange={licence.onCodeChange}
        onSubmit={licence.submit}
        error={licence.error}
        busy={licence.busy}
      />
    )
  }

  return (
    <I18nContext.Provider value={t}>
      {licence.state.status === 'ok' && (!LOGIN_ENABLED || signedIn) ? screen() : gate()}
    </I18nContext.Provider>
  )
}
